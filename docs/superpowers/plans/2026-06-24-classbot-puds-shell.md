# classbot → PUDS Dashboard Shell Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace classbot's home-grown `AppShell` chrome with the PUDS `@puds/DashboardShell` and migrate classbot's tokens to the PUDS pullim-os look, unifying both student & teacher surfaces with the Pullim design system.

**Architecture:** Consume PUDS via the live `@puds` shadcn registry (classbot already has shadcn 4.11). Install PUDS tokens + set `data-theme="pullim-os"`, and value-remap classbot's shadcn semantic tokens to PUDS values (palette already matches) so existing components re-skin. Rewrite `AppShell` to compose `@puds/DashboardShell` with `OsRail`/`OsTabbar` fed by a new nav adapter over the existing `nav-config`, the existing header actions in the `actions` slot, and the existing `Breadcrumb` in content. Drop the context-driven right-rail (mechanism A) and sidebar-collapse (accepted).

**Tech Stack:** Next 16, React 19, Tailwind v4, shadcn 4.11 (namespaced registries), Bun + Turbo, Jest (unit), Playwright (e2e), lucide-react, next-themes.

## Global Constraints

- **Repo/app:** `pullim-classbot`, app `apps/classbot`. Branch `feat/classbot-puds-shell` (off `dev`). Run app commands via `bun --filter @pullim-classbot/classbot <script>` or from `apps/classbot` with `bun run <script>` / `bunx`.
- **PUDS registry URL:** `https://pullim-design-system.vercel.app/r/{name}.json`, namespace `@puds`. shadcn ≥3 required (classbot has 4.11 ✓).
- **PUDS components consume CUDS tokens** (`--color-action-primary`, `--text-*`, `--surface-*`, `--border-default`, `--radius-*`, `--color-primary-*`, `--color-secondary-500`, `--font-*`); these arrive via `@puds/theme-puds` (`app/tokens/_base.css` + `pullim-os.css`) and `data-theme="pullim-os"`.
- **cn coexistence:** classbot's cn is `@/lib/utils`; PUDS installs its own `lib/cn.ts` and its components import `@/lib/cn`. Both coexist; do not merge.
- **Accepted feature loss:** context right-rail (mechanism A: `right-rail-context`/`RightRailAside`/`useSetRightRail`), sidebar-collapse, and rich grouped/nested sidebar nav (flattened into `OsRail`). Dark mode kept dormant (`.dark` block stays; `data-theme="pullim-os"` forces light).
- **Do NOT touch mechanism B** (`context-rail.tsx` / `ContextRail`, used by 7 pages) — it is page-level, independent of the shell, and stays.
- **Design gates:** `apps/classbot` has `bun run gates` (`scripts/check-design-gates.mjs`). Run it after token changes; if it asserts on a token you changed, adapt the gate or the value (note which).
- **Test-first** for the nav adapter (pure logic). Shell/token tasks verified by typecheck + build + render smoke + browser visual.

---

## File Structure

```
apps/classbot/
  components.json                      # + @puds registry
  app/globals.css                      # + import PUDS tokens; remap shadcn tokens → PUDS values
  app/layout.tsx                       # + data-theme="pullim-os" on <html>
  app/tokens/_base.css                 # NEW (installed by shadcn add @puds/theme-puds)
  app/tokens/pullim-os.css             # NEW (installed)
  components/ui/<puds>.tsx             # NEW (dashboard-shell, service-switcher, page-header, os-rail, os-tabbar, service-icon)
  lib/cn.ts                            # NEW (installed @puds/cn)
  hooks/use-reduced-motion.ts          # NEW (installed)
  components/shell/nav-adapter.ts      # NEW: nav-config → OsRail/OsTabbar items
  components/shell/nav-adapter.test.ts # NEW (jest)
  components/shell/app-header.tsx      # MODIFY: export AppBrand + AppHeaderActions
  components/shell/app-shell.tsx       # REWRITE: compose @puds/DashboardShell
  app/(student)/classbot/chat/page.tsx # MODIFY: drop useSetRightRail call
  components/shell/__tests__/right-rail-context.test.tsx  # DELETE (mechanism A removed)
```

---

## Task 1: Consume PUDS — registry config + install

**Files:**
- Modify: `apps/classbot/components.json`

**Interfaces:**
- Produces: PUDS components + tokens installed under `apps/classbot` (`components/ui/*`, `lib/cn.ts`, `hooks/use-reduced-motion.ts`, `app/tokens/*`).

- [ ] **Step 1: Add the `@puds` registry** to `apps/classbot/components.json` — change `"registries": {}` to:

```json
  "registries": { "@puds": "https://pullim-design-system.vercel.app/r/{name}.json" }
```

- [ ] **Step 2: Install the shell components + tokens**

Run (from `apps/classbot`): `bunx shadcn@latest add @puds/theme-puds @puds/dashboard-shell @puds/service-switcher @puds/page-header @puds/os-rail @puds/os-tabbar @puds/service-icon --yes`
Expected: creates `app/tokens/_base.css`, `app/tokens/pullim-os.css`, `components/ui/{dashboard-shell,service-switcher,page-header,os-rail,os-tabbar,service-icon}.tsx`, `lib/cn.ts`, `hooks/use-reduced-motion.ts`. If shadcn asks to overwrite an existing file, decline for `lib/utils.ts` (untouched) — only `lib/cn.ts` is new.

- [ ] **Step 3: Verify the imports resolve**

Run: `bun --filter @pullim-classbot/classbot typecheck`
Expected: no new errors from the installed files (they import `@/lib/cn` which now exists; `os-rail`/`os-tabbar` import nothing exotic; `dashboard-shell` imports `./os-tabbar`). If a path alias is missing, the installed components use `@/lib/cn` and `@/components/ui/*` which classbot's tsconfig already maps. Fix any genuinely missing alias.

- [ ] **Step 4: Commit**

```bash
git add apps/classbot/components.json apps/classbot/components/ui apps/classbot/lib/cn.ts apps/classbot/hooks/use-reduced-motion.ts apps/classbot/app/tokens
git commit -m "feat(classbot): install @puds dashboard shell components + tokens"
```

## Task 2: Token migration — install PUDS tokens, data-theme, value-remap

**Files:**
- Modify: `apps/classbot/app/globals.css`, `apps/classbot/app/layout.tsx`

**Interfaces:**
- Consumes: installed `app/tokens/_base.css` + `pullim-os.css`.
- Produces: classbot rendered under `data-theme="pullim-os"` with shadcn semantic tokens pointing at PUDS values.

- [ ] **Step 1: Import the PUDS tokens** — in `apps/classbot/app/globals.css`, after the existing `@import` lines (`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`), add:

```css
@import "./tokens/_base.css";
@import "./tokens/pullim-os.css";
```

- [ ] **Step 2: Set the theme attribute** — in `apps/classbot/app/layout.tsx`, add `data-theme="pullim-os"` to the `<html>` tag (alongside `lang="ko"` and the existing `className`; it does not collide with next-themes' class attribute):

```tsx
<html
  lang="ko"
  data-theme="pullim-os"
  className={`${pretendard.variable} ${geistMono.variable} h-full antialiased`}
  suppressHydrationWarning
>
```

- [ ] **Step 3: Value-remap classbot's `:root` shadcn tokens to PUDS values** — in `apps/classbot/app/globals.css`, replace the light-theme `:root` shadcn token values (the `--background … --ring` block) with references to the PUDS tokens now defined by `_base.css` + `pullim-os.css`. Replace these specific lines:

```css
  --background: var(--surface-canvas);
  --foreground: var(--text-primary);
  --card: var(--surface-raised);
  --card-foreground: var(--text-primary);
  --popover: var(--surface-raised);
  --popover-foreground: var(--text-primary);
  --primary: var(--color-primary-600);
  --primary-foreground: #ffffff;
  --secondary: var(--surface-sunken);
  --secondary-foreground: var(--text-secondary);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--text-tertiary);
  --accent: var(--color-action-secondary);
  --accent-foreground: var(--color-primary-700);
  --destructive: var(--color-danger-500);
  --border: var(--border-default);
  --input: var(--border-default);
  --ring: var(--focus-ring-color);
  --radius: var(--radius-md);
```

(Leave `--chart-*`, `--sidebar-*`, `--color-pullim-*`, and the `.dark` block as-is — `--sidebar-*` already track the same palette; the `.dark` block stays dormant.)

- [ ] **Step 4: Verify build + gates + visual-token sanity**

Run: `bun --filter @pullim-classbot/classbot typecheck` → clean.
Run: `bun --filter @pullim-classbot/classbot run gates` → passes. If `check-design-gates.mjs` fails on a remapped token, read what it asserts and either keep that token's prior value or update the gate (note the change in the report).
Run: `bun --filter @pullim-classbot/classbot build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/app/globals.css apps/classbot/app/layout.tsx
git commit -m "feat(classbot): migrate tokens to PUDS pullim-os (data-theme + value remap)"
```

## Task 3: Nav adapter (nav-config → OsRail/OsTabbar items)

**Files:**
- Create: `apps/classbot/components/shell/nav-adapter.ts`
- Test: `apps/classbot/components/shell/nav-adapter.test.ts`

**Interfaces:**
- Consumes: `navForRole`, `studentBottomTabs`, types `NavGroup`/`NavItem`/`Role` from `./nav-config` (verbatim shapes in the spec).
- Produces:
  ```ts
  import type * as React from "react";
  export interface RailSection { head: string; items: { label: string; href: string; icon?: React.ReactNode; active?: boolean }[] }
  export function railSectionsForRole(role: Role, pathname: string): RailSection[]
  export function tabItems(pathname: string): { label: string; href: string; icon?: React.ReactNode; active?: boolean }[]
  ```
  (Flattens grouped nav: each `NavGroup` → one `RailSection` (head = group label, falling back to the role label); a student domain item's `children` are flattened in after the domain. `active` via exact match for `/classbot` and `matchPrefix`/prefix otherwise. Lucide icons rendered as elements: `icon: <Item.icon className="h-[19px] w-[19px]" />`.)

- [ ] **Step 1: Write the failing test**

```ts
// apps/classbot/components/shell/nav-adapter.test.ts
import { railSectionsForRole, tabItems } from "./nav-adapter";

describe("nav-adapter", () => {
  it("flattens teacher groups into rail sections with heads", () => {
    const secs = railSectionsForRole("teacher", "/teacher/grading");
    expect(secs.length).toBeGreaterThanOrEqual(2); // 워크스페이스, 평가
    const all = secs.flatMap((s) => s.items);
    const grading = all.find((i) => i.href === "/teacher/grading");
    expect(grading?.active).toBe(true);
  });
  it("student rail includes home + classbot routes, active on exact home", () => {
    const secs = railSectionsForRole("student", "/");
    const items = secs.flatMap((s) => s.items);
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.some((i) => i.href === "/classbot/chat")).toBe(true);
  });
  it("tabItems returns the 5 student bottom tabs with active detection", () => {
    const tabs = tabItems("/classbot/assignment/123");
    expect(tabs).toHaveLength(5);
    expect(tabs.find((t) => t.href === "/classbot/assignment")?.active).toBe(true);
  });
});
```

- [ ] **Step 2: Run test → FAIL**

Run (from `apps/classbot`): `bunx jest components/shell/nav-adapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `nav-adapter.ts`**

```ts
import React from "react";
import { navForRole, studentBottomTabs, type Role } from "./nav-config";

export interface RailItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}
export interface RailSection {
  head: string;
  items: RailItem[];
}

const ROLE_LABEL: Record<Role, string> = { student: "클래스봇", teacher: "교사" };

function isActive(href: string, pathname: string, matchPrefix?: string[]): boolean {
  if (href === "/" || href === "/classbot") return pathname === href;
  if (pathname === href) return true;
  if (matchPrefix?.some((p) => pathname.startsWith(p))) return true;
  return pathname.startsWith(href + "/");
}

export function railSectionsForRole(role: Role, pathname: string): RailSection[] {
  const groups = navForRole(role);
  return groups.map((g) => {
    const items: RailItem[] = [];
    for (const item of g.items) {
      const Icon = item.icon;
      items.push({
        label: item.label,
        href: item.href,
        icon: Icon ? React.createElement(Icon, { className: "h-[19px] w-[19px]" }) : undefined,
        active: isActive(item.href, pathname, item.matchPrefix),
      });
      // flatten a domain's children in after it
      for (const child of item.children ?? []) {
        const CIcon = child.icon;
        items.push({
          label: child.label,
          href: child.href,
          icon: CIcon ? React.createElement(CIcon, { className: "h-[19px] w-[19px]" }) : undefined,
          active: isActive(child.href, pathname),
        });
      }
    }
    return { head: g.label || ROLE_LABEL[role], items };
  });
}

export function tabItems(pathname: string): RailItem[] {
  return studentBottomTabs.map((t) => {
    const Icon = t.icon;
    return {
      label: t.label,
      href: t.href,
      icon: Icon ? React.createElement(Icon, { className: "h-[22px] w-[22px]" }) : undefined,
      active: isActive(t.href, pathname, t.matchPrefix),
    };
  });
}
```

(`.ts` not `.tsx`: uses `React.createElement` so no JSX. If classbot lint prefers `.tsx`, rename and use JSX — but `.ts` keeps it a pure logic module testable without a DOM.)

- [ ] **Step 4: Run test → PASS**

Run: `bunx jest components/shell/nav-adapter.test.ts`
Expected: PASS (3). If a `studentBottomTabs` href differs from the test's `/classbot/assignment`, adjust the test to the real hrefs (read nav-config) — keep the active-detection assertion.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/components/shell/nav-adapter.ts apps/classbot/components/shell/nav-adapter.test.ts
git commit -m "feat(classbot): nav-config → OsRail/OsTabbar adapter"
```

## Task 4: Extract `AppBrand` + `AppHeaderActions` from AppHeader

**Files:**
- Modify: `apps/classbot/components/shell/app-header.tsx`

**Interfaces:**
- Produces: `export function AppBrand({ role }: { role: Role })` (the logo cluster: `ClassbotMark` + "풀림" + `roleLogoLabel[role]`, linking to `roleHomeHref[role]`) and `export function AppHeaderActions({ role }: { role: Role })` (the center `StudentModeToggle` for students + the right cluster: `StudentStreakBadge`, Search/Bell buttons, `ProfileMenu`). Keep `AppHeader` exported and working (now composing `AppBrand` + `AppHeaderActions`) so nothing else breaks.

- [ ] **Step 1: Split the header** — refactor `app-header.tsx`: move the brand `<Link>` JSX (lines rendering `ClassbotMark`/풀림/label) into a new exported `AppBrand({role})`; move the center `StudentModeToggle` + the right `<div>` cluster (streak, search, bell, ProfileMenu) into a new exported `AppHeaderActions({role})`. Rewrite `AppHeader` to render its existing `<header>` wrapper containing `<MobileDrawer role/>` + `<AppBrand role/>` + `<AppHeaderActions role/>`. Keep `roleLogoLabel`, `roleHomeHref`, `StudentStreakBadge`, `ProfileMenu`, `ROLE_ENTRIES`, `ALL_ROLES` intact (now used by the extracted pieces). Do not change behavior.

- [ ] **Step 2: Typecheck**

Run: `bun --filter @pullim-classbot/classbot typecheck`
Expected: clean. `AppHeader` still renders identically (other layouts importing `AppHeader` are unaffected).

- [ ] **Step 3: Commit**

```bash
git add apps/classbot/components/shell/app-header.tsx
git commit -m "refactor(classbot): expose AppBrand + AppHeaderActions for shell composition"
```

## Task 5: Rewrite AppShell to compose `@puds/DashboardShell`; drop right-rail (mechanism A)

**Files:**
- Rewrite: `apps/classbot/components/shell/app-shell.tsx`
- Modify: `apps/classbot/app/(student)/classbot/chat/page.tsx`
- Delete: `apps/classbot/components/shell/__tests__/right-rail-context.test.tsx`

**Interfaces:**
- Consumes: `DashboardShell` from `@/components/ui/dashboard-shell`, `OsRail` from `@/components/ui/os-rail`, `OsTabbar` from `@/components/ui/os-tabbar`; `AppBrand`/`AppHeaderActions` (Task 4); `railSectionsForRole`/`tabItems` (Task 3); existing `Breadcrumb`, `RoleGuard`, `nav-config` `Role`.

- [ ] **Step 1: Rewrite `app-shell.tsx`** (now a client component — it uses `usePathname` for active nav):

```tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { AppBrand, AppHeaderActions } from "./app-header";
import { Breadcrumb } from "./breadcrumb";
import { railSectionsForRole, tabItems } from "./nav-adapter";
import type { Role } from "./nav-config";

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const sections = railSectionsForRole(role, pathname);
  const rail = (
    <div className="flex w-[var(--rail-w,248px)] flex-col gap-2 py-3">
      {sections.map((s, i) => (
        <OsRail key={s.head + i} head={s.head} items={s.items} />
      ))}
    </div>
  );
  return (
    <DashboardShell
      brand={<AppBrand role={role} />}
      actions={<AppHeaderActions role={role} />}
      rail={rail}
      tabbar={role === "student" ? <OsTabbar items={tabItems(pathname)} /> : undefined}
    >
      <Breadcrumb role={role} />
      {children}
    </DashboardShell>
  );
}
```

(Renders one `OsRail` per flattened section. `OsTabbar` only for students. The `Breadcrumb` stays as the in-content crumb trail. `RightRailProvider`/`RightRailAside` removed — mechanism A dropped.)

- [ ] **Step 2: Remove the right-rail registration from the chat page** — in `apps/classbot/app/(student)/classbot/chat/page.tsx`: delete the `import { useSetRightRail } from '@/components/shell/right-rail-context';` line and the `useSetRightRail(rightRail);` call (and the now-unused `rightRail` node if it becomes dead — verify it isn't used elsewhere on the page; if it is, leave the node and just drop the registration). The chat page keeps working without the 3rd column.

- [ ] **Step 3: Delete the mechanism-A test** — `git rm apps/classbot/components/shell/__tests__/right-rail-context.test.tsx` (the context it tested is no longer used by the shell). Leave `right-rail-context.tsx` itself in place (unused, harmless) OR remove it too if nothing imports it after Step 2 (grep `right-rail-context` — if zero imports, `git rm` it).

- [ ] **Step 4: Typecheck + targeted tests**

Run: `bun --filter @pullim-classbot/classbot typecheck` → clean (no dangling `useSetRightRail`/`RightRail*` references).
Run: `bunx jest components/shell` → passes (nav-adapter + any remaining shell tests; the deleted right-rail test is gone; `context-rail.test.tsx` still passes — untouched).

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/components/shell/app-shell.tsx "apps/classbot/app/(student)/classbot/chat/page.tsx" apps/classbot/components/shell/__tests__
git commit -m "feat(classbot): AppShell on @puds/DashboardShell; drop context right-rail"
```

## Task 6: Final verification (build, tests, gates, browser)

- [ ] **Step 1: Typecheck** — `bun --filter @pullim-classbot/classbot typecheck` → clean.
- [ ] **Step 2: Unit tests** — `bun --filter @pullim-classbot/classbot test` → all pass (the removed right-rail test is gone; everything else green).
- [ ] **Step 3: Design gates** — `bun --filter @pullim-classbot/classbot run gates` → passes (or the adapted gate from Task 2).
- [ ] **Step 4: Build** — `bun --filter @pullim-classbot/classbot build` → succeeds.
- [ ] **Step 5: Browser visual check** — run `bun --filter @pullim-classbot/classbot dev` (port 3032); in a browser confirm: (a) `/` (student) renders on the PUDS DashboardShell (topbar with brand+actions, left OsRail nav, bottom OsTabbar on mobile width) in the pullim-os look; (b) `/teacher` (teacher) renders with the two flattened rail sections, no bottom tabbar; (c) the chat page loads without the 3rd column and without console errors; (d) a `ContextRail` page (e.g. `/classbot/wellness`) still shows its right column (mechanism B intact). Capture screenshots. Stop the dev server.
- [ ] **Step 6: Commit any visual fixes** with a clear message; otherwise nothing to commit.

---

## Self-Review

**1. Spec coverage** (vs `2026-06-24-classbot-puds-shell-design.md`):
- §1 consume PUDS → Task 1. §2 token migration (import + data-theme + value-remap, .dark dormant) → Task 2. §3 shell swap (AppHeader→brand/actions, AppSidebarRail→OsRail, BottomNav→OsTabbar, Breadcrumb kept, drop RightRail mechanism A, keep RoleGuard) → Tasks 4–5. §3 nav-config mapping → Task 3. §5 verification → Task 6.
- **Deviation:** spec mapped Breadcrumb→PageHeader; the plan KEEPS classbot's `Breadcrumb` (PUDS `PageHeader` requires a title; the crumb-only Breadcrumb is the faithful fit). PageHeader remains available for pages that want a titled header. Flagged.
- **Clarified scope:** only mechanism-A right-rail is dropped (1 page + 1 test); mechanism-B `ContextRail` (7 pages) is page-level and untouched — Task 6 step 5d verifies it still works.
- **Accepted reduction:** rich grouped/nested sidebar nav is flattened into stacked `OsRail` sections (consistent with the user's "swap shell, accept feature loss" decision).

**2. Placeholder scan:** Token remap uses concrete `var(--…)` values; nav adapter + app-shell are full code; the AppHeader split (Task 4) is a precise refactor of existing JSX (the implementer moves the exact existing lines — the structure is specified). No TBD/"handle X".

**3. Type consistency:** `RailItem`/`RailSection` defined in nav-adapter and consumed by app-shell via `OsRail`'s `{head, items}` API (matches `@puds/os-rail`'s `OsRailProps`). `AppBrand`/`AppHeaderActions` signatures match their use in app-shell. `tabItems` shape matches `OsTabbar`'s `TabbarItem[]`.

**Risk for executor:** `bunx shadcn add @puds/*` must reach the live registry (network). If a per-file `type`/install hiccup occurs, confirm classbot's components.json `registries` entry and shadcn version (4.11). The `gates` script is the most likely surprise — run it early (Task 2) and adapt.
