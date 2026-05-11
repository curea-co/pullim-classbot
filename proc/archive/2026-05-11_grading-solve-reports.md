# 2026-05-11 채점 허브 · 학생 과제 풀이 · 리포트 + 감정 체크인 구현

## 목표
풀림 클래스봇 추출본의 끊긴 3 사이클(채점-풀이-리포트)을 spec [11](../spec/11-grading-hub.md)/[12](../spec/12-student-assignment-solve.md)/[13](../spec/13-reports-and-emotion-checkin.md)의 P0 범위로 구현해, "교사가 과제 발사 → 학생이 풀이 → 교사가 채점 → 리포트로 환류"의 단절을 봉합한다.

## 작업 항목

### 1순위 — 채점 허브 (spec 11)
- [ ] 라우트: `app/(teacher)/teacher/grading/page.tsx` (큐) + `[id]/page.tsx` (상세) 신설
- [ ] 컴포넌트 신규: `GradingRow`, `RubricEditor`, `OverrideDeltaMeter`, `CrisisGate`
- [ ] 큐 화면: `gradingQueue` 6건 + 상태/타입/봇 필터 + AI 신뢰도 정렬
- [ ] 상세 화면: 좌(문제+학생 응답) · 중(루브릭 슬라이더) · 우(AI 초안 코멘트 편집)
- [ ] 변경률 계산 + 20% 임계 시 "루브릭 재학습 제안" 카드 점등 (P0은 표시만)
- [ ] 액션 바: `[승인]` `[수정 후 승인]` → 상태 전이 (`queue → reviewing → approved/overridden`)
- [ ] 위기 게이트: `aiConfidence < 70` 또는 응답 빈약 시 인디케이터
- [ ] 시드 추가: `gr_007` overridden 1건 + 학생별 최근 5회 history (사이드 패널용)
- [ ] 교사 홈 `pendingItems` "서술형 채점 대기 12건" → `/teacher/grading` 딥링크
- [ ] 마이크로카피 적용 (spec § 8.2 — "AI 채점" → "AI 초안")

### 2순위 — 학생 과제 풀이 상세 (spec 12)
- [ ] 라우트: `app/(student)/classbot/assignment/{page,[id]/page,[id]/solve/page,[id]/result/page}.tsx` 신설
- [ ] mock 마이그레이션: `studentAssignments[].solveHref` → `/classbot/assignment/${id}/solve?step=1`
- [ ] mock 보강: 각 Assignment에 `questions[]` 시드 추가 (3 과제 × 3~5문항)
- [ ] mock 보강: `Submission` in-progress 1건 (as_today, completedCount: 8 정합)
- [ ] mock 보강: practice 첫 문항 봇 힌트 5단계 시드
- [ ] 컴포넌트 신규: `AssignmentOverviewHeader`, `SolveWorkspace` (3-pane), `BotHintPanel`, `ExamCountdown`, `ResultBreakdown`
- [ ] 컴포넌트 재사용: `LiveQuizCard`, `FlywheelNote`, `PageHeader`, `MyBotsStrip`
- [ ] 모드별 봇 패널 분기:
  - [ ] `practice` (L4) — 5단계 힌트 (방향→핵심→단서→거의정답→해설)
  - [ ] `exam` (L1 override) — 봇 패널 잠금 + 시작 경고 모달 + 카운트다운
  - [ ] `wrong-conquest` (L5) — 정답·해설·반례 즉시 노출
- [ ] 임시저장: localStorage 5초 디바운스 + 마지막 위치 복원
- [ ] 제출 플로우: 객관식·단답 즉시 채점 → 서술형은 `GradingItem` 생성 (채점 허브 큐로 자동 진입)
- [ ] 결과 페이지: 자동 채점 즉시 노출 / 서술형 "검수 대기" 상태
- [ ] 학생 홈 `PrimaryAssignmentCard` · `AssignmentRow` 링크 새 라우트로 교체
- [ ] 시험 모드 외부 탭 카운트 (P0은 카운트만 — 자동 제출은 P1)

### 3순위 — 리포트 + 감정 체크인 (spec 13)
- [ ] 라우트 (교사): `app/(teacher)/teacher/reports/{page,[id]/page}.tsx`
- [ ] 라우트 (학생): `app/(student)/classbot/wellness/{page,check-in/page}.tsx` + `me/report/page.tsx`
- [ ] 컴포넌트 신규: `EmotionEmojiPicker`, `WellbeingGauge`, `ReportRow`, `ReportDetail`, `ParentMessagePreview`, `CrisisModal`, `KpiTrendCard`
- [ ] 리포트 목록: `reports` 6건 + 종류/상태 필터 + 위기 인디케이터
- [ ] 리포트 상세: 8 KPI · 1줄 요약 인라인 편집 · 위기 신호 패널 · 카카오 BIZ 미리보기
- [ ] 시드 보강: `EmotionCheckIn` 18명 × 7일 (도현 3일 "힘듦", 예은 7일 무응답)
- [ ] 시드 보강: `WellbeingSnapshot` 7일치 + `CrisisAlert` 2건 (도현 패턴 / 예은 임계)
- [ ] 학생 일일 체크인 인터셉트: 미완료 시 봇 채팅 진입 직전 모달
- [ ] 체크인 3단계: 4이모지 → 강도 슬라이더(선택) → 자유 한 줄(200자)
- [ ] 키워드 게이트: 자살·자해 화이트리스트 정규식 (강도 4+만 모달 — false-positive 방지)
- [ ] 학부모 발송 워크플로: `pending-approval → approved → sent` (P0은 수동 승인만)
- [ ] 카카오 BIZ MESSAGE: mock 어댑터 `lib/integrations/kakao-mock.ts` + console.log 발송
- [ ] 1:1 면담 메모 자동 첨부 (채점 허브에서 작성 → 학생 개인 리포트로)
- [ ] 학생 본인 리포트 (`/classbot/me/report`): 톤 1인칭, "성적표" 금지어 적용
- [ ] 교사 홈 위기 신호 영역 → `/teacher/reports` 딥링크

### 횡단 작업
- [ ] `components/shell/nav-config.ts` 갱신 — 신 라우트 6개(교사 grading·reports 2 + 학생 assignment·wellness·me 4) 등록
- [ ] 학생 BottomNav 5탭에 영향 없음 확인 (assignment·wellness는 클래스봇 하위)
- [ ] `bun x tsc --noEmit` 통과
- [ ] `bun run build` 통과 — 정적 라우트 증가 확인 (16 → 약 22)
- [ ] 권위 문서 § 4.7·4.8·4.9 정렬 재검토

## 검증 시나리오 (E2E mock)
- [ ] **시나리오 G**: 교사가 `/teacher/grading`에서 윤서 essay 1건 검수 → 승인 → 학부모 리포트에 점수 반영
- [ ] **시나리오 S**: 학생이 `/classbot` 홈 → "도함수 활용 마무리" → solve → 9번 문항 풀이 → 제출 → result 도달
- [ ] **시나리오 R1**: 학생이 봇 채팅 진입 시 체크인 인터셉트 → "그저그럼" 기록 → 웰빙 허브에 반영
- [ ] **시나리오 R2**: 도현 3일 누적 "힘듦" → 교사 홈에 위기 알림 → 리포트 상세 → 1:1 면담 메모 작성 → 학생 개인 리포트에 첨부

## 비고
- 추출본 정책: 다른 도메인(플래너/Q/라이브러리) 라우트로 새 링크 만들지 않음
- 풀이 워크스페이스는 Q 도메인 제거에 따라 **클래스봇 내부 자급** (spec 12 § 1)
- 학원 관리자 Flow E · Wee센터 실 API · 카카오 BIZ 실 발송 · 외부 탭 자동 제출 · 키워드 게이트 학부모 알림 → 모두 P1+ 스코프, 본 plan 제외
- 작업 완료 후 `/update-spec`으로 spec 11/12/13 변경 이력 갱신
