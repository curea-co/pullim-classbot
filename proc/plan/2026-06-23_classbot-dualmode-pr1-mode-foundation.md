# Classbot Dual-Mode PR-1 — Mode Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the student `class | self` **mode foundation** — a persisted `StudentMode` store with enrollment-based default resolution, a student-only mode toggle in the header, and a mode-aware home (class mode = current home unchanged; self mode = a placeholder self-home scaffold) — with every current flow + e2e untouched.

**Architecture:** Mode is a **student sub-context, not a Role** (`Role` stays `student | teacher`). A zustand-persist store (`lib/store/student-mode.ts`, mirroring `lib/store/sidebar.ts`) holds the user's chosen mode; a `useStudentMode()` hook resolves the effective mode = stored value ?? (`getMyBots().length > 0 ? 'class' : 'self'`). A segmented toggle in `AppHeader` (student-only) sets it; the student home branches on it.

**Tech Stack:** Next.js 16, React 19, zustand + persist, Tailwind v4, Jest.

## Global Constraints

- **Spec:** `proc/spec/2026-06-23_classbot-dual-mode-design.md`. This plan is **PR-1 of 5** (mode foundation only; tutors/market/self-home/loop are later PRs).
- **Mode ≠ Role.** Do NOT add a third `Role` or touch `nav-config.ts`'s `Role` union / `findActiveSection`. Mode is read via the hook inside student surfaces only.
- **Class mode = current behavior, byte-for-byte.** The mock/demo student HAS teacher enrollments (`getMyBots()` returns the seeded `studentEnrollments`), so the resolved default is **`class`** → the current home renders unchanged. All prod-verify e2e (color-palette 8 routes, chat, wellness-intensity-range, mobile-and-focus) must stay green — the toggle + self-placeholder are **additive**.
- **Teacher unaffected** — the toggle renders only for `role === 'student'`.
- Tokens only, no hex (DS); 44px touch; `text-*` scale (no `text-[Npx]`); focus-visible inherited; no green/amber on student routes.
- Work on branch `feat/dualmode-pr1-mode-foundation` (off `dev` + this spec/plan); PR → `dev`. **Dev server on :3032 for iPad — do NOT run `bun run dev`; verify with typecheck/build/gates/jest; the controller runs e2e. `git add` specific files.** Commit per task.

---

### Task 1: `StudentMode` store + `useStudentMode` hook

**Files:** Create `apps/classbot/lib/store/student-mode.ts`, `apps/classbot/lib/store/__tests__/student-mode.test.ts`.

**Interfaces — Produces:**
- `type StudentMode = 'class' | 'self'`
- `useStudentModeStore` — zustand store `{ mode: StudentMode | null; setMode: (m: StudentMode) => void }` persisted as `pullim-student-mode`.
- `useStudentMode(): { mode: StudentMode; setMode: (m: StudentMode) => void; toggle: () => void }` — resolves `mode = stored ?? (getMyBots().length > 0 ? 'class' : 'self')`; `toggle` flips the **resolved** mode and persists.

- [ ] **Step 1: Write the failing test** (`student-mode.test.ts`). Mock `getMyBots` so the default resolves deterministically:
```ts
import { renderHook, act } from '@testing-library/react';
import { useStudentMode, useStudentModeStore } from '../student-mode';

jest.mock('@/lib/mock', () => ({ getMyBots: jest.fn(() => []) }));
import { getMyBots } from '@/lib/mock';

beforeEach(() => { useStudentModeStore.setState({ mode: null }); (getMyBots as jest.Mock).mockReturnValue([]); });

it('defaults to self when the student has no teacher enrollments', () => {
  (getMyBots as jest.Mock).mockReturnValue([]);
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('self');
});
it('defaults to class when the student has teacher enrollments', () => {
  (getMyBots as jest.Mock).mockReturnValue([{ bot: {}, enrollment: {} }]);
  const { result } = renderHook(() => useStudentMode());
  expect(result.current.mode).toBe('class');
});
it('setMode overrides the default and toggle flips the resolved mode', () => {
  (getMyBots as jest.Mock).mockReturnValue([{ bot: {}, enrollment: {} }]); // default class
  const { result, rerender } = renderHook(() => useStudentMode());
  act(() => result.current.toggle()); rerender();
  expect(result.current.mode).toBe('self');
  act(() => result.current.setMode('class')); rerender();
  expect(result.current.mode).toBe('class');
});
```
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- student-mode`).
- [ ] **Step 3: Implement `student-mode.ts`:**
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getMyBots } from '@/lib/mock';

export type StudentMode = 'class' | 'self';

interface StudentModeStore {
  /** null = 사용자가 아직 명시 선택 안 함 → 등록 기반 default 로 해석 */
  mode: StudentMode | null;
  setMode: (m: StudentMode) => void;
}

export const useStudentModeStore = create<StudentModeStore>()(
  persist(
    (set) => ({ mode: null, setMode: (m) => set({ mode: m }) }),
    { name: 'pullim-student-mode' },
  ),
);

/** 효과적 모드 — 저장값 우선, 없으면 교사 등록 유무로 default (등록 있음→class, 없음→self). */
export function useStudentMode(): { mode: StudentMode; setMode: (m: StudentMode) => void; toggle: () => void } {
  const stored = useStudentModeStore((s) => s.mode);
  const setMode = useStudentModeStore((s) => s.setMode);
  const mode: StudentMode = stored ?? (getMyBots().length > 0 ? 'class' : 'self');
  const toggle = () => setMode(mode === 'class' ? 'self' : 'class');
  return { mode, setMode, toggle };
}
```
- [ ] **Step 4: Run — PASS** (`bun run test -- student-mode`).
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): StudentMode store + useStudentMode (enrollment-default) — PR1 T1"`

---

### Task 2: `StudentModeToggle` + wire into the header (student-only)

**Files:** Create `apps/classbot/components/shell/student-mode-toggle.tsx`; Modify `apps/classbot/components/shell/app-header.tsx`.

**Interfaces — Consumes:** `useStudentMode` (T1). **Produces:** `<StudentModeToggle />`.

- [ ] **Step 1: Create the toggle** (`student-mode-toggle.tsx`):
```tsx
'use client';
import { useStudentMode } from '@/lib/store/student-mode';
import { cn } from '@/lib/utils';

const MODES = [
  { key: 'class', label: '교사 수업' },
  { key: 'self',  label: '자기주도' },
] as const;

/** 학생 학습 모드 토글 — 교사 수업 ↔ 자기주도. 학생 셸 전용. */
export function StudentModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useStudentMode();
  return (
    <div role="tablist" aria-label="학습 모드" className={cn('bg-pullim-slate-100 inline-flex rounded-pill p-0.5', className)}>
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(m.key)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-xs font-bold transition-colors min-h-9',
              active ? 'bg-card text-pullim-blue-700 shadow-pullim-xs' : 'text-pullim-slate-500 hover:text-pullim-slate-700',
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
```
- [ ] **Step 2: Wire into `AppHeader`** — import `StudentModeToggle`; render it **only for `role === 'student'`**, centered between the logo `<Link>` and the `ml-auto` actions. After the logo Link (line ~52), add:
```tsx
{role === 'student' && (
  <StudentModeToggle className="ml-1 hidden sm:inline-flex" />
)}
```
(Keep it `hidden sm:inline-flex` so the dense mobile header isn't crowded — mobile mode-switch can come later; this is foundation.) Do NOT alter the logo, the `ml-auto` actions, or the teacher branch.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep: toggle only under `role === 'student'`.
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): student-only mode toggle in header — PR1 T2"`

---

### Task 3: Mode-aware student home (class unchanged · self placeholder)

**Files:** Modify `apps/classbot/app/(student)/classbot/page.tsx`; Create `apps/classbot/components/classbot/self-home-placeholder.tsx`.

**Interfaces — Consumes:** `useStudentMode` (T1).

- [ ] **Step 1: Self-home placeholder** (`self-home-placeholder.tsx`) — a minimal scaffold (the real self-home is PR-3). Tokens only, no green/amber, DS type:
```tsx
import Link from 'next/link';
import { Compass, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/** 자기주도 모드 홈 — PR1 스캐폴드. 목표/진도/내 튜터는 PR3 에서 채운다. */
export function SelfHomePlaceholder() {
  return (
    <div className="space-y-4">
      <section className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-4 shadow-pullim-sm">
        <div className="text-pullim-blue-100 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> 자기주도 학습
        </div>
        <h2 className="mt-1 text-xl font-bold">내 속도로, 내 목표로</h2>
        <p className="text-white/80 mt-1 text-sm">공식 튜터를 골라 개념부터 점검까지 스스로 학습해요.</p>
      </section>
      <SectionHeading title="내 튜터" />
      <EmptyState
        icon={Compass}
        title="아직 등록한 튜터가 없어요"
        description="봇 마켓에서 과목 튜터를 골라 학습을 시작해 보세요."
        action={{ href: '/classbot/discover', label: '봇 마켓 둘러보기' }}
      />
    </div>
  );
}
```
- [ ] **Step 2: Branch the home** — in `page.tsx`'s `StudentClassbotPage`, read the mode and short-circuit to the placeholder in self mode, BEFORE the existing class-home logic. Add near the top:
```tsx
import { useStudentMode } from '@/lib/store/student-mode';
import { SelfHomePlaceholder } from '@/components/classbot/self-home-placeholder';
// ...
export default function StudentClassbotPage() {
  const { mode } = useStudentMode();
  if (mode === 'self') return <SelfHomePlaceholder />;
  // —— class mode: existing home unchanged below ——
  const me = useRosterMe();
  // ...(rest of the current component is untouched)
}
```
**CRITICAL:** the `if (mode === 'self') return …` must come BEFORE the other hooks would cause a hooks-order violation? — NO: `useStudentMode` + an early return is fine ONLY if no hooks run after the return in the class path conditionally. Since the class path calls hooks (`useRosterMe`, `useLiveStore`, …) AFTER the early return, and the self path calls none, React's rules-of-hooks are violated (different hook count per render). **Fix:** call ALL hooks unconditionally, then branch on render. Restructure: keep all the existing `const … = useX()` calls, then `if (mode === 'self') return <SelfHomePlaceholder />;` AFTER all hook calls, before the JSX return. Put `const { mode } = useStudentMode();` as the FIRST hook, and the `if (mode==='self') return …` right before the final `return (`. Verify no hook is called conditionally.
- [ ] **Step 3: Verify hooks order** — read the edited `page.tsx`; confirm every `useX()` is called on every render path (the self return is after all hook calls). `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): mode-aware student home — self placeholder, class unchanged — PR1 T3"`

---

### Task 4: PR-1 verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass (incl. the new student-mode test).
- [ ] **Step 2: Class mode unchanged (the load-bearing check)** — the mock student has enrollments → default `class` → current home. Against live :3032: **color-palette 8/8** + chat + mobile-and-focus + wellness-intensity-range all pass (unchanged):
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/color-palette.spec.ts tests/e2e/chat-scroll-and-input.spec.ts tests/e2e/mobile-and-focus.spec.ts tests/e2e/wellness-intensity-range.spec.ts --reporter=line
```
- [ ] **Step 3: Toggle + self-home smoke** — on :3032, load `/classbot` (class home renders); the `교사 수업 / 자기주도` toggle is visible (≥sm). (Self mode is reachable via the toggle; the placeholder renders a market CTA.) No pageerror in the dev log. Capture a screenshot of both modes for the PR.
- [ ] **Step 4: Done** — fix any gap, re-run, commit `fix(dualmode): <what>`.

---

## Self-Review

**Spec coverage (§8.1 PR-1):** `StudentMode` store + default resolution → T1; student-only toggle → T2; mode-aware home (class unchanged, self placeholder) → T3; class-mode + e2e unchanged → T4. ✅ Tutors/market/self-home/loop = later PRs (out of scope, per §8).

**Placeholder scan:** every task has full code + commands. The self-home is an intentional PR-1 *scaffold* (spec §8.1 says "self-mode shows a placeholder home") — not a TBD. No red-flag placeholders.

**Type consistency:** `StudentMode`/`useStudentMode`/`useStudentModeStore` defined in T1, consumed verbatim in T2 (toggle) + T3 (home). `getMyBots()` is the existing `@/lib/mock` export. Store name `pullim-student-mode`.

**Risk note:** the one real hazard is **rules-of-hooks** in T3 (early-return before other hooks) — T3 Step 2/3 explicitly require the self-return to come *after all hook calls*. Second: the mode default must resolve to `class` for the mock student (has enrollments) so all e2e stay on the unchanged home — T4 Step 2 is the net.
