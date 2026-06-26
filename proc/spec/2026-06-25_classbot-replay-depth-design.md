# Classbot 리플레이 깊이 — 회고 + 시험지 재도전 (Design Spec)

> Phase 1 / 첫 스펙. 브레인스토밍 합의안(2026-06-25). 구현 전 권위 문서.

## 1. 목표 (Goal)

리플레이를 **수동 재생 로그 → 수업 단위 회고(recap) 엔진**으로 깊이 있게 만든다. 한 수업의
리플레이에 대해 **① 핵심 정리 + ② 자동 추출 약점(오답·집중 저하) + ③ 다음 행동**을 제공하고,
약점의 "다시 풀기"는 **실제 모의고사 시험지 경험**(명조 지문 박스 · 문단 구조 · ①~⑤ 조판)으로 렌더한다.

핵심 thesis: 리플레이는 부가 위젯이 아니라 **연속성 엔진** — 지난 수업 → 의미 추출(요약·약점) → 다음 행동(다시보기·재도전·질문).

## 2. 범위 (Scope)

**포함 (이 스펙):**
- `replay/[id]` 상단의 **회고 카드** (recap). 리플레이 홈에는 가벼운 "복습할 거리 N" 넛지(선택).
- 기존 데이터에서 **약점 자동 추출** (오답 퀴즈 세그먼트 + 집중 저하 구간).
- 약점별 액션: **다시 보기**(seek) · **시험지 재도전**(exam-sheet 인라인) · **봇에게 질문**(prefill chat).
- **exam-sheet 렌더러** (serif 지문 박스 + 문항번호 + ①~⑤ + 〈보기〉 변형) — 재사용 가능하게 설계.
- **해결(resolved) 상태 영속** (replay 스토어). 재도전 정답 → 회고 카드에서 ✓ 해결.

**제외 (후속 스펙으로 분리):**
- 크로스-리플레이 **복습 큐**(여러 수업 약점 누적) — 다음 스펙.
- **교사 가시성**(교사가 학생 회고/약점 열람·개입) — 별도.
- self 모드 **학습 루프(개념→연습→점검) 브리지** — 모드 불일치(아래 §4)로 이번 범위 밖.
- exam-sheet를 과제(`assignment/solve`)·학습 루프에 적용 — 렌더러는 재사용 가능하게 만들되, 이번엔 **리플레이 재도전에만 배선**.

## 3. 성공 기준 (Success criteria)

- sent 리플레이를 열면 회고 카드가 핵심 3줄 + 막힌 곳 N개(오답·집중↓)를 보여준다.
- "다시 풀기" → 플레이어가 그 순간으로 seek + 시험지 스타일 문항이 인라인으로 뜬다 → 제출/채점/해설.
- 정답 시 그 약점이 회고에서 ✓ 해결로 바뀌고 새로고침 후에도 유지된다.
- "다시 보기" → 그 순간 seek. "질문" → 해당 교사 봇 채팅으로(질문 prefill).
- 기존 리플레이 시청·재생 흐름과 prod-verify e2e는 그대로 green.

## 4. 제약 (Constraints)

- **class 모드 기능.** 리플레이는 교사 봇(`classBots`) 기반. "다음 행동"은 class 프리미티브(다시보기·교사봇 채팅) 안에서만 — self 모드 학습 루프(officialTutors/self-learning)로 점프하지 않는다(모드·커리큘럼 불일치).
- **mock 구동**(BE 없음). 기존 `Replay` 데이터 재사용 + 최소 필드 추가.
- **디자인 가드(중요):** `components/**` hex 금지(토큰만), `text-[Npx]` 금지(타입 스케일), 44px 터치, focus-visible, **학생 라우트 green/amber 금지**.
  - 약점 사유 칩: 오답=`pullim-danger` 계열(과제 overdue와 동일 권한), **집중↓=amber 금지** → `pullim-slate`/`pullim-blue` 틴트 토큰으로. (목업의 amber는 가드 위반 → 구현 시 교체)
- **시험지 영역은 의도적 serif.** 앱 나머지는 sans(PUDS) 유지. serif는 `font-serif` 유틸/스코프 클래스로, 종이 질감도 **기존 토큰(white/slate)** 으로 표현(신규 hex 금지). 브랜딩 권위(07)와 충돌 없도록 "시험지 존" 한정.
- **hydration-safe.** replay 스토어는 persist → 해결 상태 플래시 방지. #144의 `useStoresHydrated` 패턴 재사용해 회고 카드 게이팅.

## 5. 데이터 모델 (Data model)

**기존 재사용:** `Replay.segments`(type `concept|quiz|student-q|sharing|attention`, `atSec`, `label`, `myAnswer`, `correctAnswer`), `Replay.focusBins`(분당 0~100), `Replay.keyTakeaways`(3), `Replay.myAccuracy`, `watchProgress`.

**추가:**
- `ExamQuestion` 타입 (재도전·시험지 렌더용):
  ```ts
  type ExamPassage = { paragraphs: string[] };           // 국어/영어 지문 (선택)
  type ExamBoxed = { lines: string[] };                  // 수학/과학 〈보기〉·조건 (선택)
  type ExamQuestion = {
    stem: string;                 // 발문
    passage?: ExamPassage;        // 지문 (있으면 serif 박스)
    boxed?: ExamBoxed;            // 〈보기〉 (수학/과학 변형)
    options: string[];            // ①~⑤
    answerIndex: number;
    explanation: string;          // 제출 후 해설
    subjectLabel: string;         // "영어 · 빈칸 추론" 등 헤더
  };
  ```
- 리플레이 퀴즈 세그먼트 ↔ 문항 연결: `getReplayQuiz(replayId, segmentAtSec): ExamQuestion | null` (mock 시드). 데모 리플레이의 오답 세그먼트에 시드 문항을 붙인다. (세그먼트 타입 확장 대신 lookup으로 — `Replay` 타입 비대화 회피)
- **약점 파생(저장 안 함, 순수 계산):** `getReplayWeakPoints(replay): WeakPoint[]`
  - `WeakPoint = { key: string; atSec: number; label: string; reason: 'wrong' | 'low-focus'; }`
  - wrong: `seg.type==='quiz' && seg.myAnswer && seg.correctAnswer && seg.myAnswer !== seg.correctAnswer`
  - low-focus: `focusBins[min] < FOCUS_THRESHOLD`(예 40) → 가장 가까운 `concept`/`attention` 세그먼트에 매핑
  - dedupe(같은 세그먼트), `atSec` 정렬, 상위 N(예 4) cap. (cap 시 `log`/주석으로 드러냄)
- **해결 상태:** `lib/store/replay.ts`(persist `pullim-replay-overrides`) 확장 — `resolvedWeakPoints: Record<replayId, string[]>` + `resolveWeakPoint(replayId, key)` + `useResolvedWeakPoints(replayId)`.

## 6. 유닛/컴포넌트 (Units)

| 유닛 | 책임 | 의존 |
|---|---|---|
| `lib/mock/classbot-replay-exam.ts` (신규) | `ExamQuestion` 타입, 데모 시드 문항, `getReplayQuiz()` | classbot(Replay) |
| `lib/mock` `getReplayWeakPoints()` (신규, replay mock 근처) | 약점 순수 파생 | Replay |
| `lib/store/replay.ts` (확장) | `resolvedWeakPoints` + action + selector | zustand persist |
| `components/classbot/exam-sheet.tsx` (신규, client, 재사용) | `ExamQuestion`을 시험지 스타일로 렌더 + 채점·해설. props `{ question, onResult(correct:boolean) }` | tokens, font-serif |
| `components/classbot/replay-recap.tsx` (신규, client) | 회고 카드 — 핵심 정리 + 약점 목록(해결 접힘) + 액션. 약점/해결 구독 | weakpoints, replay store, useStoresHydrated |
| `replay/[id]` client (확장) | recap(상단) + player 합성, 액션 배선(seek / exam-sheet 열기 / chat 이동) | recap, player |
| `replay/page.tsx` (선택, 가벼운 확장) | recent 리플레이에 "복습할 거리 N" 넛지 → recap 링크 | weakpoints |

**플레이어 연동:** recap의 "다시 보기"/"다시 풀기"는 같은 페이지의 플레이어를 제어. `replay/[id]` client에서 "active re-attempt"(segment atSec + open) 상태를 lift → 다시보기=seek, 다시풀기=seek + **플레이어 영역 인라인 시험지 패널**. 질문=`/classbot/chat?bot=<botId>` 이동 — 약점 label을 query로 prefill하되, 채팅이 미소비해도 **해당 교사 봇 진입은 보장**(class 모드 프리미티브).

## 7. 데이터 흐름 (Data flow)

```
Replay(mock) ──getReplayWeakPoints()──▶ WeakPoint[]
                                          │  (+ useResolvedWeakPoints → ✓ 표시)
                                          ▼
                                    replay-recap 카드
        ┌──────────────┬───────────────┬─────────────────┐
   다시보기(seek)    다시풀기            질문
        ▼               ▼                 ▼
   player.seek    exam-sheet(getReplayQuiz)   /classbot/chat?bot=botId
                   onResult(correct)
                        └─ resolveWeakPoint(persist) → recap ✓ 해결
```

## 8. UX / 디자인

- **회고 카드:** dark 헤더(봇·단원·정답률·시청진도) → 핵심 정리(takeaways) → ⚠ 막힌 곳 N(행: label + 사유 칩 + atSec + 액션) → 해결 접힘 라인. 팔레트 세이프(오답=danger, 집중↓=slate/blue 틴트), 토큰만, 44px, focus-visible.
- **exam-sheet:** serif 존 — 문항번호 박스 + 발문, 지문은 bordered serif 박스(문단 들여쓰기·justify·line-height↑), ①~⑤ 조판(선택 하이라이트), 제출 → 정답/해설 reveal. 수학·과학은 `boxed`(〈보기〉/수식) 변형. 토큰만(신규 hex 금지), serif는 스코프 유틸.
- **hydration:** recap는 `useStoresHydrated`(replay 스토어) 후에만 해결 상태 반영 → ✓ 플래시 방지.

## 9. 테스트

- `getReplayWeakPoints`: 오답 감지 / 집중저하 감지 / dedupe / cap / 정렬 (단위).
- replay 스토어 `resolveWeakPoint`: idempotent, selector 반영 (단위).
- `exam-sheet` 채점: 정답/오답 → `onResult` 호출 (단위/RTL).
- UI: Playwright walkthrough(아래 §10).

## 10. 검증

typecheck · lint + design-gates(0 error) · jest · build. Playwright: sent 리플레이 열기 → 회고에 약점 표시 → 다시풀기 시험지 → 정답 → ✓ 해결(새로고침 유지) → 다시보기 seek → 질문 채팅 이동.

## 11. PR 계획 (레포 단위-PR 규칙)

FE-only 단일 도메인. #144의 리뷰 무한루프 교훈을 반영해 **2개로 분리**를 권장(각 `→ dev`):
- **PR-A (foundation):** `ExamQuestion`/시드/`getReplayQuiz`, `getReplayWeakPoints`, replay 스토어 해결상태, `exam-sheet` 컴포넌트 + 단위테스트. (UI 배선 없음 → diff 작고 리뷰 수렴 쉬움)
- **PR-B (wiring):** `replay-recap` 카드 + `replay/[id]` 플레이어 배선 + 홈 넛지.

최종 분리 여부는 writing-plans에서 확정.
