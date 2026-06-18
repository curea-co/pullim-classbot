# CUDS PR-2b Primitives & Vendoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the shared CUDS variant-B primitives and vendor the dependency-free CUDS charts + layout primitives — each with a unit test and **canonical-site adoption only** (dedup of small fixed sets, or 1–2 reference adoptions for scattered patterns). Mass page-wide adoption is deferred to PR-4/5.

**Architecture:** New presentational components under `apps/classbot/components/classbot/*` (domain primitives) and `apps/classbot/components/{charts,layout}/*` (vendored CUDS). Pure helpers under `apps/classbot/lib/tokens/*`. No new runtime deps (recharts-backed charts are excluded). All colors via `--color-pullim-*`/semantic Tailwind tokens.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), TypeScript, Jest + `@testing-library/react`.

## Global Constraints

- Tokens only — no hardcoded hex in `components/**` (CI gate enforces). Radius via `rounded-*` tokens; type scale via `text-[10px]`(Latin/number only)/`text-xs`/`text-sm`/`text-base`/etc.; Korean text ≥12px.
- New deps: NONE. Vendor only the dependency-free CUDS files (`donut`, `heatmap`, `bullet`, `flex`, `stack`, `grid`); EXCLUDE `line-chart`/`bar-chart`/`sparkline` (recharts).
- Vendored CUDS files: swap `import { cn } from "../../utils/cn"` → `import { cn } from "@/lib/utils"`. Flex/Grid `gap` → Tailwind `gap-*` utilities (do NOT add `--space-*` tokens).
- `data-slot` attributes and the live-pill DOM shape are referenced by `tests/e2e/*` — when extracting a primitive out of a file that has them, preserve them. Grep `apps/classbot/tests/e2e/` before changing such files.
- Korean-first; preserve `aria-label`/`aria-current`/`role` on adopted sites.
- Work on branch `feat/cuds-pr2b-primitives` (created, stacked on PR-2a). Commit per task; don't push unless asked. Verify per task from `apps/classbot/`: `bun run test -- <name> && bun run typecheck && bun run gates` (+ `bun run build` for tasks touching many call sites or vendored files).

---

### Task 1: `heatColor()` lib fn + `Sparkbar` (viz atoms) — dedup all sites

**Files:**
- Create: `apps/classbot/lib/tokens/heat-color.ts`, `apps/classbot/components/classbot/sparkbar.tsx`
- Create tests: `apps/classbot/lib/tokens/__tests__/heat-color.test.ts`, `apps/classbot/components/classbot/__tests__/sparkbar.test.tsx`
- Modify (adopt): `apps/classbot/components/classbot/replay-player.tsx` (delete local `heatColor` ~494-500; FocusHeatmap bar block ~517-535 → `<Sparkbar>`), `apps/classbot/components/classbot/replay-review.tsx` (delete local `heatColor` ~374-380; FocusHeatmapPreview ~387-396 → `<Sparkbar>`), `apps/classbot/components/classbot/wellbeing-gauge.tsx` (2 bar renderers ~71-84 and ~154-167 → `<Sparkbar fillMode="class">`)

**Interfaces:**
- `export function heatColor(v: number): string` — buckets (inclusive lower bound): ≥90→`var(--color-pullim-heat-5)`, ≥80→`heat-4`, ≥70→`heat-3`, ≥60→`heat-2`, else→`heat-1` (NOT heat-0). Pure, returns the `var(...)` string.
- `Sparkbar` props (see brief embed below). Dual-mode fill: `fillMode='class'` (Tailwind bg via `cn`) | `'css'` (inline `style.backgroundColor`). Two height modes: px (`Math.max(minBarPx,(value/100)*heightPx)`) or percentage (`Math.max(minPct,value)%` when `minPct` set). Optional `onBarClick`→`<button>`, `activeIndex`→ring, `barAriaLabel`.

Sparkbar full prop interface (verbatim):
```ts
export interface SparkbarDatum { value: number; key?: string | number; title?: string }
export interface SparkbarProps {
  data: SparkbarDatum[];
  fill: (value: number, index: number) => string;
  fillMode?: 'class' | 'css';            // default 'css'
  heightPx: number;
  minBarPx?: number;
  minPct?: number;                        // opt into % height mode
  gapClassName?: string;                  // default 'gap-0.5'
  barRadiusClassName?: string;            // default 'rounded-sm'
  'aria-label'?: string;
  onBarClick?: (value: number, index: number) => void;
  barAriaLabel?: (value: number, index: number) => string;
  activeIndex?: number;
  className?: string;
}
```

- [ ] **Step 1: Write failing tests**

`heat-color.test.ts`:
```ts
import { heatColor } from '../heat-color';
it('buckets focus score to heat vars (floor is heat-1, not heat-0)', () => {
  expect(heatColor(95)).toBe('var(--color-pullim-heat-5)');
  expect(heatColor(85)).toBe('var(--color-pullim-heat-4)');
  expect(heatColor(72)).toBe('var(--color-pullim-heat-3)');
  expect(heatColor(60)).toBe('var(--color-pullim-heat-2)');
  expect(heatColor(10)).toBe('var(--color-pullim-heat-1)');
  expect(heatColor(0)).toBe('var(--color-pullim-heat-1)');
});
```
`sparkbar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Sparkbar } from '../sparkbar';
it('renders one bar per datum with class-mode fill', () => {
  const { container } = render(
    <Sparkbar data={[{ value: 20 }, { value: 80 }]} fill={() => 'bg-pullim-blue-500'} fillMode="class" heightPx={48} aria-label="trend" />
  );
  expect(container.querySelectorAll('.bg-pullim-blue-500').length).toBe(2);
  expect(screen.getByLabelText('trend')).toBeInTheDocument();
});
it('interactive mode renders buttons with per-bar aria-label', () => {
  render(<Sparkbar data={[{ value: 50 }]} fill={() => 'var(--color-pullim-heat-2)'} heightPx={56} minPct={8} onBarClick={() => {}} barAriaLabel={(v, i) => `${i}분 (집중도 ${v})`} />);
  expect(screen.getByRole('button', { name: '0분 (집중도 50)' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL** — `cd apps/classbot && bun run test -- heat-color sparkbar`.

- [ ] **Step 3: Implement `heat-color.ts` and `sparkbar.tsx`** per the interfaces above. Sparkbar: `flex items-end ${gapClassName}` container at `style={{ height: heightPx }}`; each bar `flex-1 ${barRadiusClassName}` with height per mode; fill applied per `fillMode`; `<button>` when `onBarClick`, else `<div>`; `activeIndex` → `ring-2 ring-pullim-lemon ring-offset-1`; container `aria-label`.

- [ ] **Step 4: Run — expect PASS** — `cd apps/classbot && bun run test -- heat-color sparkbar`.

- [ ] **Step 5: Adopt all 4 Sparkbar sites + 2 heatColor sites.** Read each target file; replace the inline bar `<div>` renderers with `<Sparkbar>` (wellbeing: `fillMode='class'`, `fill={t => scoreTone(t.score).bar}`, px heights 32/48; replay: `fillMode='css'`, `fill={heatColor}`, `minPct={8}`, heights 56/48, replay-player also `onBarClick`+`activeIndex`+`barAriaLabel`). Delete both local `heatColor` fns; import from `@/lib/tokens/heat-color`. Do NOT fold `student-roster.tsx`'s separate `heatColors` array.

- [ ] **Step 6: Verify** — `cd apps/classbot && bun run test && bun run typecheck && bun run build && bun run gates` → all pass.

- [ ] **Step 7: Commit** — `git commit -m "feat(viz): heatColor lib + Sparkbar primitive; dedup wellbeing/replay bar charts"`

---

### Task 2: `EmptyState` primitive + adopt `read-state.tsx`

**Files:**
- Create: `apps/classbot/components/classbot/empty-state.tsx`, `apps/classbot/components/classbot/__tests__/empty-state.test.tsx`
- Modify (canonical adopt): `apps/classbot/components/classbot/read-state.tsx` (`ReadLoginGate` → `EmptyState` neutral+Lock+action; `ReadErrorState` → `EmptyState` danger+AlertCircle+onClick action)

**Interfaces:**
```ts
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  tone?: 'neutral' | 'danger' | 'plain';            // default 'neutral'
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  size?: 'sm' | 'md' | 'lg';                         // default 'lg'
  className?: string;
}
```
Behavior: `neutral` = dashed `bg-pullim-slate-50 border-pullim-slate-200 border-dashed rounded-2xl` + icon chip `h-10 w-10 rounded-xl bg-pullim-slate-100 text-pullim-slate-500` + bold title (`text-pullim-slate-900 text-sm font-bold`) + `text-pullim-slate-500 text-[11px]` description. `danger` = `bg-pullim-danger/5 border-pullim-danger/30` + chip `bg-pullim-danger/10 text-pullim-danger`. `plain` = bare centered muted text (no chip/dashed). `action` href→pill `<Link>` (`bg-pullim-blue-600 hover:bg-pullim-blue-700 rounded-full px-4 py-1.5 text-[12px] font-bold text-white`); onClick→same-styled `<button>`. `size` scales padding (lg=py-10, md=py-8, sm=py-6) and chip. icon `aria-hidden`.

- [ ] **Step 1: Failing test** (`empty-state.test.tsx`):
```tsx
import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../empty-state';
it('renders neutral state with icon, title, description', () => {
  render(<EmptyState icon={Inbox} title="없어요" description="곧 표시돼요" />);
  expect(screen.getByText('없어요')).toBeInTheDocument();
  expect(screen.getByText('곧 표시돼요')).toBeInTheDocument();
});
it('href action renders a link, onClick action renders a button', () => {
  const { rerender } = render(<EmptyState title="t" action={{ href: '/x', label: '가기' }} />);
  expect(screen.getByRole('link', { name: '가기' })).toHaveAttribute('href', '/x');
  rerender(<EmptyState title="t" tone="danger" action={{ onClick: () => {}, label: '재시도' }} />);
  expect(screen.getByRole('button', { name: '재시도' })).toBeInTheDocument();
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement `empty-state.tsx`** per interface.
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Adopt in `read-state.tsx`** — refactor `ReadLoginGate` and `ReadErrorState` to compose `EmptyState`; keep their exported names/props/behavior identical (login = neutral + Lock + `action.href`; error = danger + AlertCircle + `action.onClick` retry). Preserve any `data-slot`/text the e2e specs assert (grep first).
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): EmptyState primitive; refactor read-state to compose it"`

---

### Task 3: `BackLink` primitive + 2 canonical adoptions

**Files:** Create `apps/classbot/components/classbot/back-link.tsx` + test; adopt at `app/(student)/classbot/assignment/page.tsx:52-58` and `app/(teacher)/teacher/grading/page.tsx` back-link (via TeacherPageShell later — here adopt the assignment one + `app/(student)/classbot/wellness/page.tsx:25-31`).

**Interfaces:**
```ts
export interface BackLinkProps {
  href: string;
  children?: ReactNode;
  tone?: 'slate' | 'blue-hover' | 'dark';   // default 'slate'
  iconOnly?: boolean;
  'aria-label'?: string;
  className?: string;
}
```
Behavior: `<Link href>` with leading `ArrowLeft` (h-3 w-3 label / h-4 w-4 iconOnly). slate=`text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs`; blue-hover adds `hover:text-pullim-blue-600 font-semibold`; dark=`text-pullim-slate-300 hover:text-white`. iconOnly=`h-8 w-8 rounded-lg` centered icon + required `aria-label` + `hover:bg-white/10`.

- [ ] **Step 1: Failing test** — renders link with label + href; iconOnly has aria-label and no visible text.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt 2 canonical sites** (assignment list, wellness home) — replace the hand-rolled ArrowLeft+Link with `<BackLink href=... >label</BackLink>`; remove the now-unused `ArrowLeft` import if no other use.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): BackLink primitive + 2 canonical adoptions"`

---

### Task 4: `AlertCard` + `BotNote` primitives + 1 canonical each

**Files:** Create `apps/classbot/components/classbot/alert-card.tsx`, `bot-note.tsx` + tests.

**Interfaces:**
```ts
export interface AlertCardProps { tone: 'danger' | 'warn' | 'info'; icon?: LucideIcon; title?: ReactNode; children: ReactNode; className?: string }
export interface BotNoteProps { children: ReactNode; icon?: LucideIcon; className?: string } // 봇 한 마디 — blue-50/50 tinted callout
```
Behavior: `AlertCard` = `rounded-2xl border p-4` with token tone (`danger`=`border-pullim-danger/30 bg-pullim-danger-bg`, `warn`=`border-pullim-warn/30 bg-pullim-warn-bg`, `info`=`border-pullim-blue-200 bg-pullim-blue-50`), optional icon + title (12–13px), body `text-[12px] leading-relaxed`. `BotNote` = `text-pullim-blue-700 bg-pullim-blue-50/60 rounded-lg px-3 py-2 text-[11px] leading-relaxed` with a leading `Sparkles` (default).

- [ ] **Step 1: Failing tests** — AlertCard renders title+children with tone class; BotNote renders children with Sparkles.
- [ ] **Step 2: FAIL.** **Step 3: Implement both.** **Step 4: PASS.**
- [ ] **Step 5: Canonical adopt** — AlertCard at the assignment-detail exam-warning (`app/(student)/classbot/assignment/[id]/page.tsx:75` block, tone=danger); BotNote at the assignment-detail header `reasonHint` callout (`components/classbot/assignment-overview-header.tsx:56-64`). Keep copy identical.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): AlertCard + BotNote primitives + canonical adoptions"`

---

### Task 5: `KpiStat` + `KpiStatBar` — dedup the 4 `Kpi()` functions

**Files:** Create `apps/classbot/components/classbot/kpi-stat.tsx` + test; delete local `Kpi()` in `app/(teacher)/teacher/page.tsx:237-254`, `app/(teacher)/teacher/grading/page.tsx:136-147`, `app/(teacher)/teacher/reports/page.tsx:107-115`, `components/classbot/class-kpi-bar.tsx:24-45`; adopt their call sites + the `<section><ul grid>` wrappers.

**Interfaces:**
```ts
type KpiTone = 'default' | 'accent' | 'alert' | 'success';
export interface KpiStatProps { label: string; value: string; tone?: KpiTone; icon?: LucideIcon }
export interface KpiStatBarProps { children: React.ReactNode; cols?: 2 | 3 | 4 | 6; className?: string }
```
Behavior: `KpiStat` = `<li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">`, label `text-pullim-slate-500 text-[10px] font-semibold tracking-wider uppercase` (with `h-3 w-3` icon when `icon`), value `mt-0.5 font-mono text-base font-bold` colored by tone (default→`text-pullim-slate-900`, accent→`text-pullim-blue-600`, alert→`text-pullim-danger`, success→`text-pullim-blue-500`). **tone resolved by the explicit prop — eliminates the accent-vs-alert priority bug.** `KpiStatBar` = `<section className="bg-card rounded-2xl border p-3"><ul className="grid gap-3 ...">` with cols mapping (2→grid-cols-2, 3→grid-cols-3, 4→grid-cols-2 sm:grid-cols-4, 6→grid-cols-2 sm:grid-cols-3 lg:grid-cols-6).

- [ ] **Step 1: Failing test** — KpiStat renders label+value with tone color; KpiStatBar wraps with the right grid cols class.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt** — replace all 4 local `Kpi` fns + their `<section><ul>` wrappers with `<KpiStatBar cols=...>` + `<KpiStat .../>`. Map each existing tone (accent/alert/success) to the explicit `tone` prop. `class-kpi-bar.tsx` passes `icon` + `tone="success"` items.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): KpiStat/KpiStatBar; dedup 4 teacher Kpi functions (fix tone priority)"`

---

### Task 6: `FilterPills` + `FilterPillButtons` — dedup 3 impls

**Files:** Create `apps/classbot/components/classbot/filter-pills.tsx` + test; adopt: `app/(teacher)/teacher/grading/page.tsx` (delete local `FilterChips` ~103-134; 2 call sites), `app/(teacher)/teacher/reports/page.tsx` (inline map ~59-77), `app/(student)/classbot/replay/page.tsx` (stateful button map ~55-78).

**Interfaces:**
```ts
export interface FilterOption<V extends string = string> { value: V; label: string; count?: number }
export interface FilterPillsProps<V extends string = string> { options: readonly FilterOption<V>[]; current: V; href: (value: V) => string; label?: string; className?: string }
export interface FilterPillButtonsProps<V extends string = string> { options: readonly FilterOption<V>[]; current: V; onSelect: (value: V) => void; shape?: 'pill' | 'tab'; className?: string }
```
Behavior: `FilterPills` → `<Link>` per option, `rounded-full px-3 py-1 text-[11px] font-bold transition-colors`, active=`bg-pullim-blue-600 text-white`, else=`bg-pullim-slate-100 text-pullim-slate-600 hover:bg-pullim-slate-200`; optional left `label` column. `FilterPillButtons` → `<button>`; `shape='tab'`=`rounded-lg px-3 py-1.5 text-xs`; `count`→trailing badge (`active` bg-white/20 else bg-pullim-slate-100).

- [ ] **Step 1: Failing test** — FilterPills renders links to `href(value)`, active styled; FilterPillButtons fires `onSelect`.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt** — grading 2 rows use `FilterPills` with `href` preserving the other param; reports uses `FilterPills`; replay uses `FilterPillButtons shape="tab"` + count, wired to its `setFilter` state.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): FilterPills/FilterPillButtons; dedup 3 filter implementations"`

---

### Task 7: `ComingSoonButton` + 2 canonical adoptions

**Files:** Create `apps/classbot/components/classbot/coming-soon-button.tsx` + test; adopt 2 canonical sites (`app/(teacher)/teacher/page.tsx:280-283` QuickAction disabled branch, and `components/classbot/parent-message-preview.tsx:54-57`).

**Interfaces:**
```ts
export interface ComingSoonButtonProps { children: ReactNode; note?: string; asButton?: boolean; variant?: ButtonProps['variant']; size?: ButtonProps['size']; icon?: LucideIcon; className?: string }
```
Behavior: always `disabled aria-disabled="true" title={`준비 중 (v2${note ? ` — ${note}` : ''})`}` + merged `opacity-60 cursor-not-allowed` via `cn`. `asButton`→shadcn `<Button>` (forward variant/size); else bare `<button type="button">`. icon `h-4 w-4` before children. Never fires onClick.

- [ ] **Step 1: Failing test** — renders disabled control with the v2 title; asButton variant uses shadcn Button.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt 2 canonical sites** — replace the opacity-hack disabled buttons with `<ComingSoonButton>`. (Other 6 sites deferred to PR-4/5.)
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): ComingSoonButton primitive + 2 canonical adoptions"`

---

### Task 8: `ScoreDisplay` — dedup 4 sites

**Files:** Create `apps/classbot/components/classbot/score-display.tsx` + test; adopt `rubric-editor.tsx:44` + `:64-69`, `grading/[id]/grading-detail.tsx:136-138` + `:185-190`.

**Interfaces:**
```ts
export interface ScoreDisplayProps { score: number; max: number; size?: 'sm' | 'md' | 'lg' | 'xl'; tone?: 'fixed-accent' | 'threshold' | 'inverse'; denomScale?: 'sm' | 'base'; className?: string }
```
Behavior: `<div className="font-mono font-bold {sizeClass}">{score}<span className="text-pullim-slate-400 {denomClass}">/{max}</span></div>`. size: sm=text-xs, md=text-sm, lg=text-xl, xl=text-2xl. numerator color by tone: fixed-accent→`text-pullim-blue-600`; inverse→`text-white`; threshold→`pct=score/max*100` → `cn(pct>=80?'text-pullim-blue-700':pct>=60?'text-pullim-blue-500':'text-pullim-slate-500')` on the numerator span only. denom span size = sm for lg, base for xl.

- [ ] **Step 1: Failing test** — threshold tone colors numerator by pct; inverse renders white numerator.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt 4 sites** — rubric total (lg, fixed-accent), rubric item (md, threshold by score/weight), grading-detail action bar (xl, inverse), history row (sm, threshold). Reconcile the rubric-vs-detail size mismatch via the shared component.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): ScoreDisplay; dedup 4 score readouts (reconcile rubric/detail)"`

---

### Task 9: `TeacherPageShell` + 2 canonical adoptions

**Files:** Create `apps/classbot/components/classbot/teacher-page-shell.tsx` + test; adopt `app/(teacher)/teacher/grading/page.tsx:46-59` and `app/(teacher)/teacher/reports/page.tsx:33-46`.

**Interfaces:**
```ts
export interface TeacherPageShellProps {
  backHref: string; backLabel: string;
  header: React.ComponentProps<typeof PageHeader>;
  spacing?: 'space-y-4' | 'space-y-5';
  children: React.ReactNode;
}
```
Behavior: `<div className={cn(spacing ?? 'space-y-4', 'py-4 lg:py-6')}>` → `<BackLink href={backHref}>{backLabel}</BackLink>` (reuse Task 3 primitive) → `<PageHeader {...header} />` → children.

- [ ] **Step 1: Failing test** — renders back-link, header title, and children.
- [ ] **Step 2: FAIL.** **Step 3: Implement** (compose `BackLink` + `PageHeader`). **Step 4: PASS.**
- [ ] **Step 5: Adopt 2 canonical teacher list pages** (grading, reports) — replace the `div + back-link + PageHeader` trio with `<TeacherPageShell>`. (Remaining 4 back-link teacher pages deferred to PR-5.)
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): TeacherPageShell + 2 canonical adoptions"`

---

### Task 10: `BotIdentityCard` + adopt `bot-header.tsx` (NOT chat)

**Files:** Create `apps/classbot/components/classbot/bot-identity-card.tsx` + test; adopt `components/classbot/bot-header.tsx` (the whole `BotHeader` becomes `BotIdentityCard density="comfortable"`; its scope badge + live footer become `children`). **Do NOT touch `chat/page.tsx`** — that adoption (with collapse/back/liner) is PR-3.

**Interfaces:**
```ts
export interface BotIdentityCardProps {
  bot: ClassBot;
  density?: 'comfortable' | 'compact';      // default comfortable
  headingLevel?: 'h1' | 'h2' | 'span';      // default h1
  collapsed?: boolean;
  leading?: React.ReactNode; trailing?: React.ReactNode; children?: React.ReactNode;
  showSignatureLiner?: boolean; className?: string;
}
```
Behavior: dark gradient panel `rounded-2xl border bg-gradient-to-br from-pullim-slate-900 to-pullim-blue-900 text-white shadow-pullim-lg`. Top row: `leading` slot, avatar (bg `botSignature(bot).hex` inline style; `pullim-anim-bot-breath` when `bot.isLive`; shrinks when collapsed), identity column (org eyebrow / name in `headingLevel` / "{teacherName}의 디지털 분신" / `Shield`+`scopeMeta[bot.scope]` badge —한글 label + mono code), `trailing` slot. subject/grade + tone chips and `children` hidden when `collapsed`. `showSignatureLiner`→ absolute `pullim-anim-liner-swipe` bar in signature hex. No literal colors except the data-driven signature hex (allowed — token-derived).

- [ ] **Step 1: Failing test** — renders bot name as h1; collapsed hides org eyebrow; live bot avatar gets breath class.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt in `bot-header.tsx`** — replace BotHeader's body with `<BotIdentityCard>`; map its `compact`/`headingLevel` props to `density`/`headingLevel`; scope badge + live footer → `children`. Preserve BotHeader's exported signature so its callers are unaffected.
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): BotIdentityCard; adopt in bot-header (chat adoption deferred to PR-3)"`

---

### Task 11: `ContextRail` + 1 canonical adoption

**Files:** Create `apps/classbot/components/shell/context-rail.tsx` + test; adopt `app/(teacher)/teacher/reports/[id]/page.tsx` (the `lg:grid-cols-[1fr_320px]` grid ~108 + `<aside>` ~118-134 → `<ContextRail rail={...}>`).

**Interfaces:**
```ts
export interface ContextRailProps { children: React.ReactNode; rail?: React.ReactNode; railWidth?: 'sm' | 'md' | 'lg'; stickyRail?: boolean; railGap?: 2 | 3 | 4; className?: string }
```
Behavior: `grid grid-cols-1 gap-4`, becomes `lg:grid-cols-[1fr_<w>px]` when `rail` present (sm=280/md=320/lg=360). `children` in a `min-w-0 space-y-4` primary column; `rail` in `<aside className="space-y-{railGap}">`; `stickyRail`→`lg:sticky lg:top-...`. No `rail` → single-column passthrough.

- [ ] **Step 1: Failing test** — single column when no rail; renders aside content when rail provided.
- [ ] **Step 2: FAIL.** **Step 3: Implement.** **Step 4: PASS.**
- [ ] **Step 5: Adopt at reports/[id]** — wrap the page body in `<ContextRail railWidth="md" rail={<>{wellbeing + memo}</>}>{leftContent}</ContextRail>`; ensure the left column renders content for ALL report kinds (the audit flagged it goes empty for non-parent — put summary/body left so the grid is never half-empty).
- [ ] **Step 6: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 7: Commit** — `git commit -m "feat(shell): ContextRail + canonical adoption (reports detail)"`

---

### Task 12: Vendor CUDS dep-free charts + chart tokens

**Files:**
- Create: `apps/classbot/components/charts/{donut,heatmap,bullet,chart-tokens}.tsx|ts` + `index.ts` (trimmed barrel — Donut/Heatmap/BulletChart [+ optionally useChartTokens]; NO recharts exports)
- Create test: `apps/classbot/components/charts/__tests__/charts.test.tsx`
- Modify: `apps/classbot/app/globals.css` (add chart tokens)

**Interfaces:** vendor the CUDS source from `/tmp/cuds/packages/ui/charts/{donut,heatmap,bullet}.tsx` and `chart-tokens.ts` verbatim except swap `import { cn } from "../../utils/cn"` → `import { cn } from "@/lib/utils"`. (Donut/Heatmap/Bullet `forwardRef`, `"use client"`.)

- [ ] **Step 1: Add chart tokens to `globals.css` `:root`** mapping to existing pullim tokens:
  - `--chart-cat-1..8`: cat-1 `var(--color-pullim-blue-600)`, cat-2 `var(--color-pullim-blue-400)`, cat-3 `var(--color-bot-science)`, cat-4 `var(--color-pullim-success)`, cat-5 `var(--color-bot-korean)`, cat-6 `var(--color-pullim-lemon)`, cat-7 `var(--color-bot-english)`, cat-8 `var(--color-pullim-info)`.
  - Heatmap: `--surface-sunken: var(--color-pullim-slate-100)`, `--color-primary-100: var(--color-pullim-blue-100)`, `-300/-500/-700` → pullim-blue-300/500/700.
  - Bullet: `--color-action-primary: var(--color-pullim-blue-600)`, `--color-success-500: var(--color-pullim-success)`, `--color-warning-500: var(--color-pullim-warn)`, `--color-danger-500: var(--color-pullim-danger)`.
  - Shared: `--text-primary: var(--foreground)`, `--text-secondary: var(--color-pullim-slate-600)`, `--text-tertiary: var(--color-pullim-slate-500)`, `--border-subtle: var(--border)`, `--text-xs: 0.75rem`, `--text-sm: 0.875rem`. (`--radius-xs`, `--font-mono` already exist.)

- [ ] **Step 2: Vendor the 4 chart files + barrel** with the cn swap. Write a focused render test:
```tsx
import { render } from '@testing-library/react';
import { Donut } from '../donut';
it('Donut renders an svg with one path per segment', () => {
  const { container } = render(<Donut segments={[{ label: 'a', value: 3 }, { label: 'b', value: 1 }]} />);
  expect(container.querySelector('svg')).not.toBeNull();
});
```
- [ ] **Step 3: Run — PASS** (`bun run test -- charts`). The CI hex gate scans `components/**` — the vendored files must use `var(--*)` (CUDS source already does); if any literal hex slips through, the gate fails — fix by mapping to a token.
- [ ] **Step 4: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(charts): vendor CUDS dep-free Donut/Heatmap/Bullet + chart tokens"`

---

### Task 13: Vendor CUDS layout primitives (gap → Tailwind)

**Files:** Create `apps/classbot/components/layout/{flex,stack,grid}.tsx` + `index.ts` + a test. Vendor from `/tmp/cuds/packages/ui/layout/`.

**Interfaces:** `Flex`/`Stack`/`Grid` per CUDS; swap `cn` import; **replace inline `gap: var(--space-N)` with Tailwind `gap-${n}` classes via `cn`** (and `gap-x-*`/`gap-y-*` for Grid's `gapY`). Stack = `<Flex direction="column">`. `index.ts` re-exports all three + prop types.

- [ ] **Step 1: Implement the 3 files** with the gap→Tailwind refactor (e.g. `gap={4}` → `gap-4`).
- [ ] **Step 2: Test:**
```tsx
import { render, screen } from '@testing-library/react';
import { Flex, Stack, Grid } from '../index';
it('Flex/Stack/Grid render children and map gap to a Tailwind class', () => {
  const { container } = render(<Flex gap={4}><span>x</span></Flex>);
  expect(screen.getByText('x')).toBeInTheDocument();
  expect(container.firstChild).toHaveClass('gap-4');
});
```
- [ ] **Step 3: Run — PASS.** **Step 4: Verify** — `bun run test && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(layout): vendor CUDS Flex/Stack/Grid (gap mapped to Tailwind)"`

---

### Task 14: PR-2b verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && ... lint && ... test && ... build` all pass (lint runs gates; the new primitive tests raise the suite count).
- [ ] **Step 2: prod-verify invariants** — `x-build-sha` present; e2e baseURL pattern unchanged; grep `apps/classbot/tests/e2e` for any selector the adopted files changed (read-state, bot-header, replay, teacher lists) — none should break.
- [ ] **Step 3: Boot smoke** — `bun run dev`; curl `/classbot`, `/teacher/grading`, `/teacher/reports`, `/classbot/replay` → 200. Stop dev.
- [ ] **Step 4: Done** — fix any gap in the owning task's file, re-run Step 1, commit `fix(ui): <what>`.

---

## Self-Review

**Spec coverage (design §5 primitives + vendoring):** EmptyState/BackLink/AlertCard/BotNote → T2-4; KpiStat/FilterPills/ComingSoonButton/ScoreDisplay/TeacherPageShell → T5-9; BotIdentityCard/ContextRail → T10-11; Sparkbar/heatColor → T1; CUDS charts+layout vendoring → T12-13. LiveBadge was PR-2a. ✅ Deferred (correctly): mass adoption of BackLink/EmptyState/ComingSoonButton/TeacherPageShell to PR-4/5; chat BotIdentityCard adoption to PR-3; recharts charts to the page PR that needs line/bar.

**Placeholder scan:** every primitive has a verbatim interface + behavior + named adoption sites; tests have real assertions. ✅

**Type consistency:** `BackLink` (T3) reused by `TeacherPageShell` (T9); `heatColor` (T1) consumed by Sparkbar replay adoption (T1 step 5); `KpiTone`/`FilterOption`/`ScoreDisplayProps` names stable. ✅

**Risk note:** T1, T10 touch larger existing files (replay-player, wellbeing-gauge, bot-header) with `data-slot`/e2e exposure — each task greps e2e first and preserves attributes. The vendored chart/layout files must stay hex-free to pass the gate (CUDS source is token-based; verify on vendor).
