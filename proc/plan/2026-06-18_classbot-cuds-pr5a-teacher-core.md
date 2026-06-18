# CUDS PR-5a Teacher Home / Ops / Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the three teacher core surfaces (home, ops/classbot, builder) to CUDS variant-B — a shared `RadioCard` primitive for the builder's divergent radio grids, crisis `lemon→danger` semantics, dead-CTA + min-h cleanup, EmptyState adoption, deploy CTA to the footer — without tripping the color-palette guard on the 3 scanned teacher routes or losing the `수업 종료` mobile contract.

**Architecture:** A new `RadioCard`/`RadioCardGroup` primitive replaces ~5 hand-rolled radio-card grids in the builder. `crisis-intervention-panel` (used by teacher home) moves from lemon urgency to danger-red (+ AlertCard/ComingSoonButton). Ops collapses its min-h wrappers and routes its crisis aside through AlertCard. Each surface keeps blue/slate/lemon/danger only.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), Jest + RTL, Playwright (color-palette + mobile-and-focus).

## Global Constraints

**E2E contracts (prod-verify — MUST preserve):**
- **[수업 종료]** `/teacher/classbot` must render an element with the **exact** visible text `수업 종료` (no extra chars), visible at 375px. (It lives in `LiveBroadcastControls` — do NOT touch its label/visibility.) (mobile-and-focus:18-20)
- **[palette]** `/teacher`, `/teacher/classbot`, `/teacher/builder` emit **zero green (`pullim-success`) / amber (`pullim-warn`)** as any computed bg/text/border. **Lemon is ALLOWED** (passes the hue check); danger-red is ALLOWED. Introduce NO `pullim-success`/`pullim-warn`. (color-palette:40-47, 28-31)
- **[no pageerror]** none of the 3 teacher routes may throw on render. (color-palette:104)
- `/teacher` stays navigable + `localStorage.removeItem('pullim-assignments')` works. dispatch from `/teacher/assignment/new` still lands on `/teacher/classbot` (don't change that route path).

**Crisis lemon→danger is a DESIGN choice (not palette-forced):** lemon is palette-legal, but crisis should read as danger-red urgency. We do the remap; danger-red is palette-safe.

**Other:** tokens only, no hex; Korean typography. `RadioCard` keeps the `role="radio"` + `aria-checked` a11y. Work on branch `feat/cuds-pr5a-teacher-core` (created, stacked on PR-4c). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev`; verify with typecheck/build/gates; `git add` specific files only (never `-A`); the controller runs e2e.** Commit per task.

---

### Task 1: `RadioCard` + `RadioCardGroup` primitive

**Files:** Create `apps/classbot/components/classbot/radio-card.tsx` + `apps/classbot/components/classbot/__tests__/radio-card.test.tsx`.

**Interfaces:**
```ts
export interface RadioCardGroupProps { label?: string; ariaLabel: string; cols?: 1 | 2 | 3; layout?: 'grid' | 'list'; children: React.ReactNode; className?: string }
export interface RadioCardProps {
  active: boolean; onSelect: () => void;
  title: React.ReactNode; description?: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;     // LucideIcon → rendered; ReactNode → custom slot (mono badge / avatar)
  trailing?: React.ReactNode;              // Shield / 샘플 button / play
  size?: 'sm' | 'md'; className?: string;
}
```
Behavior: `RadioCardGroup` renders `role="radiogroup"` `aria-label={ariaLabel}` with optional `label`; `layout='grid'` → `grid gap-2 grid-cols-${cols}` (cols 2→`grid-cols-2`, 3→`grid-cols-2 sm:grid-cols-3`), `layout='list'` → `space-y-1.5`. `RadioCard` renders a `<button type="button" role="radio" aria-checked={active} onClick={onSelect}>` with ONE canonical style: `rounded-xl border-2 p-3 text-left transition-colors`, active=`border-pullim-blue-500 bg-pullim-blue-50`, inactive=`border-pullim-slate-200 hover:border-pullim-slate-400`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400`; icon (LucideIcon `h-5 w-5` or the ReactNode slot) + title (`text-sm font-bold`) + optional description (`text-xs text-pullim-slate-500`) + optional `trailing` (right-aligned). No green/amber. `size='sm'` → `p-2.5`, no description emphasis.

- [ ] **Step 1: Write the failing test** (`radio-card.test.tsx`): RadioCardGroup renders `role="radiogroup"` with the ariaLabel; RadioCard renders `role="radio"` with `aria-checked` reflecting `active`, fires `onSelect` on click, renders title/description/trailing.
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- radio-card`).
- [ ] **Step 3: Implement `radio-card.tsx`** per the interface.
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(ui): RadioCard/RadioCardGroup primitive (role=radio a11y, canonical style)"`

---

### Task 2: `crisis-intervention-panel` — lemon → danger (+ AlertCard / ComingSoonButton)

**Files:** Modify `apps/classbot/components/classbot/crisis-intervention-panel.tsx`.

- [ ] **Step 1: Recolor lemon → danger** — eyebrow `text-pullim-lemon` (~:20) → `text-pullim-danger`; count badge `bg-pullim-lemon` (~:26) → `bg-pullim-danger text-white` (or `bg-pullim-danger-bg text-pullim-danger`); `Heart`/AlertTriangle `text-pullim-lemon` (~:51,124) → `text-pullim-danger`; the modal summary `bg-pullim-lemon/20 border-pullim-lemon` (~:122) and Metric alert cells `bg-pullim-lemon/20 border-pullim-lemon` (~:192) → `bg-pullim-danger/5 border-pullim-danger/30`. **No `pullim-success`/`pullim-warn`.**
- [ ] **Step 2: AlertCard + ComingSoonButton** — wrap the modal 위기 신호 summary box (~:120-128) in `<AlertCard tone="danger" icon={AlertTriangle} title="위기 신호 알림">…</AlertCard>` (import AlertCard). Replace the disabled Wee/CTA button (~:63) with `<ComingSoonButton note="Wee센터 연계">…</ComingSoonButton>` (import ComingSoonButton). Keep `Link`/router usage where it navigates.
- [ ] **Step 2.5: empty alertStudents** — if the panel can have zero alert students, render `<EmptyState tone="plain" size="sm" title="현재 위기 신호 없음" />` (import EmptyState) instead of an empty list.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'pullim-lemon' crisis-intervention-panel.tsx` should drop to 0 (or only intentional non-crisis lemon if any); `pullim-success`/`pullim-warn` == 0.
- [ ] **Step 4: Commit** — `git commit -m "feat(crisis): lemon→danger semantics + AlertCard/ComingSoonButton/EmptyState"`

---

### Task 3: Teacher HOME — dead-hero + EmptyState + lemon→blue chrome

**Files:** Modify `apps/classbot/app/(teacher)/teacher/page.tsx`.

- [ ] **Step 1: Remove unused imports** — drop `AlertTriangle`, `Heart` (line 4) if unused after edits.
- [ ] **Step 2: Kill the dead disabled hero** — the disabled `새 클래스봇` hero button (~:30-37, raw `opacity-70`, links nowhere) → a real `<Link href="/teacher/builder">` (the builder route) OR `<ComingSoonButton note="새 클래스봇">새 클래스봇</ComingSoonButton>` if not yet live. Prefer the real Link to the builder. Keep the live 라이브 수업 입장 Link beside it.
- [ ] **Step 3: EmptyState** — the recent-questions empty (~:143-164) and upcoming-lessons empty (~:174-200) cases → `<EmptyState tone="plain" size="sm" title="…" />` (import EmptyState).
- [ ] **Step 4: lemon→blue chrome (palette + de-emphasis)** — the 운영 중 봇 gradient (`via-pullim-danger to-pullim-lemon`, ~:63) → `via-pullim-blue-700 to-pullim-danger`; the shared neutral-status chip `bg-pullim-lemon` (~:153) → `bg-pullim-blue-100 text-pullim-blue-700`. (Crisis panel is recolored in Task 2 — it now outweighs the LIVE bot via danger-red.) No `pullim-success`/`pullim-warn`.
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'pullim-success\|pullim-warn' teacher/page.tsx` == 0.
- [ ] **Step 6: Commit** — `git commit -m "feat(teacher-home): real builder hero + EmptyState + lemon→blue chrome"`

---

### Task 4: Teacher OPS (classbot) — min-h cleanup + crisis AlertCard + EmptyState (preserve 수업 종료)

**Files:** Modify `apps/classbot/app/(teacher)/teacher/classbot/page.tsx`.

- [ ] **Step 1: Remove forced whitespace** — drop the `min-h-[480px]` wrappers (~:52, :55) on the StudentRoster / LiveFeedPanel panes; let the grid stretch drive height (StudentRoster is already `flex h-full flex-col`).
- [ ] **Step 2: Crisis aside → AlertCard danger** — replace the bespoke dark lemon 위기 신호 aside (~:60-75: `bg-pullim-slate-900`, `text-pullim-lemon` eyebrow + AlertTriangle, hardcoded student list, disabled lemon CTA) with `<AlertCard tone="danger" icon={AlertTriangle} title="위기 신호 알림">{list}<ComingSoonButton note="Wee센터 연계">…</ComingSoonButton></AlertCard>`. (Import AlertCard, ComingSoonButton.)
- [ ] **Step 3: EmptyState + re-fire ComingSoonButton** — the hand-rolled dispatched-empty block (~:124-130) → `<EmptyState icon={Inbox} title="아직 발사한 과제가 없어요" action={{ href: '/teacher/assignment/new', label: '새 과제 발사' }} />`; the disabled re-fire button (~:202-211) → `<ComingSoonButton icon={Send} note="같은 과제 재발사">다시 발사</ComingSoonButton>`.
- [ ] **Step 4: PRESERVE `수업 종료`** — do NOT touch `LiveBroadcastControls` (~:36) or its `수업 종료` button — the mobile e2e needs the exact text visible at 375px. (Optional ContextRail for the 3-pane → only if it doesn't risk the layout; recommend NOT forcing it this pass — keep the grid.)
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c '수업 종료'` (the page renders LiveBroadcastControls which contains it — confirm the page still imports/renders it); `grep -c 'pullim-success\|pullim-warn' teacher/classbot/page.tsx` == 0.
- [ ] **Step 6: Commit** — `git commit -m "feat(teacher-ops): min-h cleanup + crisis AlertCard(danger) + EmptyState (수업 종료 preserved)"`

---

### Task 5: Teacher BUILDER — RadioCard migration + min-h + deploy-CTA-to-footer

**Files:** Modify `apps/classbot/app/(teacher)/teacher/builder/page.tsx` + its step components (`step-content.tsx`, `step-indicator.tsx`).

- [ ] **Step 1: Migrate the radio grids to RadioCard** — replace the 5+ divergent hand-rolled radio-card grids with `RadioCardGroup` + `RadioCard` (Task 1): Step1 tone (cols=3, icon), Step2 voiceMode (cols=2, sm, no-desc), Step2 voicePreset (list, avatar icon, `trailing`=샘플 button), Step4 style (cols=2, icon), Step5 scope (list, mono-badge icon slot, `trailing`=Shield), Step6 feedback (cols=3, no-icon). Each migration preserves the option's `value`/`onSelect`/active logic and the `role="radio"`+`aria-checked` a11y (now from RadioCard).
- [ ] **Step 2: Fix the min-h jump** — the step body `min-h-[280px]` (~:100) → remove it (or `min-h-[40vh]`) and cap the content column `max-w-2xl mx-auto` for a stable width (no jump between short Step2 and tall Step6/8).
- [ ] **Step 3: Mobile step indicator** — `StepIndicator` (`step-indicator.tsx:25`, `grid-cols-4 sm:grid-cols-8`, 10px truncated labels) → on mobile render a compact `Step N / 8` + label + a slim 8-segment track; keep the full labeled grid at `sm+`.
- [ ] **Step 4: Deploy CTA → footer** — move the `배포하기` button out of the Step8 inner 최종 확인 card into the wizard footer (~:132-145): on step 8 the footer's 다음 slot becomes `배포하기` (lift the deploy action to the page via a callback). The dark 최종 확인 summary stays in-step (review surface); only the button relocates.
- [ ] **Step 5: Deploy card color** — the dark 최종 확인 card eyebrow `text-pullim-lemon` (`step-content.tsx:636`) → `text-pullim-blue-300` (legible on slate-900). KEEP the `배포하기` deploy button as the brand lemon CTA (lemon is palette-legal and it's the single brand deploy action) OR recolor to `pullim-blue` — pick one; recolor every OTHER lemon in the builder to blue/danger. No `pullim-success`/`pullim-warn`.
- [ ] **Step 6: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'pullim-success\|pullim-warn'` across builder/page.tsx + step-content.tsx == 0. Confirm `role="radio"`/`aria-checked` still present (now via RadioCard) — `grep -rc 'role="radio"\|aria-checked' step-content.tsx` (the RadioCards render them).
- [ ] **Step 7: Commit** — `git commit -m "feat(teacher-builder): RadioCard migration + min-h fix + deploy CTA→footer + lemon cleanup"`

---

### Task 6: PR-5a verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: Palette grep** — `grep -rc 'pullim-success\|pullim-warn'` across `teacher/page.tsx`, `teacher/classbot/page.tsx`, `teacher/builder/page.tsx`, `step-content.tsx`, `crisis-intervention-panel.tsx` → 0 each.
- [ ] **Step 3: color-palette + mobile e2e** against live :3032:
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts tests/e2e/mobile-and-focus.spec.ts --reporter=line
```
- **color-palette MUST pass** all 8 routes (teacher home/classbot/builder now clean of green/amber + no pageerror).
- **mobile-and-focus `수업 종료` test (line 15) MUST pass** (the ops `수업 종료` CTA visible at 375px). Other mobile-and-focus failures are the documented STALE dispatch specs (`:77` etc.) — not chased.
- [ ] **Step 4: Boot smoke** — `/teacher`, `/teacher/classbot`, `/teacher/builder` → 200, zero runtime errors in the dev log.
- [ ] **Step 5: Done** — fix any gap, re-run, commit `fix(teacher): <what>`.

---

## Self-Review

**Spec coverage (design §6.4 teacher):** RadioCard → T1+T5; crisis lemon→danger → T2 (+T3/T4 adoption); home dead-hero+EmptyState → T3; ops min-h+crisis+EmptyState → T4; builder RadioCard+min-h+deploy-footer → T5. ✅ Deferred to **PR-5b**: grading (page+detail confidence-bug), reports (detail empty-col), replay detail, assignment-form, the dark grading action-slab. KpiStat/ComingSoonButton on home already done (PR-2b).

**Placeholder scan:** every task has file:line + the primitive + the palette rule. No TBD.

**Type consistency:** `RadioCard`/`RadioCardGroup` (T1) consumed in T5; `AlertCard`/`ComingSoonButton`/`EmptyState` props match PR-2b/4b.

**Risk note:** the load-bearing contracts are `수업 종료` (T4 leaves LiveBroadcastControls untouched) and the 3-route palette guard (no green/amber; crisis→danger is red-allowed; deploy-lemon is palette-legal). T6 runs color-palette + the mobile 수업 종료 test as the safety net. The builder deploy-CTA-to-footer (T5 Step 4) is the trickiest (lift state via callback) — verify the step-8 footer renders `배포하기` and the wizard still advances.
