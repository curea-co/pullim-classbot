# Pullim Design System Revamp — Design Spec

**Date:** 2026-06-22
**Status:** approved (brainstorming) → ready for writing-plans
**Supersedes the visual layer of:** the CUDS variant-B redesign (`proc/spec/2026-06-17_classbot-cuds-redesign-design.md`, shipped #94–#103 + follow-ups). Features & structure from that work are **kept**; only the design system is swapped.

## Goal

Re-skin **and** restructure the pullim-classbot app to the **`input/design-system/` "Pullim 통합 디자인 시스템"** (the audited Planner/Q/Classbot unified DS) + the `input/design-system/private-classbot.md` deep-dive — **keeping every feature** and this session's structural work (3-col chat, ContextRail, primitives, sidebar toggle, robot icon).

## Locked decisions (from brainstorming)

1. **Source of truth:** `input/design-system/` (`tokens.json`/`tokens.css`, `DESIGN_SYSTEM.md`, `private-classbot.md`). NOT pullim.ai-live, NOT a from-scratch system.
2. **Depth:** re-skin (full visual system) **+** restructure (adopt `private-classbot.md` patterns where they differ).
3. **Sequencing:** foundation-first **phased stacked PRs** (mirror the CUDS stack — FE-only, small, review-convergent, off `dev` → PR to `dev`).
4. **color-palette guard: KEPT.** Student routes (`/classbot`, `/classbot/chat`, `/classbot/assignment`, `/classbot/replay`, `/classbot/wellness`) + teacher `/teacher`,`/teacher/classbot`,`/teacher/builder` stay green/amber-free. The DS's AA-tuned semantics are expected to pass (see §5) — verify empirically, do not relax the spec.

## Key reframe (why this is smaller than it sounds)

Much of `private-classbot.md`'s priority matrix is **already built this session**: P0 #1 sticky input bar, #2 bot-meta collapse/toggle, #4 user-bubble + bot accent liner, #5 motion M1/M2/M5; P1 #6 dynamic chips, #7 bot signature colors, #13 switcher active. So the **new** work is (A) the Pullim DS token/type/radius/motion foundation, and (B) the not-yet-built per-area items. Already-built items are **verify/polish only**.

---

## 1. Architecture

Stacked PRs off `dev`, each FE-only and independently reviewable (repo top rule: one PR = one unit; FE/BE never mixed). Branch per PR off the prior PR head; PR targets `dev` (team flow: `dev → main` promotes to production at `classbot.pullim.ai`).

Token source of truth stays single: `apps/classbot/lib/tokens/palette.ts` → mirrored into `apps/classbot/app/globals.css @theme`. **Re-point existing token names** (`--color-pullim-*`, etc.) to Pullim DS values — keep class names, swap values — so the whole app re-skins without touching every component (the proven CUDS approach).

---

## 2. Phase 1 — Pullim DS token foundation

### 2.1 Color (re-point existing `pullim-*` token names to these values)

| token group | values |
|---|---|
| brand 50→900 | `#EEF3FF #DCE6FF #B8CDFF #8BAEFF #5A8BFF #3B6FF6 #2854D8(600 ★CTA) #1D3FA8(700) #070F2C(900)` |
| accent lime | `#E6FF4C` · lime-on `#5C6B0A` |
| text | primary `#121627` · secondary `#4A536A` · tertiary `#6B7489` (meta min) · quaternary `#97A0B4` (≥14px only) · disabled `#B7BDCD` · on-primary `#FFFFFF` |
| surface | canvas `#F5F7FB` · subtle `#EDF0F5` · default `#FFFFFF` · inverse `#0F1A3A` |
| border | subtle `#EDF0F5` · default `#DDE2EC` · strong `#B7BDCD` |
| semantic success | fg `#0E8C56` · bg `#E6F8EF` · border `#A5E5C4` |
| semantic warning | fg `#B7791F` · bg `#FFF7E6` · cta-bg `#D97706` · border `#F2C879` |
| semantic danger | fg `#C03B3F` · bg `#FDECEC` · border `#F0A8AB` |

The existing app tokens (`pullim-blue-*`, `pullim-slate-*`, `pullim-lemon`, `pullim-success/warn/danger`(+`-bg`)) map onto these. **Mapping table is produced in the plan**; every current class keeps working with new values.

### 2.2 Typography — 8-step scale (DS's #1 priority: restore H2/H3 hierarchy)

`caption 12/16·500 · body 14/22·400 · bodyLg 16/24·400 · title3 18/26·600 · title2 20/28·600 · title1 24/32·700 · display2 28/36·700 · display1 32/40·700`. Weights 400/500/600/700. Font: Pretendard Variable (sans), Geist Mono (mono). Expose as utilities/tokens; replace ad-hoc `text-[Npx]` one-offs with scale steps.

### 2.3 Radius / spacing / motion / elevation / focus

- **radius** sm 8 · md 14 (★ card/button/input standard) · lg 20 (hero) · pill. Collapse current radii to these 3+pill.
- **spacing** 4px scale (0,4,8,12,16,20,24,32,40,48,64).
- **motion** duration fast 120 / base 200 / slow 320; easing standard `cubic-bezier(.4,0,.2,1)`, emphasis `cubic-bezier(.2,.8,.2,1)`. Formalize the existing `pullim-anim-*` keyframes against these.
- **elevation** 0–3 + fab; **focusRing** default `0 0 0 3px rgba(59,111,246,.35)`, danger variant.
- **a11y** 44px touch-target floor; meta text ≥ `#6B7489`.

### 2.4 Gates

Keep the hex-in-`components/**` gate and `word-break: keep-all` gate. Add a lightweight **type-scale lint** (flag new `text-[Npx]` outside tokens) is optional/stretch.

---

## 3. Phases 2–N — `private-classbot` 개선안 (by priority matrix)

Each is its own PR (or small cluster), in matrix-priority order. Already-built items → verify/polish only.

- **Persona-ization** (P1 #7/#13, P3 #20): per-bot signature color on **bubble left-liner** + switcher active signature state + per-bot signature motion (M3/M4 idle breath/blink, M9 wave). Build on existing `botSignature`.
- **Assignments** (P2 #14/#15): state-color mapping (긴급/지연/오답정복/시험) — **must stay palette-safe** (blue/slate/lemon/danger only on the scanned route); bot-group headers.
- **Wellbeing** (P2 #16/#17): 담당-봇 코멘트 카드 (1-line + actionable CTA); 7-day mood bars color-mapped + 5-indicator expand — palette-safe.
- **Replay** (P3 #18): 16:9 thumbnails.
- **Onboarding** (P3 #19): student-voice copy + interactive demo chat.
- **Home** (P1 #8): confirm LIVE-first block order + bot-card previews (overlaps this session's home audit).
- **Motion catalog** (P0 #5 done; remainder): formalize the 9 classbot signature motions against the motion tokens; honor `prefers-reduced-motion`.

Exact per-area current/target + file:line come from `private-classbot.md` §1–9 during planning.

---

## 4. What stays / out of scope

**Stays:** all features; the structure built this session (3-col chat, left profile rail, right quiz/study rail, ContextRail, EmptyState/AlertCard/KpiStat/ScoreDisplay/BotNote/RadioCard/etc., sidebar toggle, robot service icon, demo fallbacks). **Out of scope:** BE/API changes; new domains; the dispatch→BE write (separate); pullim.ai-live aesthetic.

## 5. Constraints & e2e contracts (all preserved)

- **prod-verify**: color-palette (8 routes), chat (greeting/quick-prompts/scroll), wellness-intensity-range (check-in Slider), mobile-and-focus (수업 종료, assignment-form testids, solve radio a11y), slider-variants (now token-relative). All DOM/testid contracts intact.
- **color-palette green/amber check** (`isForbiddenHue`): success green if `g>140 && g>r+40 && g>b+30 && r<80`; warn amber if `r>200 && 130<g<200 && b<80`. DS semantics: success `#0E8C56`=rgb(14,140,86) → g=140 **not >140** ✓; warn cta `#D97706`=rgb(217,119,6) → g=119 **not >130** ✓; danger `#E5484D`/`#C03B3F` = red, allowed. **Expected to pass; T-verify each scanned route empirically.** If any DS color trips it, keep that color off the scanned student/teacher-core routes (use blue/slate/lemon), per the kept guard.
- `x-build-sha` meta + the standalone build untouched. Pretendard self-host preserved.

## 6. Phasing summary (for the plan)

1. **PR-1 Foundation** — tokens (color/type/radius/spacing/motion/elevation/focus) re-pointed to Pullim DS; verify all 8 color-palette routes + full build/typecheck/jest.
2. **PR-2 Persona-ization** — bot signature on bubbles/switcher + signature motion.
3. **PR-3 Assignments** — state colors + group headers (palette-safe).
4. **PR-4 Wellbeing** — bot-comment card + bars/indicators.
5. **PR-5 Replay + Onboarding** — 16:9 thumbnails + interactive demo.
6. **PR-6 Motion + polish** — formalize motion catalog, reduced-motion, type-scale cleanup.

Each PR: typecheck + lint+gates + jest + the relevant prod-verify e2e (esp. color-palette on touched routes) + boot smoke, then PR to `dev`.
