# CUDS PR-4a Student Home/Discover/Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the three student entry pages (home, discover, onboarding) to CUDS variant-B — intentional responsive layout that uses the 1280px canvas (home grid; discover/onboarding reading columns), adopt the PR-2b primitives (EmptyState, BackLink, KpiStat, SectionHeading), retire the lemon-glow duplication and the off-palette emerald, and collapse `text-[Npx]` one-offs — without breaking the prod-verify home e2e contracts.

**Architecture:** Home becomes a band+grid layout (`KPI hero → lg:grid-cols-2 bots | new-items → CTA`); discover/onboarding get centered reading columns. A shared `glow-lemon` utility replaces 6 inline gradient copies (3 in scope here). Primitives are adopted at the spots the understand pass identified.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), Jest, Playwright (color-palette + mobile-and-focus prod-verify specs).

## Global Constraints

**Home e2e contract (prod-verify — MUST preserve):**
- [C1] Text `내 클래스봇` renders visible on `/classbot` home. (mobile-and-focus:29)
- [C2] ≥1 **visible** anchor with `href` starting `/classbot/chat` inside the `role="main"` landmark (the home's bot chips link `?bot=…`). (mobile-and-focus:31-32)
- [C3] ≥1 **visible** anchor with `href` starting `/classbot/replay` inside `<main>`. (mobile-and-focus:33)
- [C4] body `word-break: keep-all` stays (global; do NOT touch the layout/global CSS that sets it). (mobile-and-focus:37-43)
- [C5] **No green/amber hues on `/classbot` home** — `color-palette.spec.ts` scans every element's computed bg/text/border and fails on saturated green (≈`#12B26B`/`pullim-success`) or amber (≈`#F59E0B`/`pullim-warn`). Home palette = blue + slate + **lemon** (1–2 spots) + danger-red only.

**Critical token rule (overrides the audit):** the off-palette `emerald-*` on home (page.tsx:335) must become a **BLUE** token (`bg-pullim-blue-50 text-pullim-blue-700`), **NOT** `pullim-success` (green would trip [C5]). Do not introduce any green/amber on home. `KpiStat` tones are safe (accent→blue, alert→danger, success→blue-500) — no green. `lemon` passes the hue check; keep lemon ≤1–2 spots.

**Other:** tokens only, no hardcoded hex in `components/**` (gate); but these are `app/` pages — still prefer tokens, and the new `glow-lemon` utility is token-backed. Korean typography; collapse `text-[9/10/11/12px]` one-offs to the type scale (`text-xs`=12 for badges/eyebrows/meta), keep `text-[10px]` ONLY for genuine Latin/number micro-pills. One card radius family (`rounded-2xl` top-level, `rounded-xl` nested). Work on branch `feat/cuds-pr4a-student-home` (created, stacked on PR-3). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev` (predev kills it); verify with typecheck/build/gates only; the controller runs e2e.** Commit per task.

---

### Task 1: Shared `glow-lemon` utility

**Files:** Modify `apps/classbot/app/globals.css`.

- [ ] **Step 1: Add the utility** — after the `@theme`/shadow block (near the `--shadow-pullim-glow` definition), add Tailwind v4 utility:
```css
@utility glow-lemon {
  background: radial-gradient(circle, var(--color-pullim-lemon), transparent 70%);
}
```
- [ ] **Step 2: Verify** — `cd apps/classbot && bun run build && bun run gates` (utility compiles; gates pass).
- [ ] **Step 3: Commit** — `git commit -m "feat(tokens): glow-lemon utility (replaces inline lemon radial-gradient)"`

---

### Task 2: Student home — intentional grid + primitive adoption + palette-safe tokens

**Files:** Modify `apps/classbot/app/(student)/classbot/page.tsx`.

**Interfaces:** consumes `EmptyState`, `KpiStat`/`KpiStatBar`, `SectionHeading` (PR-2b/shell), `glow-lemon` (Task 1).

- [ ] **Step 1: Restructure root into a band+grid layout**

Change the root `<div className="space-y-4">` (page.tsx:58) to keep `space-y-4` but reorganize the children into: (1) the `KpiHeader` hero band (full width), (2) a new `<section className="grid gap-4 lg:grid-cols-2">` wrapping `MyBotsStrip` (left) + `NewItemsGrid` (right), (3) the CTA band (full width). This fills the 1280px canvas on desktop and collapses to a single column on mobile. **Do NOT remove the bot-chip links to `/classbot/chat?bot=…` or the replay entry link — [C2]/[C3] depend on a visible chat link and replay link inside `<main>`.**

- [ ] **Step 2: KpiHeader meta → KpiStatBar**

In `KpiHeader` (def ~103-165), replace the hand-rolled `·`-joined meta line (~152-161, "라이브 N · 마감 N · 한 마디 N") with a `<KpiStatBar cols={3}>` of three `<KpiStat>` (label 라이브/마감/한 마디; value=count; tone: 라이브→`alert`, 마감→`alert`, 한 마디→`accent` — all blue/red, palette-safe). Keep the big `totalNew` hero numeral as-is. Replace the inline lemon glow (~136-140) with `className="glow-lemon …"` (drop the inline `style`).

- [ ] **Step 3: Zero-state → celebratory EmptyState**

Replace the `KpiHeader` zero-state box (~111-125) with `<EmptyState tone="plain" icon={Bell} title="전부 따라잡았어요 🎉" description="봇과 자유롭게 대화하며 한 발 더 나가볼까요?" action={{ href: '/classbot/chat', label: '봇과 대화하기' }} />`. (This also keeps a `/classbot/chat` link present — supports [C2].)

- [ ] **Step 4: Section headings + empty bot slots**

Replace the two hand-rolled `<header>`/`<h2 text-sm>` in `MyBotsStrip` (~180-187) and `NewItemsGrid` (~282-286) with `<SectionHeading title="내 클래스봇" action={<span className="text-pullim-slate-500 text-xs font-bold">{bots.length}명</span>} />` (the title text **must contain `내 클래스봇`** — [C1]) and `<SectionHeading title="새로 온 것" />`. In `MyBotsStrip`, change `grid-cols-5` → `grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4`, and stop padding empty slots to 5 (`Math.max(5, bots.length)` → just `bots.length`); render at most ONE trailing "추가" CTA slot (Link to `/discover`) instead of pad-to-5.

- [ ] **Step 5: Palette-safe token fixes ([C5])**

- page.tsx:335 — `bg-emerald-50 text-emerald-700` (and the `countText: text-emerald-700`) → `bg-pullim-blue-50 text-pullim-blue-700` (blue, NOT green). This is the only raw emerald and the only [C5] risk.
- Collapse the home `text-[11px]`/`text-[10px]`/`text-[12px]` one-offs (114,142,153,184,264,360,368,91) → `text-xs`; keep the LV badge `text-[9px]` (239) as `text-[10px]` (genuine micro-pill). No green/amber introduced anywhere.

- [ ] **Step 6: Verify (build + palette-safety grep)**

`cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Then grep-confirm the contracts survive in the file: `grep -c '내 클래스봇'` (≥1), `grep -c '/classbot/chat'` (≥1), `grep -c '/classbot/replay'` (≥1), `grep -c 'emerald'` (==0). (Controller runs the actual color-palette + mobile-and-focus e2e in Task 5.)

- [ ] **Step 7: Commit** — `git commit -m "feat(home): intentional grid + KpiStat/EmptyState/SectionHeading; palette-safe (emerald→blue)"`

---

### Task 3: Discover — centered reading column + EmptyState/BackLink

**Files:** Modify `apps/classbot/app/(student)/classbot/discover/page.tsx`.

**Interfaces:** consumes `EmptyState`, `BackLink`, `SectionHeading`.

- [ ] **Step 1: Centered column** — change root `<div className="space-y-5">` (discover:7) → `<div className="mx-auto max-w-2xl space-y-5">`.
- [ ] **Step 2: BackLink** — add `<BackLink href="/classbot">홈으로</BackLink>` above the `PageHeader` (discover:8).
- [ ] **Step 3: Locked card → EmptyState** — replace the hand-rolled dashed locked box (discover:15-23) with `<EmptyState icon={Lock} title="v2에 만나요" description="현재 클래스봇은 선생님이 만들어 배정하는 게 기본이에요. 학생이 직접 검색해 등록하는 기능은 준비 중이에요." size="lg" />`. Remove the now-unused `Lock`-box markup; keep importing `Lock` for EmptyState's icon prop.
- [ ] **Step 4: SectionHeading + type scale** — `곧 만날 봇 종류` `<h3 text-sm>` (discover:27) → `<SectionHeading title="곧 만날 봇 종류" />`; `text-[11px]` (discover:67) → `text-xs`.
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. (Discover is e2e-unconstrained.)
- [ ] **Step 6: Commit** — `git commit -m "feat(discover): centered reading column + EmptyState/BackLink/SectionHeading"`

---

### Task 4: Onboarding — reading-comfortable width + BackLink + glow utility

**Files:** Modify `apps/classbot/components/shell/onboarding-template.tsx` (layout lives here; the page is config-only).

**Interfaces:** consumes `BackLink`, `glow-lemon` (Task 1).

- [ ] **Step 1: Reading-comfortable cap** — change the template root `<div className="space-y-6">` (onboarding-template.tsx:83) → `<div className="mx-auto max-w-5xl space-y-6">` (NOT max-w-2xl — the alternating StepCard screenshot grid needs the room; the hero copy already self-limits to max-w-2xl at :114). Do NOT change StepCard's internal `lg:grid-cols-[1fr_minmax(0,420px)]` grid (:242-244) — it's the reference intentional grid.
- [ ] **Step 2: BackLink escape hatch** — add `<BackLink href="/classbot">클래스봇 홈</BackLink>` at the very top of the template (before `StickyProgressBar`, ~:84).
- [ ] **Step 3: glow-lemon** — replace the two inline lemon-glow `style` gradients (onboarding-template.tsx:98 hero, :135 final CTA) with the `glow-lemon` utility class (drop the inline `style`).
- [ ] **Step 4: Eyebrow type scale** — template eyebrows `text-[11px]` (:101, :313) → `text-xs` (match PageHeader's eyebrow). (The MockBrowser mock-screenshot `text-[Npx]` in `page.tsx` simulate a dense dashboard — leave them.)
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. (Onboarding is e2e-unconstrained.)
- [ ] **Step 6: Commit** — `git commit -m "feat(onboarding): reading-comfortable width + BackLink + glow-lemon utility"`

---

### Task 5: PR-4a verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — from repo root: `bun --filter @pullim-classbot/classbot typecheck && bun --filter @pullim-classbot/classbot lint && bun --filter @pullim-classbot/classbot test && bun --filter @pullim-classbot/classbot build` → all pass.
- [ ] **Step 2: Home e2e contract grep** — `grep -c` in `app/(student)/classbot/page.tsx`: `내 클래스봇` ≥1, `/classbot/chat` ≥1, `/classbot/replay` ≥1, `emerald` ==0.
- [ ] **Step 3: Run the home-cluster e2e specs** against the already-running :3032 server (it hot-reloads):
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts tests/e2e/mobile-and-focus.spec.ts --reporter=line
```
Both must pass — **color-palette confirms no green/amber leaked onto home [C5]; mobile-and-focus confirms `내 클래스봇` + chat/replay links + word-break [C1-C4]**. If color-palette fails on a green/amber element, find it (the failure logs the route + color) and re-token to blue/slate.
- [ ] **Step 4: Boot smoke** — `/classbot`, `/classbot/discover`, `/classbot/onboarding` → 200, zero runtime errors in the dev log.
- [ ] **Step 5: Done** — fix any gap in the owning task's file, re-run, commit `fix(home): <what>`.

---

## Self-Review

**Spec coverage (design §6.1):** home grid + zero-states + emerald→(blue, palette-safe) + empty-slot cap → T2; discover reading column + EmptyState → T3; onboarding width + BackLink → T4; lemon-glow utility → T1; type-scale collapse → T2/T3/T4. ✅ Deferred: extracting the inline onboarding mock screenshots into components (noted in audit, low value — the MockBrowser content is intentionally fake-dense; defer).

**Placeholder scan:** every adoption has a file:line target + the primitive + concrete classes. No TBD.

**Type consistency:** `EmptyState`/`KpiStat`/`KpiStatBar`/`SectionHeading`/`BackLink` prop shapes match PR-2b/shell. `glow-lemon` is the shared utility from T1.

**Risk note:** the home is the only e2e-constrained page. The dominant risk is [C5] (no green/amber): the plan explicitly routes emerald→blue and uses only blue/red/lemon KpiStat tones. T5 Step 3 runs color-palette + mobile-and-focus as the real safety net before merge.
