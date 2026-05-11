# 2026-05-11 교사 과제 생성·발사 워크스페이스 구현

## 목표
[spec 14](../spec/14-teacher-assignment-workspace.md) P0 범위를 구현해 E2E 사이클의 진입점을 완성한다. 교사가 발사한 새 과제가 새로고침 후에도 학생 홈에 자동 반영되어, **봇 빌드 → 발사 → 풀이 → 채점 → 리포트**가 백엔드 없이 mock으로 끝에서 끝까지 시연 가능해야 한다.

## 작업 항목

### A. 인프라 — Zustand store (E2E mock 시연의 핵심)
- [x] `src/lib/store/assignments.ts` 신설 — Zustand store + persist 미들웨어
  - `drafts: Assignment[]` (임시 저장)
  - `dispatched: Assignment[]` (발사 완료)
  - actions: `saveDraft`, `dispatch`, `withdrawAssignment` (v2 — P0는 placeholder)
- [x] localStorage key: `pullim-assignments` (브랜드 키)
- [x] 새 과제 id 생성: `as_user_${Date.now()}`
- [x] hydration 안전 처리 — SSR/CSR 미스매치 방지 (`useEffect` 패턴)

### B. 학생 측 자동 반영
- [x] mock helper 보강: `src/lib/mock/classbot.ts`의 `getMyAssignments()` 추가 (또는 `pickPrimaryAssignment` 갱신)
  - 시드 `studentAssignments` + store `dispatched` 합산
  - 학생 id 필터 (`targetStudentIds` 매칭)
- [x] `src/app/(student)/classbot/page.tsx` — `studentAssignments` 직접 import → `getMyAssignments()` 사용
- [x] `src/app/(student)/classbot/assignment/page.tsx` — 동일 갱신
- [x] 새 과제 등장 시 자연스러운 정렬 — 발사 시각 역순 또는 D-day 임박순

### C. 라우트 + 워크스페이스 컨테이너
- [x] `src/app/(teacher)/teacher/assignment/new/page.tsx` 신설 — Server Component (라우트 진입점)
- [x] `src/app/(teacher)/teacher/assignment/new/assignment-form.tsx` 신설 — Client Component (5섹션 폼 컨테이너)
- [x] 상단 컨텍스트 바: 취소·제목·임시저장 인디케이터
- [x] Sticky bottom 액션 바: 진행도·미리보기·임시저장·발사

### D. 5섹션 폼 컴포넌트
- [x] `BotSelectField` (`src/components/classbot/bot-select-field.tsx`) — 봇 드롭다운 + 선택 봇 미리보기 카드
  - 봇 선택 시 빌더 § 4·6 산출물 자동 흡수 (현 mock은 mode 기본값만)
- [x] `AssignmentIdentitySection` — 제목·모드 토글·난이도 (드롭다운 또는 칩)
- [x] `QuestionPicker` — 자동 생성 / 수동 선택 토글 + N 슬라이더 + (수동 시) 문항 추가 모달 (P0은 자동만, 수동은 v1)
- [x] `StudentTargetPicker` — 18명 체크박스 그리드 + 전체 선택 토글 + 선택 N명 표시
- [x] `DueDatePicker` — D-day picker (datetime-local input + "내일 22:00" 빠른 채움 버튼)
- [x] `ExamModeFields` — `mode === 'exam'`일 때만 노출 (시간 제한·외부 탭 정책·이전 문항 이동·Scope L1 안내)
- [x] `StudentPreviewModal` — 학생 시점 카드 미리보기 (현 `PrimaryAssignmentCard` 디자인 재사용)

### E. 진입점 연결
- [x] `src/app/(teacher)/teacher/classbot/page.tsx` — `DispatchedAssignments`의 `[+ 새 과제]` 버튼을 `<Link href="/teacher/assignment/new">`로 교체
- [x] `src/app/(teacher)/teacher/page.tsx` 빠른 액션 — "과제 발사" 추가 (`/teacher/assignment/new` 딥링크)
- [x] (선택) `src/app/(teacher)/teacher/builder/page.tsx` 8단계 완료 후 "테스트 발사" 옵션

### F. 자동 채움 매트릭스
- [x] 봇 선택 → 학년·과목·assignedBy 자동
- [x] 봇 선택 → enrolled 학생 자동 체크 (`StudentTargetPicker`의 기본값)
- [x] 마감일 기본값 "내일 22:00" 자동 채움
- [x] 시험 모드 토글 시 `scopeOverride: 1` 자동 + 변경 불가 안내
- [x] 단원 from-to mock 채움 — cb_001 봇은 "미적분 III · 극값~변곡점" 기본

### G. 발사 액션 + 토스트
- [x] `handleDispatch()` — 검증 통과 시 store.dispatch() + sonner 토스트
- [x] 토스트 카피: "{봇 이름}이 {N}명에게 보냈어요"
- [x] 발사 후 `router.push('/teacher/classbot')` — 발사한 과제 섹션에서 새 행 확인
- [x] 검증 실패 시 인라인 에러 + 첫 미통과 섹션 스크롤

### H. 검증
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 통과 — 라우트 27 → 28
- [x] localStorage clear 후 dev 서버 띄워 새로고침 영속성 확인
- [x] 학생 1명에게만 발사 케이스 — 다른 학생 화면에는 안 보이는지 확인

### I. 시드 보강
- [x] cb_001 봇의 단원 트리 mock (드롭다운 옵션용) — `lib/mock/classbot.ts`에 `botCurriculum` 추가
- [x] cb_001의 문항 풀 매핑 — `assignmentQuestions` 13건을 단원별 분류 함수 추가

## E2E 시연 시나리오 (검증 핵심 — spec 14 § 12)

다음 7단계가 mock으로 끝까지 돌아가야 P0 완료:

- [x] **1. 봇 빌드** — `/teacher/builder`에서 cb_001 "수학이 형" 사용 (시드)
- [x] **2. 과제 발사** — `/teacher/assignment/new`에서 "도함수 활용 마무리 2탄" 18명에게 발사
- [x] **3. 학생 수령** — 서연 `/classbot` 새로고침 시 PrimaryCard에 새 과제 등장
- [x] **4. 풀이** — `/classbot/assignment/[id]/solve` 진입 → 10문항 풀이 → 제출
- [x] **5. 결과 페이지** — `/classbot/assignment/[id]/result` 자동 채점 즉시 노출
- [x] **6. 채점 큐 진입** — `/teacher/grading`에 새 행 (v1 백엔드 필요 — P0는 시드만)
- [x] **7. 학부모 리포트** — `/teacher/reports`에서 점수 반영 (v1)

**P0 성공 조건**: 1~5 단계가 끊김 없이 mock으로 시연. 6~7은 v1 이연 명시.

## P1+ 이연 (이번 plan 제외)
- 예약 발사 (특정 시각 자동 활성화)
- 봇 처방 자동 draft 생성 (학생 오답 누적 → 자동 알림)
- 통합 과제 목록 `/teacher/assignment` (다중 봇 운영)
- 과제 템플릿 저장·복제
- 다중 발사 (1과제 → N반)
- 회수·재발사
- AI 자동 문항 추천 (RAG 기반)
- 구글 클래스룸 양방향 동기 (v2+)

## 비고
- 추출본 정책: 다른 도메인(플래너·Q·라이브러리) 의존 금지
- store 키는 `pullim-assignments` (브랜드 prefix) — 다른 store와 명확 분리
- Zustand는 이미 `package.json` dependency — 새 패키지 추가 없음
- 발사 후 수정 금지 정책 (spec § 5.3) — UX writing에서 "발사 후엔 수정할 수 없어요" 명시
- 시험 모드 외부 탭 자동 제출은 spec 12에서 카운트만 구현됨 — 본 spec에서는 정책 입력 UI만 제공, 실제 자동 제출은 P1
- 작업 완료 후 plan을 archive로 이동
