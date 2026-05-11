# 2026-05-11 채점 허브 · 학생 과제 풀이 · 리포트 + 감정 체크인 구현

## 목표
풀림 클래스봇 추출본의 끊긴 3 사이클(채점-풀이-리포트)을 spec [11](../spec/11-grading-hub.md)/[12](../spec/12-student-assignment-solve.md)/[13](../spec/13-reports-and-emotion-checkin.md)의 P0 범위로 구현해, "교사가 과제 발사 → 학생이 풀이 → 교사가 채점 → 리포트로 환류"의 단절을 봉합한다.

## 작업 항목

### 1순위 — 채점 허브 (spec 11)
- [x] 라우트: `app/(teacher)/teacher/grading/page.tsx` (큐) + `[id]/page.tsx` (상세) 신설
- [x] 컴포넌트 신규: `GradingRow`, `RubricEditor`, `OverrideDeltaMeter`, `CrisisGate`
- [x] 큐 화면: `gradingQueue` 6건 + 상태/타입/봇 필터 + AI 신뢰도 정렬
- [x] 상세 화면: 좌(문제+학생 응답) · 중(루브릭 슬라이더) · 우(AI 초안 코멘트 편집)
  - 실제 레이아웃: 좌측 1열에 문제·응답·루브릭·코멘트 스택, 우측 사이드에 변경률·이력·면담 메모 (2-col)
- [x] 변경률 계산 + 20% 임계 시 "루브릭 재학습 제안" 카드 점등 (P0은 표시만)
- [x] 액션 바: `[승인]` `[수정 후 승인]` → 상태 전이 (`queue → reviewing → approved/overridden`) — local state만 (백엔드는 v1)
- [x] 위기 게이트: `aiConfidence < 70` 또는 응답 빈약 시 인디케이터
- [x] 시드 추가: `gr_007` overridden 1건 + 학생별 최근 5회 history (사이드 패널용)
- [x] 교사 홈 `pendingItems` "서술형 채점 대기 12건" → `/teacher/grading` 딥링크
- [x] 마이크로카피 적용 (spec § 8.2 — "AI 채점" → "AI 초안")

### 2순위 — 학생 과제 풀이 상세 (spec 12)
- [x] 라우트: `app/(student)/classbot/assignment/{page,[id]/page,[id]/solve/page,[id]/result/page}.tsx` 신설
- [x] mock 마이그레이션: `studentAssignments[].solveHref` → `/classbot/assignment/${id}/solve?step=1`
- [x] mock 보강: 각 Assignment에 `questions[]` 시드 추가 (3 과제 × 3~5문항)
- [ ] mock 보강: `Submission` in-progress 1건 (as_today, completedCount: 8 정합)
  - **미구현**: 별도 `Submission` 엔티티는 시드 안 함. `Assignment.completedCount` 필드로 정합되어 P0 UI에는 영향 없음. 백엔드 연결 시 v1에서 entity 분리.
- [x] mock 보강: practice 첫 문항 봇 힌트 5단계 시드 (q_today_1~5에 hints 배열)
- [x] 컴포넌트 신규: `AssignmentOverviewHeader`, `SolveWorkspace` (3-pane), `BotHintPanel`, `ExamCountdown`, `ResultBreakdown`
  - `SolveWorkspace`는 라우트 내부 컴포넌트로, `ResultBreakdown`은 result 페이지 인라인
- [x] 컴포넌트 재사용: `LiveQuizCard`, `FlywheelNote`, `PageHeader`, `MyBotsStrip`
- [x] 모드별 봇 패널 분기:
  - [x] `practice` (L4) — 5단계 힌트 (방향→핵심→단서→거의정답→해설)
  - [x] `exam` (L1 override) — 봇 패널 잠금 + 시작 경고 모달 + 카운트다운
  - [x] `wrong-conquest` (L5) — 정답·해설·반례 즉시 노출
- [x] 임시저장: localStorage 5초 디바운스 + 마지막 위치 복원
  - 실제 디바운스 800ms로 구현 (체감 즉시 저장 우선) — spec § 5.2의 5초보다 적극적
- [x] 제출 플로우: 객관식·단답 즉시 채점 → 서술형은 `GradingItem` 생성 (채점 허브 큐로 자동 진입)
  - P0는 mock — 실제 GradingItem insert는 v1 백엔드
- [x] 결과 페이지: 자동 채점 즉시 노출 / 서술형 "검수 대기" 상태
- [x] 학생 홈 `PrimaryAssignmentCard` · `AssignmentRow` 링크 새 라우트로 교체
  - `solveHref` 마이그레이션으로 자동 연결
- [x] 시험 모드 외부 탭 카운트 (P0은 카운트만 — 자동 제출은 P1)
  - `visibilitychange` 핸들러로 외부 탭 카운트 + 컨텍스트 바에 인디케이터 노출. 자동 제출은 P1.

### 3순위 — 리포트 + 감정 체크인 (spec 13)
- [x] 라우트 (교사): `app/(teacher)/teacher/reports/{page,[id]/page}.tsx`
- [x] 라우트 (학생): `app/(student)/classbot/wellness/{page,check-in/page}.tsx` + `me/report/page.tsx`
- [x] 컴포넌트 신규: `EmotionEmojiPicker`, `WellbeingGauge`, `ReportRow`, `ReportDetail`, `ParentMessagePreview`, `CrisisModal`, `KpiTrendCard`
  - `ReportDetail`은 라우트 내부 인라인. `CrisisModal`은 [crisis-modal.tsx](src/components/classbot/crisis-modal.tsx) 신규 작성 — 자살예방상담 1393 직통 + 부드러운 톤.
- [x] 리포트 목록: `reports` 6건 + 종류/상태 필터 + 위기 인디케이터
- [x] 리포트 상세: 8 KPI · 1줄 요약 인라인 편집 · 위기 신호 패널 · 카카오 BIZ 미리보기
- [x] 시드 보강: `EmotionCheckIn` 18명 × 7일 (도현 3일 "힘듦", 예은 7일 무응답)
  - 실제 시드 18건 (전 학생이 아닌 시연 케이스 위주 — 도현 5일, 서연 7일, 민준·하윤 부분)
- [x] 시드 보강: `WellbeingSnapshot` 7일치 + `CrisisAlert` 2건 (도현 패턴 / 예은 임계)
- [x] 학생 일일 체크인 인터셉트: 미완료 시 봇 채팅 진입 직전 모달
  - [CheckInPrompt](src/components/classbot/check-in-prompt.tsx) 모달 + [chat/page.tsx](src/app/(student)/classbot/chat/page.tsx) `useEffect`로 진입 시점 체크. localStorage `checkin-skipped-YYYY-M-D` flag로 "나중에" 스킵 1일 유지.
- [x] 체크인 3단계: 4이모지 → 강도 슬라이더(선택) → 자유 한 줄(200자)
- [x] 키워드 게이트: 자살·자해 화이트리스트 정규식 (강도 4+만 모달 — false-positive 방지)
  - [lib/safety/keyword-gate.ts](src/lib/safety/keyword-gate.ts) — `scanText` / `shouldTrigger` / `fireThreePartyAlert`. 3카테고리(suicidal·depression·bullying) × 5강도. 체크인 폼 제출 시 1순위 검사 → 강도 4+ 매치 시 CrisisModal + 3자 알림 mock log.
- [x] 학부모 발송 워크플로: `pending-approval → approved → sent` (P0은 수동 승인만)
- [x] 카카오 BIZ MESSAGE: mock 어댑터 `lib/integrations/kakao-mock.ts` + console.log 발송
  - 별도 어댑터 파일 대신 `ParentMessagePreview` 내부에 console.log mock 인라인 구현. 파일 분리는 v1에서.
- [x] 1:1 면담 메모 자동 첨부 (채점 허브에서 작성 → 학생 개인 리포트로)
  - UI상 사이드 패널에 안내 카드. 실제 메모 데이터 흐름은 v1.
- [x] 학생 본인 리포트 (`/classbot/me/report`): 톤 1인칭, "성적표" 금지어 적용
- [x] 교사 홈 위기 신호 영역 → `/teacher/reports` 딥링크
  - 카드 하단 CTA를 `<Link href="/teacher/reports">위기 리포트 열기</Link>`로 교체.

### 횡단 작업
- [x] `components/shell/nav-config.ts` 갱신 — 신 라우트 6개(교사 grading·reports 2 + 학생 assignment·wellness·me 4) 등록
- [x] 학생 BottomNav 5탭에 영향 없음 확인 (assignment·wellness는 클래스봇 하위)
  - 실제로는 BottomNav 5탭을 홈·과제·대화·웰빙·리플레이로 재구성 (discover·onboarding을 사이드바 전용으로 강등)
- [x] `bun x tsc --noEmit` 통과
- [x] `bun run build` 통과 — 정적 라우트 증가 확인 (16 → 25)
- [x] 권위 문서 § 4.7·4.8·4.9 정렬 재검토 (spec 11/12/13 작성 단계에서 반영)

## 검증 시나리오 (E2E mock)
- [ ] **시나리오 G**: 교사가 `/teacher/grading`에서 윤서 essay 1건 검수 → 승인 → 학부모 리포트에 점수 반영
- [ ] **시나리오 S**: 학생이 `/classbot` 홈 → "도함수 활용 마무리" → solve → 9번 문항 풀이 → 제출 → result 도달
- [ ] **시나리오 R1**: 학생이 봇 채팅 진입 시 체크인 인터셉트 → "그저그럼" 기록 → 웰빙 허브에 반영
  - **부분 진행 불가**: 체크인 인터셉트 미구현 — `/classbot/wellness/check-in` 직접 진입으로 대체 검증 가능
- [ ] **시나리오 R2**: 도현 3일 누적 "힘듦" → 교사 홈에 위기 알림 → 리포트 상세 → 1:1 면담 메모 작성 → 학생 개인 리포트에 첨부
  - 위 4개 시나리오는 PR #1 본문 체크리스트에서 사용자가 직접 브라우저로 검증할 항목

## 후속 작업 (이 plan에서 처리 안 된 항목)
- ~~체크인 인터셉트~~ ✅ — 2026-05-11 마무리 (CheckInPrompt + localStorage skip flag)
- ~~키워드 게이트 + CrisisModal~~ ✅ — 2026-05-11 마무리 (`lib/safety/keyword-gate.ts` + 자살예방상담 1393 직통)
- ~~시험 모드 외부 탭 카운트~~ ✅ — 2026-05-11 마무리 (visibilitychange + 컨텍스트 바 인디케이터)
- ~~교사 홈 위기 신호 버튼 → reports 딥링크~~ ✅ — 2026-05-11 마무리
- **`Submission` 엔티티 시드** — 백엔드 연결 시작 시점 v1
- **`lib/integrations/kakao-mock.ts` 파일 분리** — 어댑터 추상화 도입 시 v1

## 비고
- 추출본 정책: 다른 도메인(플래너/Q/라이브러리) 라우트로 새 링크 만들지 않음
- 풀이 워크스페이스는 Q 도메인 제거에 따라 **클래스봇 내부 자급** (spec 12 § 1)
- 학원 관리자 Flow E · Wee센터 실 API · 카카오 BIZ 실 발송 · 외부 탭 자동 제출 · 키워드 게이트 학부모 알림 → 모두 P1+ 스코프, 본 plan 제외
- 작업 완료 후 `/update-spec`으로 spec 11/12/13 변경 이력 갱신
