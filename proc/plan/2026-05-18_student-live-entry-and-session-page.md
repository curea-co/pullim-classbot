# 2026-05-18 — 풀림 클래스봇 전체 플로우 갭 해소 (9 플로우 일괄)

## 목표
2026-05-18 화면 역분석 + 9개 플로우 감사에서 발견한 **모든 갭을 하루 안에 mock 단계에서 해소**한다. 라이브 진입·리플레이 review 라우트·빌더 deploy 실효화·즉석 퀴즈 생성·위기 개입 액션·채점 완료 알림·enrollment 토글·scope 자동 스위치 인지를 한 사이클로 마감.

출처: 2026-05-18 화면 역분석 + 플로우 감사 보고.

## 배경

### 갭 9건 분류

| # | 플로우 | 상태 | 원인 |
|---|---|---|---|
| F1 | 라이브 진행 (학생·교사) | 🔴 | 라우트 자체 부재 |
| F2 | 라이브→리플레이 핸드오버 | 🟠 | `/teacher/replay/*` broken link 2건 |
| F3 | 빌더 → 배포 | 🟡 | deploy 함수가 toast만, state 변경 없음 |
| F4 | 즉석 퀴즈 생성 | 🔴 | "새 퀴즈"/"폴 생성" 버튼 disabled v2 |
| F5 | 위기 신호 개입 | 🟠 | "1:1 상담 / Wee센터" 버튼 disabled v2, 학생 카드 클릭 불가 |
| F7 | 채점 완료 알림 | 🟡 | notification 인프라 부재 |
| F8 | 라이브 시점 학생→교사 질문 | 🟡 | F1과 묶임 (replay 시점은 존재) |
| F9 | 봇 enrollment / 학생 배정 | 🟠 | static mock, 교사 UI 부재 |
| F10 | scope 자동 스위치 학생 인지 | 🟡 | 정책 명시는 있으나 인지 UI 부재 |

F6(학생 발화 → 교사 모니터링) · F7 채점 loop closure는 기존 정상 동작. 본 plan에는 F7 알림 부분만 포함.

### 외부에서 만들 수 없는 데이터 신호 (라이브 정합성 근거)
`liveFeed` 학생ID 매핑 / `currentQuiz` 분포 / `ReplaySegment type='sharing'·'attention'` / `studentCount` / `ownedByMe` — 풀림 내부 세션에서만 생성 가능. F1·F4·F8·F2 묶음이 정합.

## 작업 항목

### Phase A — G1 의사결정 묶음 (Phase B 진입 전 합의)

**Critical (defaults 잡기 어려움)**
- [ ] **D1: 라이브 영상·음성 시청 채널** — 풀림 내장 player / 외부 stream 임베드 / 음성+슬라이드 only
- [ ] **D2: 학생 질문 RBAC** — 익명 submit / 학생명 + 모더레이션 후 broadcast / 학생명 + 즉시 전체 공유
- [ ] **D3: 리플레이 review 단계 교사 액션** — 구간 자르기·마스킹·핵심메시지 편집 / 그냥 승인만 / 전체 묶음
- [ ] **D4: v1 위기 개입 액션** (v2 Wee센터 전까지) — 학생 chat 진입 / 교사 메모 작성 / 학부모 push 둘 다 / 아무것도 안 함

**Default 잡고 가는 11건 (G1이 override 가능)**
- [x] D5: scope 자동 스위치 학생 인지 → **chat 상단 chip 색 변경 + tooltip** (기본)
- [x] D6: 실시간 transcript 정책 → **1~3s 지연, 최근 30줄 cap, 현재 발화 하이라이트**
- [x] D7: `/teacher/replay` IA → **list view + detail (학생 리플레이와 같은 구조, 다만 review 단계 포함)**
- [x] D8: 빌더 deploy 시 봇 ID → **cb_00N 자동 증가, 학생 enrollment은 선택 반에 자동 추가**
- [x] D9: 즉석 퀴즈 v1 타입 → **객관식만** (4지선다, LiveQuizCard 호환)
- [x] D10: 퀴즈 출제 후 학생 push → **client-side mock state로 currentQuiz 교체**
- [x] D11: 위기 학생 상세 UI → **모달** (full route 비대)
- [x] D12: 채점 완료 학생 알림 → **home 알림 카드** (toast는 휘발, push는 backend)
- [x] D13: enrollment 토글 위치 → **/teacher/classbot 상세 안에 학생 목록 + 토글**
- [x] D14: enrollment 해제 정책 → **비활성** (destructive 회피)
- [x] D15: scope 변경 historical log → **학생 노출 안 함** (교사 내부 정보)

### Phase B — 구현 (sub-PR 9건, 의존도 낮은 순)

**Batch 1 — G1 의사결정 불요 (병렬 처리)**

- [ ] **B1: F2 `/teacher/replay` 라우트 신규 + broken link 해소** (S)
  - `/teacher/replay/page.tsx` (list) + `/teacher/replay/[id]/page.tsx` (detail with review actions placeholder)
  - `/teacher/classbot` "수업 종료 → 리플레이 생성" CTA 정상화
  - `replay-review.tsx` 컴포넌트의 `/teacher/replay` link 정상화
- [ ] **B2: F3 빌더 deploy 실효화** (S)
  - `step-content.tsx:547 deploy()` → toast 외에 client state에 classBots push + 반 선택 enrollment 자동 생성
  - 배포 후 `/teacher/classbot`으로 router.push + 신규 봇 상세 진입
- [ ] **B3: F9 enrollment 토글** (S)
  - `/teacher/classbot` 상세에 "등록 학생 N명" 섹션 신규 — 학생 리스트 + 활성/비활성 토글
  - studentEnrollments 동기 변경
- [ ] **B4: F10 scope 자동 스위치 학생 인지** (S)
  - 학생 chat 상단의 면책 alert 옆에 현재 scope chip 추가 (시간대별 자동 변동 표시)
  - chip click 시 자동 스위치 시간표 popover

**Batch 2 — D1·D2·D5 의사결정 후 (F1 라이브 묶음)**

- [ ] **B5: 학생 홈 LIVE 헤더 CTA 격상 + 봇 카드 LIVE 칩 분기** (S)
  - `/classbot/live/[botId]` 진입점 두 곳
- [ ] **B6: `/classbot/live/[botId]` 라우트 골격** (M)
  - 라이브 봇만 prerender, 종료 봇 접근 시 replay/chat fallback
  - 4영역 skeleton (퀴즈 / 채팅 / 질문 / transcript)
- [ ] **B7: 4영역 통합 컴포넌트** (L)
  - LiveQuizCard 재사용 / 라이브 채팅 (ChatPanel 변형) / 학생 질문 submit / transcript stream
  - D1·D2 의사결정 반영
- [ ] **B8: F4 즉석 퀴즈 생성 UI** (M)
  - QuizLauncher disabled 해제, 모달 신규 — 단원·문제·4지선다·정답·시간 입력
  - 발사 시 currentQuiz state 교체 → 학생 라이브 화면에 즉시 반영

**Batch 3 — D3·D4 의사결정 후**

- [ ] **B9: F2 리플레이 review 단계 액션** (M)
  - `/teacher/replay/[id]` 에 review 액션 UI (D3 결정에 따라)
  - ReplayStatus processing → review → sent state 변경 + 학생 리플레이 탭에 노출 트리거
- [ ] **B10: F5 위기 신호 개입 액션** (M)
  - 교사 홈 위기 학생 카드 클릭 → 모달
  - D4 결정 액션 (chat 진입 / 메모 / push) UI 구현

**Batch 4 — 알림**

- [ ] **B11: F7 채점 완료 학생 알림** (S)
  - 학생 home에 "📋 채점 완료 N건" 알림 카드 신규
  - 클릭 시 result 페이지로 진입

### Phase C — e2e + ship

- [ ] e2e 신규 — 본 plan으로 추가되는 핵심 path 5건
  - `student-live.spec.ts` (B5~B7)
  - `quiz-launch-flow.spec.ts` (B8)
  - `teacher-replay.spec.ts` (B1, B9)
  - `builder-deploy.spec.ts` (B2)
  - `enrollment-toggle.spec.ts` (B3)
- [ ] `bun x tsc --noEmit` + `bun run build` clean
- [ ] PR 머지 (sub-PR 11건) + `bunx vercel --prod` 1회 통합 배포 + prod-verify dispatch green
- [ ] [output/screen-captures/2026-05-18/design-analysis.html](../../output/screen-captures/2026-05-18/design-analysis.html) 정정
  - 슬라이드 06/07 본문에 "학생 라이브 진입 + 풀림 내부 세션" 사실 반영
  - 9 플로우 갭 해소 슬라이드 신규

## 예상 블로커

- **G1 의사결정 4건 (D1~D4) 합의 시간** — Batch 2·3 진입 hard gate
- **작업량 — 11 sub-PR, 1일 안 ambitious**. PR 머지 + prod-verify 페이스 관리 필요
- **mock 단계의 라이브 동시성 시뮬** — 단일 클라이언트 상태로 학생/교사 동시 인터랙션 시뮬은 불완전. dogfooding 보고만 가능
- **Batch 1·4 (의사결정 불요)는 G1 합의 기다리는 동안 병렬 진행** — 시간 절약

## 검증

- e2e 5건 모두 통과
- prod-verify dispatch green 1회
- 9 플로우 매트릭스 재점검 — 모든 행이 🟢 또는 명시적 v2 stub
- 슬라이드 deck 정정
- 본 plan 모든 체크박스 [x] 후 archive로 이동

## 다음 사이클 첫 액션
Phase A G1 의사결정 4건 합의 → Batch 1 즉시 병렬 시작.
