# CUDS PR-4c Student Wellness / Report / Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the student wellness, report, and replay-list surfaces to CUDS variant-B — ContextRail two-column on wellness + report, a single replay hero, shadcn Textarea on check-in, EmptyState adoption — without tripping the color-palette green/amber guard or breaking the wellness-intensity-range check-in contract.

**Architecture:** wellness + me/report wrap their bodies in the `ContextRail` primitive (narrative/main left, secondary cards + KPI/CTA in the rail). check-in swaps its hand-rolled textarea for shadcn `Textarea` (the EmotionEmojiPicker + dual-thumb Slider are UNTOUCHED). replay collapses two competing gradient heroes to one and turns a dev-placeholder string into a blue badge. The wellbeing gauge's `scoreTone` is NOT changed.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), Playwright (color-palette + wellness-intensity-range).

## Global Constraints

**color-palette (scans `/classbot/wellness` + `/classbot/replay` — NOT `/classbot/me/report`):**
- Forbidden: solid green (`#12B26B`/`pullim-success` → rgb(0,153,101)) and amber (`#F59E0B`/`pullim-warn` → rgb(208,135,0)) as ANY bg/text/border. (`*-bg` chip backgrounds are near-white and pass; danger/red, lemon, blue, slate pass.)
- **DO NOT change `WellbeingGauge.scoreTone`.** It passes today only because the demo persona (s1 서연) score=78 → blue band. **DO NOT** (a) auto-expand the gauge's `ComponentBreakdown` (its 82/96 components are ≥81 = green; it's collapsed `grid-rows-[0fr]` overflow-hidden by default — keep `open=false` default), or (b) raise the persona/component scores, or (c) introduce ANY new `bg-pullim-success`/`text-pullim-success`/`bg-pullim-warn`/`text-pullim-warn` on wellness/replay. New chips/badges (e.g. replay "준비 중") use **blue/slate**.
- Zero pageerror on `/classbot/wellness` + `/classbot/replay`.

**wellness-intensity-range (`/classbot/wellness/check-in`):** preserve verbatim — `getByTestId('intensity-range-block')` (count 0 before a mood is picked, visible after); a `role="radio"` with name `/좋아/`; text `강도 범위 (선택)`; `getByTestId('intensity-range-readout')` exact `2~4/5`; two `input[type="range"]` (values `2` and `4`); `getByRole('group', { name: '감정 강도 범위' })`. **Do NOT touch `EmotionEmojiPicker` or the Slider markup** — only the free-text textarea changes.

**mobile-and-focus:** nothing on wellness/report; the replay link contract is on the home (already satisfied). body `word-break: keep-all` global — untouched.

**Other:** tokens only; Korean typography; collapse `text-[Npx]` one-offs. Mock flows preserved (`resolveRosterMe`, `getCheckInsForStudent`, `hasTodayCheckIn`, `getWellnessBotComment`, `getSentReplays`, `useReplayStore`, `reports`, `getWellbeingTrend`). Work on branch `feat/cuds-pr4c-wellness-replay` (created, stacked on PR-4b). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev`; verify with typecheck/build/gates; commit only the specific files (`git add <path>`, never `git add -A`); the controller runs e2e.** Commit per task.

---

### Task 1: Wellness — ContextRail (CTA hero + gauge) + EmptyState

**Files:** Modify `apps/classbot/app/(student)/classbot/wellness/page.tsx`.

**Interfaces:** consumes `ContextRail` (`@/components/shell/context-rail`), `EmptyState` (`@/components/classbot/empty-state`). Keep `BackLink`, `WellbeingGauge`, the bot-comment IIFE, mock helpers.

- [ ] **Step 1: ContextRail layout** — wrap the body (after `BackLink` + `PageHeader`) in `<ContextRail railWidth="md" stickyRail rail={<RAIL>}>{MAIN}</ContextRail>`:
  - MAIN (children): the check-in CTA `<Link>` promoted to a hero, then on `lg` place the `<WellbeingGauge>` BESIDE it via `<div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">` wrapping CTA + gauge, then the weekly-mood section.
  - RAIL: the bot-comment signature card (the IIFE) + the 곁에있어요 support card (conditional) + the me/report entry `<Link>` as quick-links.
  - `BackLink` + `PageHeader` stay full-width ABOVE; `FlywheelNote` below the ContextRail.
- [ ] **Step 2: EmptyState** — replace the weekly-mood empty `<p>` (the "아직 기록이 없어요" line) with `<EmptyState tone="plain" title="아직 기록이 없어요" size="sm" />`.
- [ ] **Step 3: Do NOT touch the gauge or its colors** — `<WellbeingGauge>` is rendered as-is (no props changing its score/breakdown-open). No new green/amber. The 곁에있어요 card (slate-900 + lemon) stays. The bot-comment card keeps its `botSignature` colors (do NOT swap to BotNote — it hardcodes blue and would flatten the per-bot signature).
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm no new green/amber introduced: `grep -c 'pullim-success\|pullim-warn' apps/classbot/app/(student)/classbot/wellness/page.tsx` (should be 0 — the page itself shouldn't reference them).
- [ ] **Step 5: Commit** — `git commit -m "feat(wellness): ContextRail (CTA hero + gauge) + EmptyState; palette-safe"`

---

### Task 2: Check-in — shadcn Textarea (preserve the intensity-range contract)

**Files:** Modify `apps/classbot/app/(student)/classbot/wellness/check-in/check-in-form.tsx`.

**Interfaces:** consumes `Textarea` (`@/components/ui/textarea`). Keep `EmotionEmojiPicker` + everything else.

- [ ] **Step 1: Swap the hand-rolled textarea** — replace the raw `<textarea>` (the free-text input with manual border/focus classes + 200-char counter) with shadcn `<Textarea value={…} onChange={e => setText(e.target.value.slice(0, 200))} rows={…} placeholder={…} className="mt-2 text-sm leading-relaxed" />`. Keep the 200-char counter `<div>` below it. Drop the hand-rolled `border-pullim-slate-200 focus:…` classes (Textarea ships its own border + focus ring).
- [ ] **Step 2: DO NOT TOUCH** the `EmotionEmojiPicker` section, the mood-radio markup, the dual-thumb Slider, the `intensity-range-block`/`intensity-range-readout` testids, the `감정 강도 범위` group, or the `강도 범위 (선택)` / `2~4/5` text. (These live in `EmotionEmojiPicker` / the form — verify they're unchanged.) Optionally swap the bespoke back `<Link>` (top of the form branch) to `<BackLink href="/classbot/wellness">` for parity.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm the contract markers survive (in this file OR emotion-emoji-picker.tsx): `intensity-range-block`, `intensity-range-readout`, `감정 강도 범위`, `강도 범위 (선택)`, `2~4/5` — note which file each lives in; do not remove any.
- [ ] **Step 4: Commit** — `git commit -m "feat(check-in): shadcn Textarea for free-text (intensity-range contract untouched)"`

---

### Task 3: Report — ContextRail (narrative + KPI/CTA rail) + BackLink

**Files:** Modify `apps/classbot/app/(student)/classbot/me/report/page.tsx`.

**Interfaces:** consumes `ContextRail`, `BackLink`. Keep `WellbeingGauge`, `KpiTrendCard`, mock `reports`.

- [ ] **Step 1: BackLink** — swap the bespoke back `<Link>` (ArrowLeft + label) for `<BackLink href="/classbot/wellness">웰빙 허브</BackLink>` (read the current label; keep its destination).
- [ ] **Step 2: ContextRail layout** — wrap the body (after `BackLink` + `PageHeader`) in `<ContextRail railWidth="md" stickyRail rail={<RAIL>}>{MAIN}</ContextRail>`:
  - MAIN: `<WellbeingGauge audience="student-self">` + the 잘한점/신경쓸점 pair.
  - RAIL: the KPI section (`KpiTrendCard` mapping — keep it, the trend arrows are load-bearing; do NOT swap to KpiStat) + the teacher 1:1 message card + the 다음 주 도전 CTA.
  - `BackLink` + `PageHeader` full-width above; `FlywheelNote` below.
- [ ] **Step 3: Color — keep blue/slate** — the 잘한점 card STAYS `bg-pullim-blue-50 text-pullim-blue-700` (do NOT upgrade to success-bg/green); 신경쓸점 STAYS `bg-pullim-slate-50 text-pullim-slate-700` (do NOT make it warn/amber). (me/report isn't color-palette-scanned, but the shared `WellbeingGauge` can render green here harmlessly — still, keep the page's own chrome blue/slate for consistency.)
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep `grep -c 'pullim-success\|pullim-warn' me/report/page.tsx` (0). Confirm `KpiTrendCard` still used.
- [ ] **Step 5: Commit** — `git commit -m "feat(report): ContextRail narrative + KPI/CTA rail + BackLink (blue/slate kept)"`

---

### Task 4: Replay list — one hero + placeholder badge + EmptyState

**Files:** Modify `apps/classbot/app/(student)/classbot/replay/page.tsx`.

**Interfaces:** consumes `EmptyState`. Keep `FilterPillButtons` (already adopted), `ReplayRow`, `HeroStat`/`Mini` (local, on gradient surfaces).

- [ ] **Step 1: Collapse the two gradient heroes to one** — today `ContinueWatching` (slate-900→blue-900) AND `LatestHero` (blue-700→blue-500) both render when `inProgress.id !== latest.id`. Change so: if `inProgress` exists → render ONLY `ContinueWatching` as the single hero, and surface `latest` as a highlighted `ReplayRow` (or a slim non-gradient banner) within the 전체 수업 list — NOT a second gradient hero; if no `inProgress` → `LatestHero` is the single hero. Remove the double-hero branch.
- [ ] **Step 2: Placeholder → badge** — the 방금 도착 row renders a raw dev-note string ("…상세 player는 v1 backend 후 제공"). Replace that dev half with a small inline blue badge `<span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">준비 중</span>` (BLUE — palette-safe on the scanned replay route), keeping the user-facing "방금 발송" message as text.
- [ ] **Step 3: EmptyState** — replace the hand-rolled empty `<p>` ("이 봇의 리플레이가 아직 없어요") with `<EmptyState icon={History} title="이 봇의 리플레이가 아직 없어요" tone="plain" />` (import History from lucide-react if not present; or `tone="neutral"`).
- [ ] **Step 4: Color — replay IS scanned: no green/amber** — confirm the status chips (안 봄 / 시청 등) stay blue/slate/lemon/danger; the new 준비 중 badge is blue. `grep -c 'pullim-success\|pullim-warn' replay/page.tsx` must be 0.
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(replay): single hero + 준비 중 badge + EmptyState (palette-safe)"`

---

### Task 5: PR-4c verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: Palette grep** — `grep -rc 'pullim-success\|pullim-warn'` across `wellness/page.tsx`, `me/report/page.tsx`, `replay/page.tsx` → 0 each (no new green/amber on these surfaces).
- [ ] **Step 3: color-palette + wellness-intensity-range e2e** against live :3032:
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts tests/e2e/wellness-intensity-range.spec.ts --reporter=line
```
Both MUST pass — color-palette confirms no green/amber leaked onto wellness/replay (and the gauge breakdown stays collapsed); wellness-intensity-range confirms the check-in Slider/testid contract survived the Textarea swap. If color-palette fails, it logs the route + offending color — re-token to blue/slate (or confirm the gauge breakdown didn't auto-expand / score didn't shift).
- [ ] **Step 4: Boot smoke** — `/classbot/wellness`, `/classbot/wellness/check-in`, `/classbot/me/report`, `/classbot/replay` → 200, zero runtime errors in the dev log.
- [ ] **Step 5: Done** — fix any gap, re-run, commit `fix(wellness): <what>`.

---

## Self-Review

**Spec coverage (design §6.3):** wellness CTA-hero + gauge → T1 (ContextRail); report narrative+rail → T3; replay single hero + badge → T4; EmptyState → T1/T4; shadcn Textarea → T2; crisis lemon→danger remap is **teacher-side (deferred to PR-5)** — crisis components render on teacher pages, not these student routes. Sparkbar/heatColor already extracted (PR-2b). Replay detail (replay/[id]) left as-is (most polished, lowest priority — deferred).

**Placeholder scan:** every task has file:line + concrete primitive + the palette rule. No TBD.

**Type consistency:** `ContextRail`/`EmptyState`/`BackLink`/`Textarea` props match their definitions. `WellbeingGauge`/`KpiTrendCard`/`EmotionEmojiPicker` untouched.

**Risk note:** the dominant risk is color-palette green/amber on wellness/replay — the plan changes NO `scoreTone`, keeps the gauge breakdown collapsed, uses blue for the new replay badge, and T5 runs color-palette + wellness-intensity-range as the safety net. The check-in Slider/testid contract is preserved by only swapping the textarea (T2 greps the markers).
