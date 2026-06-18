# CUDS PR-6 Auth (login / signup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Final CUDS pass on the auth surfaces (login + signup) — a skeleton Suspense fallback (no blank flash), an AlertCard error region, the signup role picker on the shared RadioCard primitive, and a slightly roomier card — building on already-clean shadcn forms.

**Architecture:** A new `AuthCardSkeleton` mirrors the `AuthCard` shape and replaces the `Suspense fallback={null}` in both page wrappers. Both forms swap their bare `<p role="alert">` error line for `AlertCard` (preserving the alert a11y). The signup role picker (currently `aria-pressed` toggle buttons) adopts `RadioCardGroup`/`RadioCard` (proper `role=radio`/`aria-checked` for a mutually-exclusive choice). `AuthCard` widens `max-w-sm` → `max-w-md`.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), shadcn (Card/Input/Label/Button), Jest + RTL.

## Global Constraints

**No e2e contracts on auth:** `/login` and `/signup` are NOT in any Playwright spec (not color-palette-scanned, not in mobile-and-focus). No DOM/testid contract to preserve. (Verify by grep before relying on this.)

**Preserve behavior:** the auth flow logic — `useLogin`/`useSignup` mutations, `homePathForRole`, `isSafeNextPath`/`next` handling, `refreshSession`, the `tokenManager` redirect-if-logged-in effect, the signup `clientError` validation, `noValidate`, `autoComplete` attributes — is UNCHANGED. This PR is presentation-only.

**a11y:** keep the error as an assertive alert region (`role="alert"`); the role picker becomes a labeled radio group (was `aria-pressed`). Keep `<Label htmlFor>` / `id` field pairing.

**Tokens only**, no hex; Korean copy unchanged. Auth routes allow any token color (not scanned), but the forms already use blue/destructive/muted — keep them. Work on branch `feat/cuds-pr6-auth` (created, stacked on PR-5b). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev`; verify with typecheck/build/gates; `git add` specific files only.** Commit per task.

---

### Task 1: `AuthCardSkeleton` + Suspense fallbacks + roomier card

**Files:** Create `apps/classbot/components/features/auth/auth-card-skeleton.tsx`; modify `apps/classbot/app/login/page.tsx`, `apps/classbot/app/signup/page.tsx`, `apps/classbot/components/features/auth/auth-card.tsx`.

**Interfaces:** `export function AuthCardSkeleton(): JSX.Element` — a static, no-prop skeleton mirroring AuthCard (logo circle + title bar + 2-3 field placeholders + button bar) using the shadcn `Skeleton` primitive (`@/components/ui/skeleton` if it exists; otherwise `<div className="animate-pulse rounded bg-muted …">`). Wrapped in the same `Card className="w-full max-w-md"` shell so the fallback occupies the same footprint.

- [ ] **Step 1: Check the Skeleton primitive** — `ls apps/classbot/components/ui/skeleton.tsx`. If present, use `<Skeleton className="…" />`; else use `<div className="bg-muted animate-pulse rounded …" />`.
- [ ] **Step 2: Create `auth-card-skeleton.tsx`** — a `Card`-shelled skeleton: centered logo-circle (`h-7 w-7 rounded-full`), a title bar (`h-5 w-40`), then in `CardContent` 2 field groups (each: `h-4 w-16` label + `h-10 w-full` input) and a `h-11 w-full` button bar. Use `bg-muted`/Skeleton; no text. Match AuthCard's `max-w-md` width.
- [ ] **Step 3: Wire both page fallbacks** — in `app/login/page.tsx` and `app/signup/page.tsx`, replace `<Suspense fallback={null}>` with `<Suspense fallback={<AuthCardSkeleton />}>` (import it). Leave the `<main>` wrapper as-is.
- [ ] **Step 4: Widen AuthCard** — in `auth-card.tsx`, the `Card` `max-w-sm` → `max-w-md`.
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(auth): AuthCardSkeleton Suspense fallback + max-w-md card"`

---

### Task 2: AlertCard error region (login + signup)

**Files:** Modify `apps/classbot/components/features/auth/login-form.tsx`, `apps/classbot/components/features/auth/signup-form.tsx`.

**Interfaces:** consumes `AlertCard` (`@/components/classbot/alert-card`). NOTE: verify AlertCard forwards/accepts `role` — if it does NOT render a `role="alert"`, wrap the message text so the alert semantics survive (e.g. put `role="alert"` on AlertCard if it spreads props, or keep an inner element with it). The assertive alert announcement MUST survive.

- [ ] **Step 1: Inspect AlertCard** — read `apps/classbot/components/classbot/alert-card.tsx` for its props (`tone`, `icon`, `title`, `children`, and whether it spreads extra props / sets `role`).
- [ ] **Step 2: login-form error → AlertCard** — replace the `{apiError ? <p role="alert" className="text-sm text-destructive">{apiError}</p> : null}` block with `{apiError ? <AlertCard tone="danger" icon={AlertCircle} role="alert">{apiError}</AlertCard> : null}` (import AlertCard + AlertCircle from lucide-react). If AlertCard doesn't accept `role`, instead keep the assertive semantics by putting the message in an element with `role="alert"` inside, OR add `role="alert"` to the AlertCard wrapper per its actual API (from Step 1). Do NOT lose the alert role.
- [ ] **Step 3: signup-form error → AlertCard** — same swap for the signup `{apiError ? <p role="alert" …>` block (it carries clientError + apiError messages — unchanged logic, only the rendering element changes).
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm `role="alert"` still present in both forms (`grep -c 'role="alert"'` ≥1 each, or confirm AlertCard renders it).
- [ ] **Step 5: Commit** — `git commit -m "feat(auth): AlertCard error region for login/signup (alert a11y preserved)"`

---

### Task 3: Signup role picker → RadioCardGroup

**Files:** Modify `apps/classbot/components/features/auth/signup-form.tsx`.

**Interfaces:** consumes `RadioCard` + `RadioCardGroup` (`@/components/classbot/radio-card`, from PR-5a).

- [ ] **Step 1: Migrate the role `<fieldset>`** — replace the hand-rolled role picker (the `<fieldset>` with `aria-pressed` toggle `<button>`s, ~:102-128) with:
```tsx
<RadioCardGroup label="역할" ariaLabel="역할 선택" cols={2}>
  {ROLE_OPTIONS.map((opt) => (
    <RadioCard
      key={opt.value}
      active={role === opt.value}
      onSelect={() => { setRole(opt.value); setApiError(null); }}
      icon={opt.icon}
      title={opt.label}
      description={opt.hint}
    />
  ))}
</RadioCardGroup>
```
This swaps `aria-pressed` toggle semantics for proper `role="radio"`/`aria-checked` (single-select). The `ROLE_OPTIONS` array (icon/label/hint) is unchanged; `setRole` logic unchanged. Remove the now-unused `cn` import if nothing else uses it (check first).
- [ ] **Step 2: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm `role="radiogroup"`/`role="radio"` now present (via RadioCard) and the old `aria-pressed` role buttons are gone.
- [ ] **Step 3: Commit** — `git commit -m "feat(auth-signup): role picker → RadioCardGroup (role=radio a11y)"`

---

### Task 4: PR-6 verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: No-e2e confirm** — `grep -rniE "/login|/signup" apps/classbot/tests/e2e/` → expect no auth-route assertions (presentation-only PR, no contract to run). Note the result.
- [ ] **Step 3: Boot smoke** — against live :3032: `/login`, `/signup` → 200; confirm the skeleton fallback renders (no blank flash) and the forms still submit-disable correctly. Zero runtime errors in the dev log. (Manually verify on the iPad/browser that the role picker selects and the error AlertCard shows on a bad submit, if convenient.)
- [ ] **Step 4: Done** — fix any gap, re-run, commit `fix(auth): <what>`.

---

## Self-Review

**Spec coverage (design §6.5 auth):** skeleton fallback → T1; max-w (md) → T1; alert region → T2; shared field/Alert primitives → T2 (AlertCard) + T3 (RadioCard). The forms already used shadcn Input/Label/Button (no field-primitive work needed). ✅

**Placeholder scan:** every task has file:line + the primitive + the a11y rule. No TBD.

**Type consistency:** `AuthCardSkeleton` (T1) consumed in both page wrappers; `AlertCard` (T2) + `RadioCard`/`RadioCardGroup` (T3) props match their definitions (PR-2b/5a). Auth flow logic untouched.

**Risk note:** lowest-risk PR of the stack — presentation-only, no e2e contracts. The one a11y watch-item is the alert-role survival in T2 (Step 1 inspects AlertCard's API first; the message must stay an assertive `role="alert"` region). T3's role-picker swap changes `aria-pressed`→`role=radio` (an improvement); verify it still selects. T4 boot-smokes both routes.
