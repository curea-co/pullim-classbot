# 교사 개입 루프 PR-1 계획 — 스토어 + 벨 인박스 + 결과 코멘트 + 리마인드

> spec: `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` (사용자 승인). TDD, 단계 `- [ ]`.

**Goal:** remind 루프 1개가 끝까지 동작 — 교사가 진행률 행에서 [미제출 N명 리마인드] → 학생 벨 배지/인박스 도착 → 딥링크. comment 는 읽기 측(결과 카드 + 인박스)만 이번 PR(쓰기 UI 는 PR-2).

**Interfaces (recon 근거):**
- roster: `lib/mock/classbot.ts:271` `classRoster: ClassroomStudent[]` (s1~s18, `id`/`name`)
- 제출: `lib/store/assignments.ts` `Submission{assignmentId, studentId,…}` → 미제출 = roster − 제출자
- 학생 identity: `useRosterMe().id` (데모 폴백 student_001→서연 행) — 제출/결과와 동일 조인 키
- 교사 진행률 행: `app/(teacher)/teacher/classbot/page.tsx` `DispatchedRow` (testid `dispatched-row-*`/`progress-*` 유지)
- 결과 페이지: `app/(student)/classbot/assignment/[id]/result/page.tsx` "봇 한 마디" 섹션 다음
- 벨: `components/shell/app-header.tsx:74-80` 비활성 버튼 → 학생 role 만 활성 인박스로 교체(교사는 기존 비활성 유지)

### Task 1: `lib/store/interventions.ts` + 단위 테스트
- [ ] RED `lib/store/__tests__/interventions.test.ts`: send→events 추가·id/createdAt 부여, markRead(readAt), useMyInterventions 최신순/타학생 제외, useUnreadCount, useAssignmentComment(comment 최신 1건/없으면 null), hasRemindFor(assignmentId)
- [ ] GREEN: spec §3 모델 그대로. persist `pullim-interventions`.
- [ ] 커밋 `feat(classbot): 개입(intervention) 스토어 — send/read/셀렉터`

### Task 2: `components/shell/notification-bell.tsx` + RTL
- [ ] RED: 미읽음 2건 → 배지 "2"+aria-label, 항목 클릭 → markRead, 0건 → "새 알림이 없어요", hydration 전 배지 미표시
- [ ] GREEN: DropdownMenu(ProfileMenu 패턴), 타입별 아이콘/딥링크(remind→과제, comment→결과, requiz→과제, crisis→챗), `useStoresHydrated` 게이트, 44px/focus-visible/blue-slate
- [ ] app-header: 학생 role 에서 비활성 벨을 `<NotificationBell />` 로 교체 (교사 기존 유지) — 공유 셸 diff 최소
- [ ] 커밋 `feat(classbot): 헤더 벨 알림 인박스 활성화(학생)`

### Task 3: `components/classbot/teacher-comment-card.tsx` + 결과 페이지 배선 + RTL
- [ ] RED: comment 이벤트 시드 → "선생님 한마디"+message 렌더, 없으면 null
- [ ] GREEN: `useAssignmentComment(assignmentId, studentId)` 소비, blue 톤 카드. 결과 페이지 "봇 한 마디" 섹션 뒤 배선.
- [ ] 커밋 `feat(classbot): 결과 페이지 선생님 한마디 카드`

### Task 4: `components/classbot/remind-button.tsx` + 교사 행 배선 + RTL
- [ ] RED: 미제출 N명 → "미제출 N명 리마인드", 클릭 → 학생별 remind 이벤트(N건, 제목 포함 문구), 발송 후 "리마인드 보냄" 비활성(이벤트 존재 파생), 미제출 0명 → null, hydration 게이트
- [ ] GREEN: 미제출 = classRoster − submissions(assignmentId). `DispatchedRow` 우측 액션 클러스터에 배선(testid 불변).
- [ ] 커밋 `feat(classbot): 진행률 행 미제출 리마인드`

### Task 5: 통합 검증
- [ ] jest 전체 / typecheck / lint(design gates) green, e2e `feedback-loop`·`assignment-dispatch` 로컬 통과(셀렉터 무파손)
- [ ] 커밋/푸시/PR(base dev)

**Global constraints:** blue/slate 토큰만·raw hex 금지·44px·focus-visible·색단독신호 금지(배지 숫자+aria)·hydration-safe·i18n/Sentry 금지·`progress-*`/`dispatched-row-*` testid 불변.
