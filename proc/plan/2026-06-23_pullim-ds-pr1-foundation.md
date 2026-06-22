# Pullim DS PR-1 — Token Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-point the app's single token source from CUDS variant-B (OKLCH hue-258) to the **Pullim 통합 디자인 시스템** values (`input/design-system/tokens.json`), re-skinning the whole app at once — colors, 8-step type scale, radius 8/14/20+pill, 4px spacing, motion, while keeping every token *name* (so no component edits) and every prod-verify e2e green.

**Architecture:** The app has ONE token source: `apps/classbot/lib/tokens/palette.ts` (JS `palette` object) → mirrored verbatim into `apps/classbot/app/globals.css @theme inline` (the `--color-pullim-*`, `--radius-*`, `--duration-*` vars consumed by every component) → locked by `apps/classbot/lib/tokens/__tests__/palette.test.ts`. We swap the **values** (CUDS OKLCH → Pullim DS **hex**), keep the **names** (`pullim-blue-*`, `pullim-slate-*`, `pullim-lemon`, `pullim-success/warn/danger/info`), update the lock test, and verify.

**Tech Stack:** Next.js 16, Tailwind v4 (`@theme inline`), Jest, Playwright.

## Global Constraints

- **Spec:** `proc/spec/2026-06-22_pullim-ds-revamp-design.md`. DS source: `input/design-system/tokens.json` / `tokens.css`.
- **Keep token NAMES** — `--color-pullim-blue-*` (50–950), `--color-pullim-slate-*` (0–950), `--color-pullim-{success,warn,danger,info}(-bg)`, `--color-pullim-lemon(-soft/-ink)`, `--radius-*`, `--duration-*`. Components reference these; do NOT rename. Only values change.
- **Use Pullim DS hex** (not OKLCH). Rationale: the DS is authored in hex; hex computes to `rgb()` (OKLCH→`lab()` previously broke string-based e2e). Update `palette.test.ts` accordingly.
- **color-palette guard KEPT.** After the swap, all 8 scanned routes (`/classbot`, `/classbot/chat`, `/classbot/assignment`, `/classbot/replay`, `/classbot/wellness`, `/teacher`, `/teacher/classbot`, `/teacher/builder`) must emit no forbidden green (`g>140 && g>r+40 && g>b+30 && r<80`) / amber (`r>200 && 130<g<200 && b<80`). DS semantics are expected to pass (success `#0E8C56` g=140, warn-cta `#D97706` g=119 — both just outside); **verify in Task 6**.
- **Preserve** `x-build-sha` meta, standalone build, Pretendard self-host, all e2e DOM/testid contracts.
- Work on branch `feat/pullim-ds-pr1-foundation` (off `dev`); PR → `dev`. **Dev server on :3032 for iPad — do NOT run `bun run dev`; verify with typecheck/build/gates/jest. `git add` specific files.** Commit per task.

### Canonical Pullim DS values (verbatim from `tokens.json`)

```
brand   50 #EEF3FF · 100 #DCE6FF · 200 #B8CDFF · 300 #8BAEFF · 400 #5A8BFF
        500 #3B6FF6 · 600 #2854D8(★CTA) · 700 #1D3FA8 · 900 #070F2C
        (interpolate: 800 #142C73, 950 #050A1E)
text    primary #121627 · secondary #4A536A · tertiary #6B7489 · quaternary #97A0B4 · disabled #B7BDCD · on-primary #FFFFFF
surface canvas #F5F7FB · subtle #EDF0F5 · default #FFFFFF · inverse #0F1A3A
border  subtle #EDF0F5 · default #DDE2EC · strong #B7BDCD
accent  lime #E6FF4C · lime-on #5C6B0A
sem     success fg #0E8C56 / bg #E6F8EF / border #A5E5C4
        warning fg #B7791F / bg #FFF7E6 / cta-bg #D97706 / border #F2C879
        danger  fg #C03B3F / bg #FDECEC / border #F0A8AB
radius  sm 8 · md 14(★) · lg 20 · pill 9999
type    caption 12/16·500 · body 14/22·400 · bodyLg 16/24·400 · title3 18/26·600
        title2 20/28·600 · title1 24/32·700 · display2 28/36·700 · display1 32/40·700
motion  fast 120 · base 200 · slow 320 · ease standard cubic-bezier(.4,0,.2,1) · emphasis cubic-bezier(.2,.8,.2,1)
elev    1 "0 1px 2px rgba(18,22,39,.04)" · 2 "0 4px 12px rgba(18,22,39,.06),0 2px 4px rgba(18,22,39,.04)" · 3 "0 12px 24px rgba(18,22,39,.08),0 4px 8px rgba(18,22,39,.04)"
focus   default 0 0 0 3px rgba(59,111,246,.35) · danger 0 0 0 3px rgba(229,72,77,.30)
```

---

### Task 1: Re-point `palette.ts` to Pullim DS hex + update the lock test

**Files:** Modify `apps/classbot/lib/tokens/palette.ts`, `apps/classbot/lib/tokens/__tests__/palette.test.ts`.

**Interfaces:** Produces the `palette` object (same shape/keys) with Pullim DS hex values; `index.ts` continues to derive `pullimBlue`/`pullimSemantic` from it (no signature change).

- [ ] **Step 1: Rewrite the lock test to the DS hex anchors** (`palette.test.ts`):
```ts
expect(palette.primary[600]).toBe('#2854D8'); // ★ Pullim brand CTA
expect(palette.primary[50]).toBe('#EEF3FF');
expect(palette.primary[900]).toBe('#070F2C');
expect(palette.success[600]).toBe('#0E8C56');
expect(palette.warning[600]).toBe('#D97706');  // cta-bg (AA on white)
expect(palette.danger[600]).toBe('#C03B3F');
expect(palette.lemon.base).toBe('#E6FF4C');
expect(palette.radius).toEqual({ sm: 8, md: 14, lg: 20, pill: 9999 });
// every color string is a 6-digit hex (DS is hex-authored)
const colorVals = [
  ...Object.values(palette.primary), ...Object.values(palette.gray),
  ...Object.values(palette.success), ...Object.values(palette.warning),
  ...Object.values(palette.danger), ...Object.values(palette.info),
];
for (const v of colorVals) expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/);
```
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- palette`).
- [ ] **Step 3: Rewrite `palette.ts` values** to the DS hex (keep keys + `as const`):
  - `primary`: 50 `#EEF3FF` · 100 `#DCE6FF` · 200 `#B8CDFF` · 300 `#8BAEFF` · 400 `#5A8BFF` · 500 `#3B6FF6` · 600 `#2854D8` · 700 `#1D3FA8` · 800 `#142C73` · 900 `#070F2C` · 950 `#050A1E`.
  - `gray`: 0 `#FFFFFF` · 25 `#FAFBFD` · 50 `#F5F7FB` · 100 `#EDF0F5` · 200 `#DDE2EC` · 300 `#B7BDCD` · 400 `#97A0B4` · 500 `#6B7489` · 600 `#4A536A` · 700 `#2B3245` · 800 `#1E2435` · 900 `#121627` · 950 `#0B0E1A`.
  - `success`: 50 `#E6F8EF` · 500 `#12B26B` · 600 `#0E8C56` · 900 `#0A5235`. `warning`: 50 `#FFF7E6` · 500 `#F2C879` · 600 `#D97706` · 900 `#7A4A12`. `danger`: 50 `#FDECEC` · 500 `#E5484D` · 600 `#C03B3F` · 900 `#7A2528`. `info`: 50 `#EEF3FF` · 500 `#3B6FF6` · 600 `#2854D8` · 900 `#070F2C`.
  - `lemon`: base `#E6FF4C` · soft `#F4FFB8` · ink `#5C6B0A`.
  - `botSig`: leave bot signature hues as-is (per-bot identity, tuned later in PR-2) — but convert any OKLCH there to hex equivalents OR keep (palette.test.ts color-hex check excludes `botSig`/`lemon` already; keep botSig unchanged this PR).
  - `radius`: `{ sm: 8, md: 14, lg: 20, pill: 9999 }`.
  - `space`: `{ 0:0,1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48,16:64 }` (DS 4px scale).
  - `text` (8-step, px): `{ caption:12, body:14, bodyLg:16, title3:18, title2:20, title1:24, display2:28, display1:32 }`.
  - `motion`: `{ fast:120, base:200, slow:320, easeStandard:'cubic-bezier(0.4,0,0.2,1)', easeEmphasized:'cubic-bezier(0.2,0.8,0.2,1)' }`.
- [ ] **Step 4: Run — PASS.** (`bun run test -- palette`)
- [ ] **Step 5: Fix `index.ts` if it references removed keys** (e.g. old `radius.xs/2xl`, `text.2xs` etc.). `grep -n "radius\.\|text\.\|space\.\|motion\." lib/tokens/index.ts` and update derived exports to the new keys. Run `bun run typecheck`.
- [ ] **Step 6: Commit** — `git commit -m "feat(tokens): re-point palette.ts to Pullim DS hex + 8-step type/radius/motion"`

---

### Task 2: Mirror DS colors into `globals.css @theme`

**Files:** Modify `apps/classbot/app/globals.css` (the `@theme inline` block, color section ~lines 47–94).

- [ ] **Step 1: Re-point `--color-pullim-blue-*`** (50–950) to the `primary` hex from Task 1 (same values, same names).
- [ ] **Step 2: Re-point `--color-pullim-slate-*`** (0–950) to the `gray` hex from Task 1.
- [ ] **Step 3: Re-point semantics** — `--color-pullim-success` `#0E8C56` / `-bg` `#E6F8EF`; `--color-pullim-warn` `#D97706` / `-bg` `#FFF7E6`; `--color-pullim-danger` `#C03B3F` / `-bg` `#FDECEC`; `--color-pullim-info` `#2854D8` / `-bg` `#EEF3FF`.
- [ ] **Step 4: Re-point lemon** — `--color-pullim-lemon` `#E6FF4C` · `-soft` `#F4FFB8` · `-ink` `#5C6B0A`. (Keep the `glow-lemon` utility.)
- [ ] **Step 5: Verify `.dark` block** (if it overrides these) stays coherent — re-point any dark overrides to DS inverse `#0F1A3A` surface family; keep light-first.
- [ ] **Step 6: Verify** — `cd apps/classbot && bun run typecheck && bun run gates && bun run build`. (Gate: no 6-digit hex in `components/**` — `@theme` in `app/globals.css` is exempt as a token file; confirm the gate still passes.)
- [ ] **Step 7: Commit** — `git commit -m "feat(tokens): mirror Pullim DS colors into @theme (names unchanged)"`

---

### Task 3: 8-step type scale utilities

**Files:** Modify `apps/classbot/app/globals.css` (`@theme` `--text-*` + any type utilities).

- [ ] **Step 1: Define the 8-step `--text-*` tokens** in `@theme` matching `palette.text` (px + line-height): `caption 12/16`, `body 14/22`, `bodyLg 16/24`, `title3 18/26`, `title2 20/28`, `title1 24/32`, `display2 28/36`, `display1 32/40`. Map Tailwind's `text-*` scale onto these (`text-xs→caption`, `text-sm→body`, `text-base→bodyLg`, `text-lg→title3`, `text-xl→title2`, `text-2xl→title1`, `text-3xl→display2`, `text-4xl→display1`) so existing class usage picks up the new scale + line-heights.
- [ ] **Step 2: Set base body type** — `body { font: var(--text-body) }` equivalent (14/22 mobile, `bodyLg` 16/24 at `md+`), Pretendard, `word-break: keep-all` preserved.
- [ ] **Step 3: Verify** — `bun run typecheck && bun run build && bun run gates`. Spot-check a heading renders larger (title hierarchy restored).
- [ ] **Step 4: Commit** — `git commit -m "feat(tokens): 8-step Pretendard type scale (restore H2/H3 hierarchy)"`

---

### Task 4: Radius, motion, elevation, focus tokens

**Files:** Modify `apps/classbot/app/globals.css` (`@theme` radius/duration + add elevation/focus).

- [ ] **Step 1: Radius** — `--radius-sm: 8px; --radius-md: 14px; --radius-lg: 20px; --radius-pill: 9999px;`. Keep any `--radius-xl/2xl` as aliases (`xl→20px`) so existing `rounded-2xl` usage maps to `lg` (20) rather than the old 28 — set `--radius-2xl: 20px` to collapse to the DS 3-step. (Tailwind `rounded-{sm,md,lg,xl,2xl}` → 8/14/20/20/20.)
- [ ] **Step 2: Motion** — `--duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;` + `--ease-standard: cubic-bezier(0.4,0,0.2,1); --ease-emphasis: cubic-bezier(0.2,0.8,0.2,1);`. Point existing `pullim-anim-*` keyframes' durations/easings at these vars.
- [ ] **Step 3: Elevation + focus** — add `--shadow-pullim-sm/-md/-lg` = DS elev 1/2/3, and `--ring-pullim` = `0 0 0 3px rgba(59,111,246,0.35)`. Re-point existing `shadow-pullim-*` usages to these values.
- [ ] **Step 4: Verify** — `bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(tokens): radius 8/14/20+pill, motion 120/200/320, DS elevation+focus"`

---

### Task 5: chart tokens + derived consumers sanity

**Files:** Modify `apps/classbot/app/globals.css` (chart tokens ~line 180), check `apps/classbot/lib/tokens/*` JS consumers.

- [ ] **Step 1: Chart tokens** — they reference `var(--color-pullim-*)`; confirm they still resolve (they pick up new values automatically). Ensure no chart token references a removed shade.
- [ ] **Step 2: JS token consumers** — `grep -rn "palette\.\|from '@/lib/tokens" apps/classbot/lib apps/classbot/components | grep -vE "__tests__"` — confirm bot-signature/assignment-state/tier/index still compile against the new `palette` keys (radius/text/space keys changed). Fix any broken key refs.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run test && bun run build && bun run gates` (full).
- [ ] **Step 4: Commit** — `git commit -m "fix(tokens): align chart + JS token consumers to Pullim DS keys"`

---

### Task 6: PR-1 verification gate (color-palette is load-bearing)

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: color-palette ALL 8 routes** against live :3032 — **the critical check** (the new DS semantics must not trip green/amber):
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts --reporter=line
```
Expect **8/8 pass**. If any route trips green/amber: identify the offending token (likely `success`/`warn` if a darker rendering pushed into range), and per the kept guard, keep that semantic off the scanned route (swap to blue/slate/lemon there) — do NOT relax the spec. Re-run.
- [ ] **Step 3: Other prod-verify specs** against :3032 — chat (greeting/quick-prompts/scroll), wellness-intensity-range, mobile-and-focus (수업 종료 + assignment-form + slider-variants token-relative). All pass (these are token-value-agnostic; slider-variants is token-relative so it tracks the new blue/danger).
- [ ] **Step 4: Boot smoke + visual** — load `/classbot`, `/classbot/chat`, `/teacher/classbot` on :3032; confirm the new brand blue `#2854D8`, lime, neutrals, larger headings render; no pageerror in the dev log. Capture a screenshot for the PR.
- [ ] **Step 5: Done** — fix any gap, re-run, commit `fix(tokens): <what>`.

---

## Self-Review

**Spec coverage (§2 of the design spec):** color re-point → T1/T2; 8-step type → T3; radius/motion/elevation/focus → T4; gates kept → T2/T6; color-palette guard verified → T6. Spacing 4px → T1 (`palette.space`). ✅ Phases 2–N (persona/assignments/wellbeing/replay/onboarding/motion-catalog) are **separate PRs** — out of this plan.

**Placeholder scan:** every task has exact DS hex/values + commands. Interpolated steps (brand 800/950, gray mid-steps, lemon-soft) are explicitly given values, flagged as interpolated. No TBD.

**Type consistency:** `palette` keys change (`radius` → {sm,md,lg,pill}; `text` → 8-step names; `space` → DS scale) — T1 Step 5 + T5 Step 2 fix every JS consumer of the changed keys. The lock test (T1) and `@theme` mirror (T2–T4) use identical values. `--color-pullim-*` names unchanged → components untouched.

**Risk note:** the load-bearing risk is color-palette on the 8 scanned routes after the semantic-color swap (T6 Step 2 is the net; the math says pass, but verify). Second risk: changed `palette` non-color keys (radius/text/space) breaking JS consumers — T5 greps + fixes them before the final build.
