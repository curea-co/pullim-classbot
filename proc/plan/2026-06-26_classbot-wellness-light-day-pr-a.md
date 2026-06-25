# 웰빙 가벼운 모드 PR-A (Foundation) Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development 또는 executing-plans. 단계는 `- [ ]`.

**Goal:** 가벼운 모드의 신호·상태·넛지 토대 — 저조 판정, 날짜 키 persist 스토어, 넛지 배너 — UI 배선 없이 단위/RTL 테스트로 검증.

**Architecture:** 순수 `isLowConditionDay` + `useLowConditionToday`(hook) + `light-day` persist 스토어 + `LightDayNudge`(pure-ish, props). store/router 비의존.

**Tech Stack:** Next 16, React 19, zustand+persist, Tailwind v4(PUDS), Jest+RTL.

## Global Constraints
- `components/**` hex 금지(토큰), `text-[Npx]` 금지, 44px, focus-visible, 학생 라우트 green/amber 금지(blue/slate/lemon).
- 검증: `bun --filter @pullim-classbot/classbot {typecheck,lint,test}` (worktree node_modules 심링크, build는 CI).
- 브랜치 `feat/classbot-wellness-light-day`(off dev). 커밋 per task.

---

### Task 1: 저조 판정 `isLowConditionDay` + `useLowConditionToday`

**Files:** Create `apps/classbot/lib/mock/classbot-light-day.ts`, `__tests__/classbot-light-day.test.ts`.

**Produces:**
- `isLowConditionDay(input: { score: number; flag?: string | null; mood: import('./classbot').EmotionMood | null }): boolean` — `score < 60 || Boolean(flag) || (mood != null && mood >= 3)`.
- `useLowConditionToday(studentId: string): boolean` — 오늘 snapshot(`getWellbeingTrend(studentId)` 마지막) {score, flag} + 오늘 체크인 mood(`getCheckInsForStudent`에서 daysAgo===0, 없으면 null) → `isLowConditionDay`.

- [ ] Step 1: 실패 테스트 — score 59→true / 60→false; flag 있으면 true; mood 3·4→true, 1·2→false, null 무시; 조합(score 좋아도 mood3→true).
- [ ] Step 2: RED.
- [ ] Step 3: 구현(순수 + hook).
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): isLowConditionDay 저조 판정`.

### Task 2: light-day persist 스토어

**Files:** Create `apps/classbot/lib/store/light-day.ts`, `__tests__/light-day.test.ts`.

**Produces:**
- store `{ enabledDate: string | null; enable: (today: string) => void; disable: () => void }`, persist `pullim-light-day`.
- `useLightDayOn(today: string): boolean` (= enabledDate===today), `useLightDayActions(): { enable, disable }`.

- [ ] Step 1: 실패 테스트 — enable('2026-06-26') → useLightDayOn('2026-06-26')=true, ('2026-06-27')=false(다음 날 off); disable → false.
- [ ] Step 2: RED.
- [ ] Step 3: 구현.
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): light-day persist 스토어`.

### Task 3: `LightDayNudge` 배너

**Files:** Create `apps/classbot/components/classbot/home/light-day-nudge.tsx`, `components/classbot/home/__tests__/light-day-nudge.test.tsx`.

**Produces:** `function LightDayNudge({ onEnable }: { onEnable: () => void }): JSX.Element` — 차분한 배너(토큰, palette-safe) + [가볍게 가기] → onEnable.

- [ ] Step 1: 실패 RTL — 렌더 텍스트 확인 + [가볍게 가기] 클릭 → onEnable 호출.
- [ ] Step 2: RED.
- [ ] Step 3: 구현(pure component).
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): LightDayNudge 배너`.

---

## PR-A 마감
- [ ] 전체 typecheck/lint(0 error, gates)/test green.
- [ ] PR `feat/classbot-wellness-light-day → dev` (FE only). spec/plan 포함.
- [ ] PR-B(TodoPanel light + 홈 배선)는 별도 plan.

## Self-review
- spec §5 신호 → Task 1; §5 상태 → Task 2; §6 넛지 → Task 3. TodoPanel/홈 배선 = PR-B(범위 외 명시).
- 타입 일관: `isLowConditionDay` input keys(score/flag/mood) = useLowConditionToday가 채움. `today` 문자열(YYYY-MM-DD) = store 키 = useLightDayOn 인자.
