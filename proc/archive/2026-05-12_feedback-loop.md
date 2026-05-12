# 피드백 루프 닫기 — 학생 제출 ↔ 교사 화면 실시간 반영

## 목표
학생이 풀이를 제출하면 그 사실이 교사 "발사한 과제" 패널의 진행률에 즉시 반영되도록 함.
현재는 mock 시드(`studentAssignments`)가 정적이라 학생이 풀어도 교사 화면 0/N 그대로 — "반 운영 자동화 클래스봇" 정의에서 가장 큰 누락 보강.

## 범위
- 학생 측: solve-workspace submit() 시 store에 submission 기록
- 교사 측: `/teacher/classbot` 발사한 과제 패널이 실시간 진행률 표시
- 시드 과제(`as_today`, `as_exam_prep`, `as_prescription` 등)도 동일 흐름으로 동작
- 보류: 교사 채점 허브 (`/teacher/grading`) 연동은 별 PR

## 작업 항목

### A. Store 확장 — submission 모델
- [x] `Submission` 타입 — `{ id, assignmentId, studentId, submittedAt, answers, scorePercent }`
- [x] `useAssignmentStore` 에 `submissions: Submission[]` 추가
- [x] `recordSubmission(submission)` action — `Omit<Submission, 'id'|'submittedAt'>` 입력
- [x] 동일 (assignmentId, studentId) 재제출 upsert (filter + prepend)
- [x] localStorage persist 키 그대로 `pullim-assignments`

### B. Submission helper
- [x] `computeProgress(assignment, submissions)` — `{ completedCount, submittedStudentCount, avgScore, latestSubmittedAt }` 반환 (계획의 getSubmissionStats 를 통합)
- [x] `useAssignmentProgress(assignment)` 훅 — 시드 `completedCount` + store submissions 합산 (questionCount cap)
- 보너스: `useStudentSubmission(assignmentId, studentId)` — 결과 페이지의 본인 점수 조회
- 보너스: `computeMockScore(questions, answers)` — 객관식 정답비율 × 100 + 단답/서술 길이 기반 mock

### C. Student submit flow
- [x] solve-workspace.tsx submit() — `useAssignmentStore.getState().recordSubmission(...)` 호출
- [x] `computeMockScore` 로 점수 계산
- [x] `currentPersona` → `classRoster.find` 매핑

### D. Teacher view
- [x] teacher/classbot/page.tsx → `'use client'`
- [x] DispatchedAssignments — store dispatched + 시드 합산
- [x] DispatchedRow `useAssignmentProgress` — 동적 progress + avgScore
- [x] 진행률 색상 — `displayAccuracy >= 70` 기준
- [x] "방금 제출" 라이브 뱃지 — `Date.now() - latestSubmittedAt < 30_000`
- [x] data-testid — `dispatched-section`, `dispatched-row-{id}`, `progress-{id}`

### E. Result page
- [x] 점수 표시 — `useStudentSubmission` 으로 본인 submission 조회 → `scorePercent` 표시
- [x] 시드 과제 fallback — submission 없으면 기존 essay/auto 카드 유지
- [x] `data-testid="result-score"` 추가

### F. 검증
- [x] `bun x tsc --noEmit` clean
- [x] Playwright `tests/e2e/feedback-loop.spec.ts` 3 케이스 통과
  - 학생 제출 → 교사 진행률 +1 + 라이브 뱃지
  - 새로고침 후 submission persist
  - 시드 과제 풀이 시에도 store 누적
- [x] 기존 12 테스트 무회귀 → 총 15/15 (10.3s)

### G. 마무리
- [x] plan ↔ 코드 정합성 검토 (체크박스 동기화 완료)
- [ ] commit + PR (base: `chore/shadcn-primitives-phase1` — PR #6 위 stacked)

## 정합성 검토 노트

- **getSubmissionStats → computeProgress 로 이름 변경**: 함수 하나로 모든 통계를 반환하는 게 더 깔끔. 외부에서는 `useAssignmentProgress` 훅으로만 호출 → 인터페이스 의도 동일.
- **추가된 헬퍼**: `useStudentSubmission`, `computeMockScore` — 계획에 명시 안 했지만 result page / submit flow 구현 시 필요했음. 둘 다 단일 책임.
- **questionCount cap**: `completedCount = min(seed + submittedStudentCount, questionCount)` — 시드값이 이미 높은 과제(예: as_today 5/10)에 추가 submission이 와도 questionCount 초과 안 함.
- **라이브 뱃지 30초 윈도우**: 데모 시연에서 발사 → 제출 → 교사 화면 흐름이 30초 내라 적절. 길게 잡으면 노이즈, 짧게 잡으면 못 봄.

## 위험·결정
- **단일 store key**: `pullim-assignments` 안에 dispatched + submissions 같이 persist → migration 우려는 mock 시연이라 무시 가능 (기존 데이터는 reset 권장)
- **점수 계산 정확도**: 단답/서술은 정답 검증 없이 mock 추정. 정확한 채점은 채점 허브 후속 작업
- **여러 학생 시뮬레이션**: 데모 단계에서는 currentPersona 1명만 → submittedCount는 0 → 1
- **이미 시드의 completedCount가 1+ 인 과제**(`as_today`, `as_prescription`): 학생이 추가 풀이 시 +1 누적 (시드값 + 신규 submission)

## 보류 (후속 PR)
- 교사 채점 허브 `/teacher/grading` 와 submission 연동
- 다중 학생 시뮬레이션 (mock persona 전환)
- 라이브 피드(LiveFeedPanel)에 새 질문 / 채팅 반영
- 알림 (teacher push) — 학생 제출 시 토스트
