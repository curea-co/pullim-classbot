# Classbot Dual-Mode PR-3 — Self-Home Goals + Progress/Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn "chat with a tutor" into structured self-directed learning — extend the self-learning store with **goals (per tutor 단원) + a daily streak + 오늘의 한 가지**, add a **learn route** (`/classbot/learn/[tutorId]`) where the student picks 단원 goals and sees the 개념→연습→점검 **path scaffold**, and surface goals + streak on the self-home.

**Architecture:** Extend `lib/store/self-learning.ts` (goals[] + streak + actions/selectors). New `learning-path.tsx` renders the 3-step path indicator. New route `app/(student)/classbot/learn/[tutorId]/page.tsx` lists the tutor's `curriculum` with a per-단원 goal toggle + the path scaffold. The self-home gains a 오늘의 한 가지 card + streak; `MyTutorCard` links to the learn route.

**Tech Stack:** Next.js 16 (App Router, dynamic route), React 19, zustand+persist, Tailwind v4, Jest.

## Global Constraints

- **Spec:** `proc/spec/2026-06-23_classbot-dual-mode-design.md` (§3, §8.3) — this is **PR-3 of 5** (goals + streak + 오늘의 한 가지 + the 단원 picker + the path **scaffold** ONLY). The actual 개념→연습→점검 **loop wiring** (chat/quiz/check content + step completion) is **PR-4** — in PR-3 the path steps are a visual scaffold whose links/actions are stubbed (`/classbot/chat?bot=<tutorId>` for 개념; 연습/점검 are visually "준비 중" or disabled).
- **Reuse:** goals reference `OfficialTutor.curriculum` (`TutorUnit = {id,title,order}`) from `@/lib/mock/classbot-official`; enrollment + `useEnrolledTutors` from PR-2's store (same file, extended).
- **Mode ≠ Role.** No `nav-config.ts`/`Role` changes (the learn route is reached from 내 튜터, not a nav item). Class mode unchanged; self surfaces additive.
- **Guards:** tokens only (no hex literals in `components/**`; `sig.hex` runtime accent OK), DS type scale (no `text-[Npx]`), 44px touch, focus-visible, palette-safe student routes (no green/amber fills). All prod-verify e2e stay green (the mock student defaults to class mode).
- **Dates:** app code may use `new Date()` at call-time (NOT the workflow-script restriction). Streak actions take an optional `today` param for deterministic tests.
- Branch `feat/dualmode-pr3-self-home-goals` off `dev`; PR → `dev`. **Dev server on :3032 — do NOT run `bun run dev`; verify typecheck/build/gates/jest; controller runs e2e. `git add` specific files.** Commit per task.

---

### Task 1: Goals + streak in the self-learning store

**Files:** Modify `apps/classbot/lib/store/self-learning.ts`; Modify/extend `apps/classbot/lib/store/__tests__/self-learning.test.ts`.

**Interfaces — Produces (added to the existing store):**
- `type LearningGoal = { tutorId: string; unitId: string; addedAt: string }`
- `type Streak = { count: number; lastStudyDate: string | null }` (date = `YYYY-MM-DD`)
- store state gains `goals: LearningGoal[]` and `streak: Streak`; actions `addGoal(tutorId, unitId)` (idempotent on the pair), `removeGoal(tutorId, unitId)`, `recordStudyToday(today?: string)`.
- Selectors: `useGoals(): LearningGoal[]`, `useIsGoal(tutorId, unitId): boolean`, `useTutorGoals(tutorId): LearningGoal[]`, `useStreak(): Streak`, `useTodayOneThing(): { tutor: OfficialTutor; unit: TutorUnit } | null` (the first active goal resolved to its tutor+unit, or null).

- [ ] **Step 1: Failing tests** — append to `self-learning.test.ts`:
```ts
import { useGoals, useIsGoal, useStreak } from '../self-learning';
import { officialTutors } from '@/lib/mock/classbot-official';
const T = officialTutors[0]; const U0 = T.curriculum[0].id;

it('addGoal is idempotent on (tutor,unit); removeGoal removes', () => {
  useSelfLearningStore.setState({ goals: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => { s().addGoal(T.id, U0); s().addGoal(T.id, U0); });
  expect(s().goals.filter(g => g.tutorId === T.id && g.unitId === U0)).toHaveLength(1);
  act(() => s().removeGoal(T.id, U0));
  expect(s().goals).toHaveLength(0);
});
it('recordStudyToday: increments on consecutive days, resets after a gap', () => {
  useSelfLearningStore.setState({ goals: [], streak: { count: 0, lastStudyDate: null } });
  const s = () => useSelfLearningStore.getState();
  act(() => s().recordStudyToday('2026-06-23'));
  expect(s().streak).toEqual({ count: 1, lastStudyDate: '2026-06-23' });
  act(() => s().recordStudyToday('2026-06-23'));            // same day → no change
  expect(s().streak.count).toBe(1);
  act(() => s().recordStudyToday('2026-06-24'));            // next day → +1
  expect(s().streak.count).toBe(2);
  act(() => s().recordStudyToday('2026-06-27'));            // gap → reset to 1
  expect(s().streak.count).toBe(1);
});
```
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- self-learning`).
- [ ] **Step 3: Implement.** Add to the store state `goals: []`, `streak: { count: 0, lastStudyDate: null }`. Persist already covers them (same `persist` wrapper — they'll be in `pullim-self-learning`). `addGoal`: no-op if the (tutorId,unitId) pair exists, else append `{ tutorId, unitId, addedAt: new Date().toISOString() }`. `removeGoal`: filter out the pair. `recordStudyToday(today = new Date().toISOString().slice(0,10))`: if `lastStudyDate === today` no-op; else compute the day-difference vs `lastStudyDate` — if exactly 1 day → `count+1`, else (gap or first) → `count = 1`; set `lastStudyDate = today`. (Day diff: compare `Date.parse(today) - Date.parse(last)` to `86400000`.) Add the selectors; `useTodayOneThing` reads the first goal, resolves `getOfficialTutor(g.tutorId)` + finds the unit in its curriculum, returns `{tutor,unit}` or null (filter misses). **Keep all React-19-safe selector rules** (no fresh array/object from inside a selector — select the raw slice, map/derive outside).
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): goals + daily streak in self-learning store — PR3 T1"`

---

### Task 2: `LearningPath` step-scaffold component

**Files:** Create `apps/classbot/components/classbot/learning-path.tsx`.

**Interfaces — Produces:** `<LearningPath tutorId={string} unit={TutorUnit} />` — a 3-step indicator (개념 → 연습 → 점검). Step 1 (개념) is a link to `/classbot/chat?bot=${tutorId}`; steps 2/3 (연습/점검) are visually present but marked "준비 중" (disabled, PR-4 wires them).

- [ ] **Step 1: Implement** (`'use client'`). A horizontal 3-step row: each step = an index badge + label (개념 학습 / 연습 퀴즈 / 점검) + connector. 개념 wraps in a Next `<Link href={\`/classbot/chat?bot=${tutorId}\`}>` (focus-visible ring, min-h-11); 연습/점검 are non-interactive with a "준비 중" hint. Tokens only (blue/slate), DS type scale, no hex, no green/amber. Import `type { TutorUnit } from '@/lib/mock/classbot-official'`.
- [ ] **Step 2: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 3: Commit** — `git commit -m "feat(dualmode): LearningPath step scaffold (개념→연습→점검) — PR3 T2"`

---

### Task 3: Learn route — tutor curriculum + 단원 goal picker

**Files:** Create `apps/classbot/app/(student)/classbot/learn/[tutorId]/page.tsx`; Create `apps/classbot/components/classbot/curriculum-unit-card.tsx`.

**Interfaces — Consumes:** `getOfficialTutor` (mock), `useIsGoal`/`useSelfLearningStore` `addGoal`/`removeGoal`/`recordStudyToday` (T1), `LearningPath` (T2), `botSignature`.

- [ ] **Step 1: `curriculum-unit-card.tsx`** (`'use client'`) — one `TutorUnit`: order badge + title, a 목표 추가/추가됨 toggle (`useIsGoal(tutorId, unit.id)` → `addGoal`/`removeGoal`, `aria-pressed`, min-h-11, focus-visible), and the `<LearningPath tutorId={tutorId} unit={unit} />` below. Tokens/DS/no-hex.
- [ ] **Step 2: Learn page** (`learn/[tutorId]/page.tsx`, `'use client'`) — read `tutorId` from the route param (Next 16: the page receives `params` as a Promise — `const { tutorId } = use(params)` with React's `use`, OR a client `useParams()` from `next/navigation`; **READ another dynamic page e.g. `app/(student)/classbot/replay/[id]/page.tsx` to copy the exact Next-16 param pattern this repo uses**). Resolve `getOfficialTutor(tutorId)`; if missing → an `EmptyState`/notFound back to `/classbot`. Render: `BackLink` to `/classbot`, a `PageHeader` (tutor name + subject + tagline, `botSignature` accent), a `SectionHeading title="커리큘럼"`, and `tutor.curriculum.map(u => <CurriculumUnitCard tutorId={tutor.id} unit={u} />)`. On mount call `recordStudyToday()` once (a `useEffect(() => recordStudyToday(), [])` — the student showed up to study today). Palette-safe.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates` (build must generate the new dynamic route).
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): learn route — curriculum + 단원 goal picker — PR3 T3"`

---

### Task 4: Self-home — 오늘의 한 가지 + streak + active goals

**Files:** Modify `apps/classbot/components/classbot/self-home-placeholder.tsx`; Modify `apps/classbot/components/classbot/my-tutor-card.tsx`.

**Interfaces — Consumes:** `useTodayOneThing`/`useStreak`/`useGoals` (T1), `useEnrolledTutors` (existing).

- [ ] **Step 1: Self-home additions** — above the existing 내 튜터 section, add (only when there are enrolled tutors, to keep the cold-start clean):
  - a **streak badge** (`useStreak()` → "🔥 N일째" using the lemon accent; if count 0, hide or show "오늘 시작해요").
  - a **오늘의 한 가지** card (`useTodayOneThing()`): if non-null, a prominent card "오늘의 한 가지 — {tutor.name} · {unit.title}" linking to `/classbot/learn/${tutor.id}`; if null (no goals yet), a gentle "튜터의 단원을 목표로 추가해 보세요" prompt linking to the first enrolled tutor's learn route. Reuse hero/card patterns, tokens, no green/amber.
  Keep the existing hero + 내 튜터 grid below.
- [ ] **Step 2: `MyTutorCard` → learn route** — change its `<Link href>` from `/classbot/chat?bot=${tutor.id}` to **`/classbot/learn/${tutor.id}`** (the student now enters the tutor's curriculum to pick goals / start the path; the path's 개념 step still links to chat). Update the affordance label from "대화하기" to "학습하기". Keep the signature liner + a11y.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): self-home 오늘의 한 가지 + streak + goals; 내 튜터 → learn — PR3 T4"`

---

### Task 5: PR-3 verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — typecheck + lint + test (incl. T1 tests) + build (incl. the new `/classbot/learn/[tutorId]` route), all pass.
- [ ] **Step 2: Class mode + e2e unchanged** — against :3032: **color-palette 8/8** + chat + mobile-and-focus + wellness-intensity-range pass (mock student defaults to class; self surfaces additive).
- [ ] **Step 3: Self-flow smoke** — set `pullim-student-mode` → self (and ensure ≥1 enrollment via `pullim-self-learning`); `/classbot` shows the streak + 오늘의-한-가지 prompt; 내 튜터 card → `/classbot/learn/<id>` lists the curriculum 단원s; toggle 목표 추가 on one → it shows 추가됨 + the 오늘의 한 가지 card on `/classbot` now points to it; reload → goal + streak persist; the 개념 step links to `/classbot/chat?bot=<id>` (resolves the tutor). Screenshot the learn route + the self-home with streak/goal for the PR. No pageerror in the dev log; `/classbot/learn/<id>` palette-safe.
- [ ] **Step 4: Done** — fix any gap, re-run, commit `fix(dualmode): <what>`.

---

## Self-Review

**Spec coverage (§8.3 PR-3):** goals + streak + 오늘의 한 가지 store → T1; the path scaffold → T2; the goal/단원 picker (learn route) → T3; self-home goals+streak → T4; class+e2e unchanged → T5. ✅ The actual learning-loop wiring (step completion, quiz/check content) = PR-4 (the path steps are an explicit scaffold here, per §8.3).

**Placeholder scan:** T1 has full store logic + deterministic streak tests; T2/T3/T4 give component contracts + exact interfaces + "READ the existing dynamic route for the Next-16 `params` pattern" (the one repo-specific unknown). The 연습/점검 "준비 중" steps are an intentional PR-3 scaffold, not a TBD.

**Type consistency:** `LearningGoal`/`Streak`/`addGoal`/`removeGoal`/`recordStudyToday`/`useTodayOneThing`/`useStreak`/`useIsGoal`/`useTutorGoals` (T1) → consumed in T3 (unit card) + T4 (self-home). `LearningPath` (T2) → consumed in T3. `MyTutorCard` (PR-2) re-pointed in T4. `TutorUnit`/`OfficialTutor`/`getOfficialTutor` are the existing exports.

**Risk note:** (1) **Next-16 dynamic `params`** — T3 must use the repo's actual pattern (READ `replay/[id]/page.tsx`); a wrong `params` shape is the likeliest break. (2) **Streak day-diff** — the test pins consecutive/same/gap; the impl must compute calendar-day difference, not raw ms equality. (3) `recordStudyToday()` on learn-mount must be in a `useEffect` with a stable dep so it fires once per visit, not every render. (4) class mode unchanged — T5 Step 2 is the net.
