# CUDS PR-4b Student Assignment Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the student assignment cluster (list, detail, solve, result + overview header) to CUDS variant-B — ContextRail two-column + sticky CTA on detail/result, card-grid list, primitive adoption (EmptyState/KpiStat/ScoreDisplay), one accent axis per surface, a shared humanized question-type map — while preserving the API guard chains, the solve `:77` radio a11y, and all testids.

**Architecture:** A shared `questionTypeMeta` map replaces the raw `mc/essay/short/numeric` enum across detail/solve/result. Detail & result wrap their body in the `ContextRail` primitive (`lg:grid-cols-[1fr_320px]` + sticky rail / mobile sticky-bottom CTA). The list caps to a reading column and tiles cards within bot groups. API-backed pages (list, detail) keep their `isLoading/isUnauthenticated/isNotFound/isError` branches; mock pages (solve, result) stay on the local store.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), Playwright (color-palette + mobile-and-focus).

## Global Constraints

**E2E contracts (prod-verify — MUST preserve):**
- **[B] Solve a11y (`mobile-and-focus:77`):** the MCQ widget keeps `role="radiogroup"` + `aria-label="객관식 선택지"` (exact) + `role="radio"` children with `aria-checked` false→true on click. (solve-workspace.tsx ~143-166.) Do NOT alter these roles/labels.
- **Testids:** `assignment-start-cta` (detail, navigates to `/classbot/assignment/as_user_<id>/solve`), `result-score` (result), and the list card `<Link href="/classbot/assignment/${a.id}">` href shape — all preserved.
- **API guard chains:** list `isUnauthenticated→ReadLoginGate`, `isError→ReadErrorState`, `isLoading||!data→Skeleton` (in that order); detail adds `isNotFound→notFound card`. KEEP all branches; `ReadLoginGate`/`ReadErrorState` already compose `EmptyState` — do NOT replace them.
- **[A] color-palette on `/classbot/assignment` (LIST):** no forbidden green (`#12B26B`-style) / amber (`#F59E0B`-style) in the rendered chrome. The list is login-gated in the e2e (no cards render), so the card state colors (green complete / amber urgent from `assignment-state.ts`) are NOT hit — but keep the **non-card chrome blue-safe**: `KpiStat` `success` tone maps to `text-pullim-blue-500` (blue, fine); `EmptyState` neutral (slate, fine); skeleton/headers slate/blue. Introduce no green/amber outside the (gated) state cards.
- Zero pageerror on the assignment route (color-palette:104).
- body `word-break: keep-all` untouched (global).

**STALE (do NOT chase):** `assignment-dispatch.spec.ts`, `feedback-loop.spec.ts` — broken by the Phase7 dispatch↔list disconnect (documented in memory). Do not modify the redesign to satisfy them.

**Other:** tokens only; Korean typography; collapse `text-[Npx]` one-offs. Work on branch `feat/cuds-pr4b-assignment` (created, stacked on PR-4a). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev`; verify with typecheck/build/gates; the controller runs e2e against :3032.** Commit per task.

---

### Task 1: Shared `questionTypeMeta` map

**Files:** Create `apps/classbot/lib/question-type.ts`.

**Interfaces:** `export const questionTypeMeta: Record<'mc'|'essay'|'short'|'numeric', { label: string; icon: LucideIcon }>` = `{ mc: {label:'객관식', icon: ListChecks}, essay: {label:'서술형', icon: PenLine}, short: {label:'단답', icon: Type}, numeric: {label:'수치', icon: Hash} }`. Plus `export function questionTypeLabel(t: string): string` returning the Korean label (fallback to the raw value).

- [ ] **Step 1: Write the failing test** (`apps/classbot/lib/__tests__/question-type.test.ts`): assert `questionTypeMeta.mc.label === '객관식'`, `questionTypeLabel('essay') === '서술형'`, `questionTypeLabel('unknown') === 'unknown'`, and each entry has an `icon`.
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- question-type`).
- [ ] **Step 3: Implement `question-type.ts`** per the interface (import the 4 Lucide icons).
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(assignment): shared questionTypeMeta map (mc/essay/short/numeric → Korean + icon)"`

---

### Task 2: Assignment LIST — reading column + card grid + KpiStat strip + one accent axis

**Files:** Modify `apps/classbot/app/(student)/classbot/assignment/page.tsx`.

- [ ] **Step 1: Reading-column cap** — root `<div className="space-y-4">` (~:52) → `<div className="mx-auto max-w-3xl space-y-4">`. (Keep `BackLink` at top.)
- [ ] **Step 2: Stat strip → KpiStatBar** — replace the free-text `PageHeader.description` stat string (~:116, `진행 중 N건 · 대기 N건 · …`) with a `<KpiStatBar cols={3}>` placed right after `<PageHeader>` (keep the PageHeader title): `<KpiStat label="진행 중" value={`${inProgress}건`} tone="accent" />`, `<KpiStat label="대기" value={`${todo}건`} tone="default" />`, `<KpiStat label="완료" value={`${completed}/${totalQuestions}문항`} tone="success" />`. (KpiStat `success`=blue-500 — palette-safe.) Move PageHeader description to a short calm subtitle or drop it.
- [ ] **Step 3: Empty block → EmptyState** — replace the hand-rolled empty block (~:121-130) with `<EmptyState icon={Inbox} title="아직 받은 과제가 없어요" description="선생님이 새 과제를 발사하면 여기에 표시돼요." />`.
- [ ] **Step 4: Card grid in bot groups** — in `BotGroupSection` (~:206), change the cards `<ul className="space-y-2">` → `<ul className="grid gap-2 sm:grid-cols-2">`; give each `AssignmentCard` `<Link>` `h-full` so tiles are equal height. Keep bot groups stacked.
- [ ] **Step 5: One accent axis** — in `AssignmentCard` (~:225-226), REMOVE the card's `border-l-[4px]` + `style={{ borderLeftColor: visual.linerHex }}` (the 2nd accent). The card becomes `bg-card rounded-2xl border` (no colored left-border). STATE stays encoded by the existing `visual.semanticLabel` chip (~:262) + `visual.progressClass` bar (~:255). The bot-group keeps its bot-signature left-border/avatar (the single hue per group). Preserve the card `<Link href="/classbot/assignment/${a.id}">`.
- [ ] **Step 6: Verify (build + guards intact)** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm the guard chain survives: `grep -c 'ReadLoginGate\|ReadErrorState\|Skeleton'` (≥1 each) and `grep -c '/classbot/assignment/\${a.id}\|/classbot/assignment/${'` for the card href.
- [ ] **Step 7: Commit** — `git commit -m "feat(assignment-list): reading column + card grid + KpiStat strip + single accent axis"`

---

### Task 3: Assignment DETAIL — ContextRail + sticky CTA + EmptyState + type labels

**Files:** Modify `apps/classbot/app/(student)/classbot/assignment/[id]/page.tsx`.

- [ ] **Step 1: NotFound → EmptyState** — replace `AssignmentNotFoundCard` (~:132-148) with `<EmptyState icon={Inbox} title="과제를 찾을 수 없어요" description="받은 과제 목록에서 다시 확인해 주세요." action={{ href: '/classbot/assignment', label: '받은 과제로' }} />`. Keep the `isNotFound` branch calling it.
- [ ] **Step 2: ContextRail + sticky CTA** — wrap the body (after the `back` link) in `<ContextRail railWidth="md" stickyRail>`. Primary (children): `AssignmentOverviewHeader`, exam `AlertCard` (already adopted — keep), 문항 구성 section. Rail (`rail={…}`): the CTA `<Link data-testid="assignment-start-cta" …>` (preserve testid + `ctaHref`/`ctaLabel` + exam color branch) + `FlywheelNote`. Give the CTA wrapper `max-lg:sticky max-lg:bottom-2 max-lg:z-10` so it's bottom-sticky on mobile (rail collapses to single column) and rail-sticky on desktop.
- [ ] **Step 3: Question-type label** — in 문항 구성 (~:100), replace the raw `<span uppercase>{q.type}</span>` with `questionTypeMeta` from `@/lib/question-type`: the friendly Korean label + the icon (`h-3 w-3`). Import the map.
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'assignment-start-cta'` (==1) and the guard chain (`isUnauthenticated/isNotFound/isError`).
- [ ] **Step 5: Commit** — `git commit -m "feat(assignment-detail): ContextRail + sticky CTA + EmptyState notfound + type labels"`

---

### Task 4: Overview header — KpiStat meta + humanized values

**Files:** Modify `apps/classbot/components/classbot/assignment-overview-header.tsx`.

- [ ] **Step 1: Meta tiles → KpiStatBar** — replace the bespoke `Meta` tiles + `grid-cols-3` (~:47-51, 문항/난이도/D-day) with `<KpiStatBar cols={3}>` + three `<KpiStat>`: 문항 (value=`${questionCount}문항`, default), 난이도 (value=난이도 text, default), D-day (value=dDay, `tone={isUrgent ? 'alert' : 'default'}`). Delete the local `Meta` helper if now unused.
- [ ] **Step 2: Humanize** — KpiStat value is `font-mono`; that's fine for 문항 (numeric) but 난이도/D-day are words. Either accept the mono (it's the established idiom) OR, to humanize per the audit, render 난이도/D-day in a small non-mono inline pair below the 문항 KpiStat instead of mono tiles. Choose the cleaner of the two; keep `tone="alert"` for urgent D-day (reproduces the old `text-pullim-danger`). Keep `BotNote` (already adopted).
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 4: Commit** — `git commit -m "feat(assignment-header): KpiStat meta tiles + humanized 난이도/D-day"`

---

### Task 5: Solve — reading column + type label (PRESERVE radio a11y)

**Files:** Modify `apps/classbot/app/(student)/classbot/assignment/[id]/solve/solve-workspace.tsx`.

- [ ] **Step 1: Reading-column cap** — root `<div className="space-y-3">` (~:92) → `<div className="mx-auto max-w-2xl space-y-3">`.
- [ ] **Step 2: Question-type label** — replace the raw `<span uppercase>{q.type}</span>` (~:132) with `questionTypeMeta` friendly label + icon from `@/lib/question-type`.
- [ ] **Step 3: DO NOT TOUCH the MCQ a11y** — the `role="radiogroup" aria-label="객관식 선택지"` container (~:143) and `role="radio" aria-checked` options (~:143-166) MUST stay exactly. The sticky bottom action bar (~:195) stays. Confirm via grep after editing: `grep -c 'role="radiogroup"' && grep -c 'aria-label="객관식 선택지"' && grep -c 'role="radio"' && grep -c 'aria-checked'` (each ≥1).
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates` + the grep above.
- [ ] **Step 5: Commit** — `git commit -m "feat(assignment-solve): reading column + type label (radio a11y preserved)"`

---

### Task 6: Result — ContextRail + sticky rail + ScoreDisplay (preserve result-score)

**Files:** Modify `apps/classbot/app/(student)/classbot/assignment/[id]/result/page.tsx`.

- [ ] **Step 1: Score blocks → ScoreDisplay** — replace the hand-rolled 자동 채점 mono block (~:70-72) with `<ScoreDisplay score={autoGraded} max={questions.length} size="xl" tone="fixed-accent" />` and the 내 점수 mono block (~:78-87) with `<ScoreDisplay score={submission.scorePercent} max={100} size="xl" tone="threshold" />`. **Preserve `data-testid="result-score"`** — put it on the wrapper element around the 내 점수 ScoreDisplay.
- [ ] **Step 2: ContextRail** — wrap the body (after `back` + `PageHeader`) in `<ContextRail railWidth="md" stickyRail>`. Primary (children): 봇 한 마디 (~:104), 오답 한눈에 (~:125). Rail: the score card (exam dark variant OR non-exam ScoreDisplay block) + the two next-action `<Link>`s (~:150-169) + `FlywheelNote`.
- [ ] **Step 3: Type labels in 오답 한눈에** — surface `questionTypeMeta` labels in the wrong-answer rows (~:129-144) where helpful; keep mock guard logic. (Keep the `as_user_` loading/notFound guards.)
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'result-score'` (==1).
- [ ] **Step 5: Commit** — `git commit -m "feat(assignment-result): ContextRail + ScoreDisplay (result-score preserved)"`

---

### Task 7: PR-4b verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: Contract grep** — solve a11y (`role="radiogroup"`, `aria-label="객관식 선택지"`, `role="radio"`, `aria-checked` each ≥1 in solve-workspace.tsx); `assignment-start-cta`==1 (detail); `result-score`==1 (result); list guard chain present.
- [ ] **Step 3: color-palette + solve-a11y e2e** against live :3032:
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts --reporter=line
```
color-palette MUST pass (no green/amber on the assignment list chrome; zero pageerror). (`mobile-and-focus:77` will still fail at the LIST→DETAIL step due to the Phase7 dispatch↔list disconnect — that's the documented stale spec, NOT a PR-4b regression; do not chase it. But DO confirm the solve a11y markup is intact via the grep in Step 2, since a future BE-wired run depends on it.)
- [ ] **Step 4: Boot smoke** — against :3032: `/classbot/assignment` (200, login gate or list), `/classbot/assignment/as_user_x` and a mock detail/result if reachable → no pageerror. Verify visually on a mock assignment id if one exists.
- [ ] **Step 5: Done** — fix any gap, re-run, commit `fix(assignment): <what>`.

---

## Self-Review

**Spec coverage (design §6.2):** detail/result 2-col+sticky rail → T3/T6 (ContextRail); list card grid + reading col → T2; EmptyState/KpiStat/ScoreDisplay → T2/T3/T4/T6; sticky CTA → T3; humanize mono meta → T4; type enum→Korean → T1 (+ T3/T5/T6 adoption); one accent axis → T2/T4. ✅ Preserved: API guard chains, solve radio a11y, testids.

**Placeholder scan:** every task has file:line + concrete primitive + props. No TBD.

**Type consistency:** `questionTypeMeta` (T1) consumed in T3/T5/T6; `ContextRail`/`KpiStat`/`KpiStatBar`/`EmptyState`/`ScoreDisplay` props match PR-2b. `result-score`/`assignment-start-cta` testids preserved.

**Risk note:** the load-bearing contract is the solve radio a11y (T5 preserves it exactly + greps) and the testids. color-palette stays green/amber-free in the (login-gated) list chrome. The stale dispatch specs are explicitly not chased.
