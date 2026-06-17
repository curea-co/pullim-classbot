# CUDS PR-2a Shell & Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the app shell to CUDS variant-B — a shell-owned right-rail context (for the chat page in PR-3), a `LiveBadge` primitive, collapsed empty breadcrumb band, unified chrome surfaces/radii, one consistent sidebar active-state, bottom-nav safe-area, a reachable dark-mode toggle, and PageHeader/SectionHeading type-scale fixes — with zero runtime breakage of the 29 pages.

**Architecture:** AppShell renders only in the two role layouts (no per-page layout), so the right rail is a **shell-owned React context** a page populates via `useSetRightRail(node)`, rendered by a client `RightRailAside` as an optional 3rd column. All other changes are token/class refinements to existing shell components. Adoption is canonical-site only; mass primitive adoption happens in later page PRs.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens from PR-1), shadcn, `next-themes` (already a dep), Jest + `@testing-library/react`.

## Global Constraints

- Tokens only — no hardcoded hex in `components/**` (CI gate from PR-1 enforces). Use `--color-pullim-*` Tailwind classes + `--radius-*` tokens. Chrome radii route through tokens (`rounded-xl`/`rounded-[var(--radius-md)]`), never bare `rounded-lg` where it bypasses the scale.
- Variant-B: radius md=16px; soft shadows (`shadow-pullim-*`); spacious touch targets ≥44px for header/nav controls.
- LIVE motion uses the `pullim-anim-live-pulse` keyframe class (never raw `animate-pulse`).
- Korean typography preserved; 11px (`text-[11px]`) only for Latin/number micro-labels; Korean ≥12px.
- `<html lang="ko">`, the `x-build-sha` meta, and the prod-verify e2e selectors must remain intact. Before changing any shell class an e2e spec might assert, grep `apps/classbot/tests/e2e/` for it.
- Single nav source of truth (`nav-config.ts`) — do not duplicate nav. Per `apps/classbot/CLAUDE.md §5`, shell/nav structural changes are user-approved (this redesign is approved).
- Work on branch `feat/cuds-pr2a-shell` (already created, stacked on PR-1). Commit per task; don't push unless asked. Verify per task from `apps/classbot/`: `bun run typecheck && bun run test && bun run build && bun run gates`.

---

### Task 1: `LiveBadge` primitive + adopt the sidebar LIVE marker

**Files:**
- Create: `apps/classbot/components/classbot/live-badge.tsx`
- Create: `apps/classbot/components/classbot/__tests__/live-badge.test.tsx`
- Modify: `apps/classbot/components/shell/app-sidebar.tsx:221-232` (the `item.badge === 'LIVE'` branch → `LiveBadge`)

**Interfaces:**
- Produces: `LiveBadge` with `interface LiveBadgeProps { variant?: 'pill' | 'dot'; size?: 'xs' | 'sm'; children?: React.ReactNode; 'aria-label'?: string; className?: string }`. `pill` (default) = `bg-pullim-danger rounded-full px-1.5 py-0.5 ... text-white font-bold uppercase tracking-wider` with an inner `<span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />` then text `LIVE`, optional trailing `children`. `dot` = bare `bg-pullim-danger pullim-anim-live-pulse h-1.5 w-1.5 rounded-full` with `aria-label` (default `'라이브 진행 중'`). `size` scales text/padding only.

- [ ] **Step 1: Write the failing test**

Create `apps/classbot/components/classbot/__tests__/live-badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LiveBadge } from '../live-badge';

describe('LiveBadge', () => {
  it('pill variant renders LIVE text with the shared pulse keyframe class', () => {
    const { container } = render(<LiveBadge />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(container.querySelector('.pullim-anim-live-pulse')).not.toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
  it('dot variant has an accessible label and no LIVE text', () => {
    render(<LiveBadge variant="dot" />);
    expect(screen.queryByText('LIVE')).toBeNull();
    expect(screen.getByLabelText('라이브 진행 중')).toBeInTheDocument();
  });
  it('pill renders trailing children', () => {
    render(<LiveBadge><span>12:30</span></LiveBadge>);
    expect(screen.getByText('12:30')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — `cd apps/classbot && bun run test -- live-badge` → FAIL (module missing).

- [ ] **Step 3: Implement `live-badge.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LiveBadgeProps {
  variant?: 'pill' | 'dot';
  size?: 'xs' | 'sm';
  children?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

export function LiveBadge({ variant = 'pill', size = 'xs', children, className, ...rest }: LiveBadgeProps) {
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[10px]';
  if (variant === 'dot') {
    return (
      <span
        aria-label={rest['aria-label'] ?? '라이브 진행 중'}
        className={cn('bg-pullim-danger pullim-anim-live-pulse inline-block h-1.5 w-1.5 rounded-full', className)}
      />
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('bg-pullim-danger inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold tracking-wider text-white uppercase', textSize)}>
        <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" aria-hidden />
        LIVE
      </span>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run — expect PASS** — `cd apps/classbot && bun run test -- live-badge` → 3 pass.

- [ ] **Step 5: Adopt in the sidebar (kill `animate-pulse`)**

In `app-sidebar.tsx`, import `LiveBadge` and replace the `item.badge === 'LIVE'` branch (the `<span className={cn('rounded-full ...', item.badge === 'LIVE' ? 'bg-pullim-danger animate-pulse text-white' : ...)}>` at ~221-232) so that when `item.badge === 'LIVE'` it renders `<LiveBadge />`, and otherwise renders the existing neutral `bg-pullim-slate-100 text-pullim-slate-600` count pill. Keep non-LIVE badges unchanged.

- [ ] **Step 6: Verify** — `cd apps/classbot && bun run test -- live-badge && bun run typecheck && bun run gates` → all pass.

- [ ] **Step 7: Commit**

```bash
git add apps/classbot/components/classbot/live-badge.tsx apps/classbot/components/classbot/__tests__/live-badge.test.tsx apps/classbot/components/shell/app-sidebar.tsx
git commit -m "feat(shell): LiveBadge primitive + adopt sidebar LIVE marker (drop animate-pulse)"
```

---

### Task 2: Shell-owned right-rail context + optional 3rd column

**Files:**
- Create: `apps/classbot/components/shell/right-rail-context.tsx`
- Create: `apps/classbot/components/shell/__tests__/right-rail-context.test.tsx`
- Modify: `apps/classbot/components/shell/app-shell.tsx`

**Interfaces:**
- Produces:
  - `RightRailProvider({ children })` — client provider holding `ReactNode | null`.
  - `useSetRightRail(node: ReactNode): void` — client hook a page calls to register rail content; clears on unmount (effect deps `[node]`).
  - `RightRailAside({ className? })` — client component rendering the current node inside an `<aside>`; returns `null` when node is null (so no empty bordered column).
- Consumed by: PR-3 (chat) via `useSetRightRail`. No consumer in this PR beyond the test.

- [ ] **Step 1: Write the failing test**

Create `apps/classbot/components/shell/__tests__/right-rail-context.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { RightRailProvider, RightRailAside, useSetRightRail } from '../right-rail-context';

function RailSetter({ label }: { label: string }) {
  useSetRightRail(<div>{label}</div>);
  return <p>page</p>;
}

describe('right-rail context', () => {
  it('aside is empty (renders nothing) when no page sets rail content', () => {
    const { container } = render(
      <RightRailProvider><RightRailAside /><p>main</p></RightRailProvider>
    );
    expect(container.querySelector('aside')).toBeNull();
  });
  it('aside renders the node a page registers via useSetRightRail', () => {
    render(
      <RightRailProvider>
        <RailSetter label="rail-x" />
        <RightRailAside />
      </RightRailProvider>
    );
    expect(screen.getByText('rail-x')).toBeInTheDocument();
    expect(screen.getByText('page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** — `cd apps/classbot && bun run test -- right-rail` → FAIL.

- [ ] **Step 3: Implement `right-rail-context.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RailCtx = { node: ReactNode; setNode: (n: ReactNode) => void };
const Ctx = createContext<RailCtx | null>(null);

export function RightRailProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  return <Ctx.Provider value={{ node, setNode }}>{children}</Ctx.Provider>;
}

/** Page-side: register right-rail content; clears on unmount. */
export function useSetRightRail(node: ReactNode): void {
  const ctx = useContext(Ctx);
  useEffect(() => {
    ctx?.setNode(node);
    return () => ctx?.setNode(null);
  }, [ctx, node]);
}

/** Shell-side: renders the 3rd column when a page registered content. */
export function RightRailAside({ className }: { className?: string }) {
  const node = useContext(Ctx)?.node ?? null;
  if (!node) return null;
  return (
    <aside className={cn('border-pullim-slate-200 bg-card hidden w-80 shrink-0 overflow-y-auto border-l lg:flex lg:flex-col', className)}>
      {node}
    </aside>
  );
}
```

- [ ] **Step 4: Run — expect PASS** — `cd apps/classbot && bun run test -- right-rail` → 2 pass.

- [ ] **Step 5: Wire into AppShell**

In `app-shell.tsx`: import `RightRailProvider, RightRailAside`. Wrap the whole shell `<div className="bg-pullim-slate-50 flex h-screen flex-col">…</div>` tree in `<RightRailProvider>`. Inside the `<div className="flex flex-1 overflow-hidden">` row, add `<RightRailAside />` as the LAST child (after `<main>`). AppShell stays a server component; the provider/aside are client and compose fine.

- [ ] **Step 6: Verify** — `cd apps/classbot && bun run test -- right-rail && bun run typecheck && bun run build && bun run gates` → all pass (build proves the server/client composition is valid).

- [ ] **Step 7: Commit**

```bash
git add apps/classbot/components/shell/right-rail-context.tsx apps/classbot/components/shell/__tests__/right-rail-context.test.tsx apps/classbot/components/shell/app-shell.tsx
git commit -m "feat(shell): shell-owned right-rail context + optional 3rd column (for chat PR-3)"
```

---

### Task 3: Collapse the empty breadcrumb band

**Files:**
- Modify: `apps/classbot/components/shell/breadcrumb.tsx` (own the sticky band)
- Modify: `apps/classbot/components/shell/app-shell.tsx:41-46` (render `<Breadcrumb>` directly)

**Interfaces:**
- Produces: `Breadcrumb` renders its own sticky band wrapper and returns `null` (whole band) when `trail.length <= 1`, so top-level pages have no empty 36px strip.

- [ ] **Step 1: Move the band into Breadcrumb**

In `breadcrumb.tsx`, keep the early `if (trail.length <= 1) return null;`. Wrap the returned `<nav>` in the sticky band currently in app-shell:
```tsx
return (
  <div className="bg-pullim-slate-50/80 border-b border-pullim-slate-200/70 sticky top-0 z-10 backdrop-blur-md">
    <div className="mx-auto flex h-9 w-full max-w-[1280px] items-center px-4 md:px-6 xl:px-8">
      <nav aria-label="현재 위치" className="text-pullim-slate-500 flex flex-wrap items-center gap-1 text-xs">
        {/* …existing trail map… */}
      </nav>
    </div>
  </div>
);
```

- [ ] **Step 2: Simplify app-shell**

In `app-shell.tsx`, replace the band block (lines 41-46) with just `<Breadcrumb role={role} />` as the first child of `<main>`. The page-content `<div>` stays.

- [ ] **Step 3: Verify (build + visual)** — `cd apps/classbot && bun run build && bun run gates`, then `bun run dev`, confirm `/classbot` (top-level) shows NO empty band and `/classbot/assignment/x` (deep) DOES show the breadcrumb band. Stop dev.

- [ ] **Step 4: Commit**

```bash
git add apps/classbot/components/shell/breadcrumb.tsx apps/classbot/components/shell/app-shell.tsx
git commit -m "fix(shell): breadcrumb owns its band — no empty 36px strip on top-level pages"
```

---

### Task 4: Unify chrome surfaces + tokenize radii + 44px header buttons

**Files:**
- Modify: `apps/classbot/components/shell/app-header.tsx` (header surface + icon buttons)
- Modify: `apps/classbot/components/shell/app-shell.tsx:34` (sidebar surface)

**Interfaces:** none new (visual/token only).

- [ ] **Step 1: One continuous chrome surface**

In `app-header.tsx:39`, change `bg-card/85` → `bg-card/90 supports-[backdrop-filter]:bg-card/75` so the header reads as the same chrome surface as the sidebar (`bg-card`) over the `bg-pullim-slate-50` canvas, removing the three-way seam. (Sidebar in `app-shell.tsx:34` already uses `bg-card` — leave it.)

- [ ] **Step 2: 44px tokenized header icon buttons**

In `app-header.tsx`, change both icon buttons (`아이콘 검색`/`알림`, lines ~63-76) from `h-9 w-9 ... rounded-lg` to `h-10 w-10 ... rounded-xl` (40px → closer to touch target; `rounded-xl`=20px token). Keep the search `title="검색 (⌘ K)"`; the notification dot stays `bg-pullim-danger`.

- [ ] **Step 3: Verify** — `cd apps/classbot && bun run build && bun run gates` → pass. Visual smoke: header/sidebar read as one surface, buttons rounder/larger.

- [ ] **Step 4: Commit**

```bash
git add apps/classbot/components/shell/app-header.tsx
git commit -m "style(shell): unify header/sidebar chrome surface + tokenized 44px icon buttons"
```

---

### Task 5: One sidebar active-state language (both nav levels)

**Files:**
- Modify: `apps/classbot/components/shell/app-sidebar.tsx` (`NavRow` active ~204-205, `SubNavRow` active ~276)

**Interfaces:** none new.

- [ ] **Step 1: Add a left accent bar to NavRow active**

In `NavRow`, the active class is `bg-pullim-blue-50 text-pullim-blue-700`. Add a left accent: change the active branch to `bg-pullim-blue-50 text-pullim-blue-700 relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-pullim-blue-600`. (Keep `min-h-11 px-2 py-2`.)

- [ ] **Step 2: Make SubNavRow active match (drop the loud solid-blue)**

In `SubNavRow`, change active from `bg-pullim-blue-600 text-white shadow-pullim-sm` to the same tinted language: `bg-pullim-blue-50 text-pullim-blue-700 relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-pullim-blue-600`. Update the locked-badge active branch (`active ? 'bg-white/15 text-white/80' : ...`) to the non-active neutral `bg-pullim-slate-100 text-pullim-slate-500` since the row is no longer dark.

- [ ] **Step 3: Guard e2e** — `grep -rn "blue-600\|aria-current\|bg-pullim-blue-50" apps/classbot/tests/e2e` — confirm no spec asserts the old solid-blue sub-item style. If one does, note it for the reviewer.

- [ ] **Step 4: Verify** — `cd apps/classbot && bun run build && bun run gates`. Visual: parent + active child both read as tinted-with-accent-bar; depth reads via indent, not weight.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/components/shell/app-sidebar.tsx
git commit -m "style(shell): one sidebar active-state language (tint + accent bar) at both levels"
```

---

### Task 6: Bottom-nav safe-area + active indicator

**Files:**
- Modify: `apps/classbot/components/shell/bottom-nav.tsx`

**Interfaces:** none new.

- [ ] **Step 1: Safe-area inset**

On the `<nav>` (line 18), add safe-area bottom padding: append `pb-[env(safe-area-inset-bottom)]` to the className so labels clear the home indicator on notched phones.

- [ ] **Step 2: Active indicator**

In the tab `<Link>`, when `active`, add a top indicator bar: wrap or prepend `<span aria-hidden className="bg-pullim-blue-600 absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />` (make the `<Link>` `relative`). Keep the active text color `text-pullim-blue-600`.

- [ ] **Step 3: Verify** — `cd apps/classbot && bun run build && bun run gates`. Visual at 390px: active tab shows top bar, labels clear the home indicator, no overflow.

- [ ] **Step 4: Commit**

```bash
git add apps/classbot/components/shell/bottom-nav.tsx
git commit -m "fix(shell): bottom-nav safe-area inset + active indicator bar"
```

---

### Task 7: PageHeader/SectionHeading type scale + honest tone tokens

**Files:**
- Modify: `apps/classbot/components/shell/page-header.tsx`
- Modify: `apps/classbot/components/shell/section-heading.tsx`

**Interfaces:**
- Produces: `PageHeader`/`SectionHeading` description → `text-sm` (was `text-xs`); `PageHeader` eyebrow `toneClass` maps to real semantic tokens (PR-1 restored them): `warn: 'text-pullim-warn'`, `success: 'text-pullim-success'`, `danger: 'text-pullim-danger'`, `blue: 'text-pullim-blue-600'`.

- [ ] **Step 1: Fix PageHeader**

In `page-header.tsx`: change `toneClass` to `{ blue: 'text-pullim-blue-600', warn: 'text-pullim-warn', danger: 'text-pullim-danger', success: 'text-pullim-success' }` (no more warn/success rendering as blue). Change the description `<p>` from `text-xs` to `text-sm`.

- [ ] **Step 2: Fix SectionHeading**

In `section-heading.tsx`: change the description `<p>` from `text-xs` to `text-sm` for the same body tier as PageHeader.

- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates` → pass.

- [ ] **Step 4: Commit**

```bash
git add apps/classbot/components/shell/page-header.tsx apps/classbot/components/shell/section-heading.tsx
git commit -m "style(shell): page/section header description text-sm + honest eyebrow tone tokens"
```

---

### Task 8: Reachable dark-mode toggle (next-themes)

**Files:**
- Create: `apps/classbot/components/providers/theme-provider.tsx`
- Modify: `apps/classbot/app/layout.tsx` (wrap with ThemeProvider; the `.dark` variant uses `class` strategy — note `globals.css` uses `@custom-variant dark (&:is(.dark *))`)
- Modify: `apps/classbot/components/shell/app-header.tsx` (`ProfileMenu` — add toggle item)

**Interfaces:**
- Produces: a `ThemeProvider` wrapping `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}` (light-first per spec §1.5). A dark/light toggle `DropdownMenuItem` in `ProfileMenu`.

- [ ] **Step 1: ThemeProvider**

Create `apps/classbot/components/providers/theme-provider.tsx`:
```tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

- [ ] **Step 2: Wrap layout**

In `app/layout.tsx`, import `ThemeProvider` and wrap the body's provider tree (inside `<body>`, outermost around `QueryProvider`): `<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>…</ThemeProvider>`. The `<html>` already has `suppressHydrationWarning` (required by next-themes) — confirm it's present (it is, line 67).

- [ ] **Step 3: Toggle in ProfileMenu**

In `app-header.tsx` `ProfileMenu`, import `useTheme` from `next-themes` and `Sun, Moon` from `lucide-react`. Add, above the logout item, a `DropdownMenuItem` that toggles: `const { resolvedTheme, setTheme } = useTheme();` then an item `onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}` rendering `{resolvedTheme === 'dark' ? <Sun/Moon...>}` with label `다크 모드`/`라이트 모드`. Guard against hydration mismatch by only reading `resolvedTheme` after mount (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);` and default the icon/label to light when `!mounted`).

- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Then `bun run dev`, open `/classbot`, open profile menu, toggle dark — confirm `.dark` applies and surfaces recolor (per spec §1.5 full per-page dark QA is deferred; just confirm the toggle works and chrome recolors). Stop dev.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/components/providers/theme-provider.tsx apps/classbot/app/layout.tsx apps/classbot/components/shell/app-header.tsx
git commit -m "feat(shell): reachable dark-mode toggle via next-themes (light default)"
```

---

### Task 9: PR-2a verification gate

**Files:** none (verification only).

- [ ] **Step 1: Full CI** — from repo root: `bun --filter @pullim-classbot/classbot typecheck && bun --filter @pullim-classbot/classbot lint && bun --filter @pullim-classbot/classbot test && bun --filter @pullim-classbot/classbot build` → all pass (lint runs the gates).

- [ ] **Step 2: prod-verify invariants** — `grep -n x-build-sha apps/classbot/app/layout.tsx` present; `grep -rn "PLAYWRIGHT_BASE_URL" apps/classbot/tests/e2e | head -1` unchanged.

- [ ] **Step 3: Boot smoke** — `bun run dev`; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3032/classbot` and `/teacher` and `/classbot/assignment` → all 200. Visually confirm: no empty breadcrumb band on home, unified chrome surface, sidebar accent-bar active state, dark toggle works, bottom-nav indicator at 390px. Stop dev.

- [ ] **Step 4: Done** — if smoke surfaces a gap, fix in the owning task's file, re-run Step 1, commit `fix(shell): <what>`. Otherwise PR-2a is complete.

---

## Self-Review

**Spec coverage (design §3 shell goals):** rightRail → Task 2; breadcrumb collapse → Task 3; surface unification + radii → Task 4; active-state → Task 5; bottom-nav safe-area → Task 6; LIVE badge class → Task 1; dark toggle → Task 8; PageHeader/SectionHeading type scale + tone → Task 7. ✅ Deferred (correctly, to PR-2b/3/5): mass LiveBadge adoption in live/teacher components, BotIdentityCard, ContextRail, page-content type-scale sweep.

**Placeholder scan:** every code step shows full code or exact class edits; no TBD. ✅

**Type consistency:** `LiveBadge` props (Task 1) consumed unchanged; `useSetRightRail`/`RightRailAside`/`RightRailProvider` names consistent across Task 2 and its test. ✅

**Risk note for executor:** Tasks 4–6 change shell classes the prod-verify e2e specs might assert (color/active-state). Each task includes an e2e grep guard; if a spec keys on a changed class, surface it to the reviewer rather than silently changing the spec.
