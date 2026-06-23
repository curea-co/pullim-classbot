# Classbot Dual-Mode PR-4 — Learning Loop (개념→연습→점검) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the PR-3 path **scaffold** into a real working loop for one subject end-to-end — per-unit content (개념 study + answerable 연습/점검 questions), a reusable quiz runner, a unit page that drives 개념→연습→점검 with per-unit progress, and completing 점검 marks the unit done + records the streak.

**Architecture:** New `lib/mock/classbot-learning-content.ts` seeds per-(tutor,unit) content (`UnitContent` = concept paragraphs + practice/check `LoopQuestion[]`). Extend `lib/store/self-learning.ts` with `unitProgress` (per-unit step completion). A reusable `QuizRunner` (MC, solve-workspace a11y) grades answers. A unit page `app/(student)/classbot/learn/[tutorId]/[unitId]/page.tsx` runs the 3 steps; `LearningPath`/`CurriculumUnitCard` link into it + show progress.

**Tech Stack:** Next.js 16 (nested dynamic route), React 19, zustand+persist, Tailwind v4, Jest.

## Global Constraints

- **Spec:** `proc/spec/2026-06-23_classbot-dual-mode-design.md` (§3, §8.4) — **PR-4 of 5**. Wires the loop for **one subject end-to-end** (수학 `ot_001`, all 5 units have at least concept + a short practice + a short check; other tutors can have lighter content). PR-5 = onboarding.
- **Reuse:** unit content references `OfficialTutor.curriculum` (`TutorUnit`); progress extends PR-3's `pullim-self-learning` store; the quiz runner mirrors the solve-workspace MC a11y (`role="radiogroup"` + `aria-label` + `role="radio"` + `aria-checked`).
- **Mode ≠ Role.** No `nav-config.ts`/`Role` changes. Class mode unchanged; self surfaces additive. All prod-verify e2e green (mock student defaults to class).
- **Guards:** tokens only (no hex in `components/**`; `sig.hex` runtime OK), DS type scale (no `text-[Npx]`), 44px touch, focus-visible, palette-safe self routes (no green/amber fills — even the 정답/오답 feedback uses the AA semantic tokens which are guard-safe, but verify on any scanned route; the learn routes are NOT in the color-palette 8-set).
- **Dates:** app code may use `new Date()` at call-time. **Next-16 dynamic route:** client page → `use(params)` (see `learn/[tutorId]/page.tsx` from PR-3 for the exact pattern).
- Branch `feat/dualmode-pr4-learning-loop` off `dev`; PR → `dev`. **Dev server on :3032 — do NOT run `bun run dev`; verify typecheck/build/gates/jest; controller runs e2e. `git add` specific files.** Commit per task.

---

### Task 1: Per-unit learning content (`classbot-learning-content.ts`)

**Files:** Create `apps/classbot/lib/mock/classbot-learning-content.ts`, `apps/classbot/lib/mock/__tests__/classbot-learning-content.test.ts`.

**Interfaces — Produces:**
- `type LoopQuestion = { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string }`
- `type UnitContent = { concept: string[]; practice: LoopQuestion[]; check: LoopQuestion[] }`
- `getUnitContent(tutorId: string, unitId: string): UnitContent | null`

- [ ] **Step 1: Failing test:**
```ts
import { getUnitContent } from '../classbot-learning-content';
import { getOfficialTutor } from '../classbot-official';

it('ot_001 every unit has concept + non-empty practice + check with valid correctIndex', () => {
  const t = getOfficialTutor('ot_001')!;
  for (const u of t.curriculum) {
    const c = getUnitContent('ot_001', u.id);
    expect(c).not.toBeNull();
    expect(c!.concept.length).toBeGreaterThan(0);
    expect(c!.practice.length).toBeGreaterThan(0);
    expect(c!.check.length).toBeGreaterThan(0);
    for (const q of [...c!.practice, ...c!.check]) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);  // in range
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  }
});
it('returns null for unknown tutor/unit', () => {
  expect(getUnitContent('ot_001', 'nope')).toBeNull();
  expect(getUnitContent('nope', 'u1')).toBeNull();
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement.** READ `lib/mock/classbot-official.ts` for `ot_001`'s `curriculum` unit ids/titles. Build a `Record<string, Record<string, UnitContent>>` keyed `[tutorId][unitId]`. For **ot_001 (수학) author all 5 units**: each `concept` = 2–4 short paragraphs (plain study text matching the unit title), `practice` = 2–3 MC questions, `check` = 1–2 MC questions, each with 3–4 `options`, a valid `correctIndex`, and a one-line `explanation`. (ot_002/ot_003 optional/light — out of the test's scope.) `getUnitContent` returns `MAP[tutorId]?.[unitId] ?? null`.
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): per-unit learning content (concept+practice+check) — PR4 T1"`

---

### Task 2: Unit progress in the store

**Files:** Modify `apps/classbot/lib/store/self-learning.ts`; extend `apps/classbot/lib/store/__tests__/self-learning.test.ts`.

**Interfaces — Produces (added):**
- `type LoopStep = 'concept' | 'practice' | 'check'`
- `type UnitProgress = { tutorId: string; unitId: string; concept: boolean; practice: boolean; check: boolean }`
- state `unitProgress: UnitProgress[]`; action `completeStep(tutorId, unitId, step: LoopStep)` (sets that step true, upserting the row; when `step==='check'` ALSO calls the existing `recordStudyToday()` logic — bump the streak).
- Selectors: `useUnitProgress(tutorId, unitId): UnitProgress` (returns a default all-false row if absent), `useIsUnitDone(tutorId, unitId): boolean` (= check true).

- [ ] **Step 1: Failing tests** (append):
```ts
import { useUnitProgress } from '../self-learning';
const TID='ot_001', UID='u_test';
it('completeStep marks steps; completing check bumps streak + marks done', () => {
  useSelfLearningStore.setState({ unitProgress: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => s().completeStep(TID, UID, 'concept'));
  expect(s().unitProgress[0]).toMatchObject({ tutorId: TID, unitId: UID, concept: true, practice: false, check: false });
  act(() => s().completeStep(TID, UID, 'check', '2026-06-23')); // check → streak bump
  expect(s().unitProgress[0].check).toBe(true);
  expect(s().streak.count).toBe(1);
});
```
(Note: give `completeStep` an optional `today?` 4th param so the streak side-effect is deterministic in tests, mirroring `recordStudyToday(today?)`.)
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement.** Add state + `completeStep(tutorId, unitId, step, today?)`: upsert the `UnitProgress` row (find by tutor+unit; create all-false if missing) setting `[step]=true`; if `step==='check'` invoke the same day-streak update as `recordStudyToday` (reuse — call `get().recordStudyToday(today)` AFTER the set, or factor the streak math into a shared helper). React-19-safe selectors (raw slice select; `useUnitProgress` selects `unitProgress` then `.find`/default outside).
- [ ] **Step 4: Run — PASS** (all prior tests still pass).
- [ ] **Step 5: Verify** — `bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): unit-progress + completeStep (check bumps streak) — PR4 T2"`

---

### Task 3: `QuizRunner` component

**Files:** Create `apps/classbot/components/classbot/quiz-runner.tsx`.

**Interfaces — Produces:** `<QuizRunner questions={LoopQuestion[]} onComplete={(passed: boolean, score: number) => void} ctaLabel?={string} />` — runs the MC questions one at a time, grades, shows per-question correct/explanation, and calls `onComplete(passed, score)` at the end (`passed` = all correct, or ≥ a threshold — use **all correct** for 점검 simplicity; the parent decides what to do).

- [ ] **Step 1: Implement** (`'use client'`). State: current index, selected option per question, submitted/checked state. Each question: `role="radiogroup"` + `aria-label="객관식 선택지"`, options as `role="radio"` `aria-checked` buttons (MIRROR `solve-workspace.tsx`'s a11y exactly — 44px, focus-visible, keyboard-operable selection). A 확인 button grades the current question (show correct/incorrect using AA semantic tokens `text-pullim-success`/`text-pullim-danger` + the `explanation`), then 다음 advances; after the last, call `onComplete(allCorrect, correctCount)`. Tokens only, no hex, DS type. Pure component — no store coupling.
- [ ] **Step 2: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 3: Commit** — `git commit -m "feat(dualmode): QuizRunner MC component — PR4 T3"`

---

### Task 4: Unit page — the 개념→연습→점검 flow

**Files:** Create `apps/classbot/app/(student)/classbot/learn/[tutorId]/[unitId]/page.tsx`.

**Interfaces — Consumes:** `getOfficialTutor`, `getUnitContent` (T1), `useUnitProgress`/`useSelfLearningStore` `completeStep` (T2), `QuizRunner` (T3), `botSignature`.

- [ ] **Step 1: Implement** (`'use client'`, `use(params)` for `{ tutorId, unitId }`). Resolve `getOfficialTutor(tutorId)` + the unit from its curriculum + `getUnitContent(tutorId, unitId)`; if any missing → `EmptyState` back to `/classbot/learn/${tutorId}` (or `/classbot`). Read `useUnitProgress(tutorId, unitId)`. Render a **stepper** for 개념 → 연습 → 점검 (which step is active can be local state initialized to the first incomplete step):
  - **개념:** render `content.concept` paragraphs (study text) + a "이해했어요" button → `completeStep(tutorId, unitId, 'concept')` → advance to 연습.
  - **연습:** `<QuizRunner questions={content.practice} ctaLabel="연습 완료" onComplete={() => { completeStep(tutorId, unitId, 'practice'); /* advance */ }} />` (practice is not gated — completing it marks practice done).
  - **점검:** `<QuizRunner questions={content.check} onComplete={(passed) => { if (passed) completeStep(tutorId, unitId, 'check'); }} />` — on pass, show a "단원 완료 🎉" state (streak already bumped by the store) + a link back to `/classbot/learn/${tutorId}`; on fail, allow retry.
  - Header: `BackLink` to `/classbot/learn/${tutorId}`, `PageHeader` (unit title + tutor name, `sig.hex` accent). Palette-safe.
- [ ] **Step 2: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates` (build emits `/classbot/learn/[tutorId]/[unitId]`).
- [ ] **Step 3: Commit** — `git commit -m "feat(dualmode): unit page — 개념→연습→점검 flow — PR4 T4"`

---

### Task 5: Wire path + curriculum card to the unit page + show progress

**Files:** Modify `apps/classbot/components/classbot/learning-path.tsx`; Modify `apps/classbot/components/classbot/curriculum-unit-card.tsx`.

**Interfaces — Consumes:** `useUnitProgress`/`useIsUnitDone` (T2).

- [ ] **Step 1: `LearningPath` reflects progress + links into the unit page.** Make `LearningPath` read `useUnitProgress(tutorId, unit.id)`. The 3 steps (개념/연습/점검) are no longer "준비 중" — each links to `/classbot/learn/${tutorId}/${unit.id}` (the unit page handles which step; optionally pass `?step=`). Completed steps show a done check (use a token tick, AA-safe). Keep min-h-11/focus-visible. (Drop the 준비 중 hint.)
- [ ] **Step 2: `CurriculumUnitCard` shows unit status.** Read `useIsUnitDone(tutorId, unit.id)`; when done, show a "완료" badge (token-based) on the card. Keep the 목표 추가 toggle.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): path steps link to unit page + progress/done badges — PR4 T5"`

---

### Task 6: PR-4 verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — typecheck + lint + test (incl. T1/T2 tests) + build (emits the nested unit route), all pass.
- [ ] **Step 2: Class mode + e2e unchanged** — color-palette 8/8 + chat + mobile-and-focus + wellness-intensity-range pass; the new QuizRunner mirrors solve a11y but is a SEPARATE component (it must not break the existing solve `:77` spec).
- [ ] **Step 3: Loop smoke (self)** — set self mode + an `ot_001` enrollment; `/classbot/learn/ot_001` → open a unit → `/classbot/learn/ot_001/<unitId>`: read 개념 → 이해했어요 → 연습 quiz (answer, grade, explanation) → 점검 quiz → on pass: "단원 완료" + the unit shows 완료 + streak bumped; reload → progress persists. Screenshot the unit page (a quiz mid-grade) + the curriculum with a 완료 badge. No pageerror; palette-safe on the learn routes.
- [ ] **Step 4: Done** — fix any gap, re-run, commit `fix(dualmode): <what>`.

---

## Self-Review

**Spec coverage (§8.4 PR-4):** per-unit content → T1; unit progress + check-bumps-streak → T2; the quiz runner → T3; the 개념→연습→점검 unit page → T4; path/card wiring + progress UI → T5; class+e2e unchanged → T6. ✅ One subject (ot_001) end-to-end per spec; PR-5 = onboarding.

**Placeholder scan:** T1 authors real ot_001 content (test enforces valid `correctIndex`/non-empty); T2 has full store logic + tests; T3/T4/T5 give component contracts + "mirror solve-workspace a11y" + "use(params) like PR-3". No TBD.

**Type consistency:** `LoopQuestion`/`UnitContent`/`getUnitContent` (T1) → T3 (runner) + T4 (page). `LoopStep`/`UnitProgress`/`completeStep`/`useUnitProgress`/`useIsUnitDone` (T2) → T4 (page) + T5 (path/card). `QuizRunner` (T3) → T4. The unit page route `/classbot/learn/[tutorId]/[unitId]` is linked from T5.

**Risk note:** (1) **QuizRunner a11y must not collide with the solve e2e** — it's a new component on new routes (solve `:77` runs on the assignment solve page, untouched); T6 Step 2 confirms. (2) **Streak double-count** — `completeStep(...,'check')` bumping streak must reuse the same-day-guarded `recordStudyToday` math so re-finishing a check the same day doesn't inflate the streak. (3) **Nested `use(params)`** — `{tutorId,unitId}` both from the Promise; mirror PR-3. (4) class mode unchanged — T6 Step 2 is the net.
