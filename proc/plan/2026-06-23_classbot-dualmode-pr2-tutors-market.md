# Classbot Dual-Mode PR-2 — Official Tutors + 봇 마켓 Self-Enroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give self-mode its first real substance — a library of **official curriculum tutors**, a **봇 마켓** to browse + self-enroll, and a populated **"내 튜터"** list on the self-home (replacing the empty placeholder).

**Architecture:** `officialTutors` reuse the existing `ClassBot` shape (+ a light `curriculum`), seeded in a new `lib/mock/classbot-official.ts`. A new persisted store `lib/store/self-learning.ts` holds `SelfEnrollment[]` (student↔tutor, no teacher) with enroll/unenroll. The locked `봇 찾기` route + nav item become the live market; the self-home renders the enrolled tutors.

**Tech Stack:** Next.js 16, React 19, zustand+persist, Tailwind v4, Jest.

## Global Constraints

- **Spec:** `proc/spec/2026-06-23_classbot-dual-mode-design.md` — this is **PR-2 of 5** (tutors + market + self-enroll + 내 튜터 list ONLY; goal/path/progress + the learning loop are PR-3/4).
- **Reuse, don't rebuild:** official tutors are `ClassBot`-shaped (so `botSignature(tutor)`, avatar, greeting, quickPrompts all work); self-enrollment parallels the teacher `StudentEnrollment` but is teacher-free.
- **Mode ≠ Role.** Unlocking the `봇 찾기` nav item (`nav-config.ts:49` `locked: true`) is the ONLY shell change, and it is pre-approved by the spec (§2). Do NOT touch the `Role` union or add domains.
- **Class mode unchanged.** Self surfaces are additive. All prod-verify e2e stay green; **`/classbot/discover` is NOT in the color-palette 8-route set, but keep it palette-safe anyway** (blue/slate/lemon/white, no green/amber) since it's a student route. Tokens only (no hex in `components/**`), DS type scale (no `text-[Npx]`), 44px touch, focus-visible.
- Branch `feat/dualmode-pr2-tutors-market` off `dev`; PR → `dev`. **Dev server on :3032 — do NOT run `bun run dev`; verify typecheck/build/gates/jest; controller runs e2e. `git add` specific files.** Commit per task.

---

### Task 1: Official tutor library (`classbot-official.ts`)

**Files:** Create `apps/classbot/lib/mock/classbot-official.ts`, `apps/classbot/lib/mock/__tests__/classbot-official.test.ts`.

**Interfaces — Produces:**
- `type TutorUnit = { id: string; title: string; order: number }`
- `type OfficialTutor = ClassBot & { tagline: string; curriculum: TutorUnit[] }`
- `officialTutors: OfficialTutor[]` (3 tutors), `getOfficialTutors(): OfficialTutor[]`, `getOfficialTutor(id: string): OfficialTutor | undefined`.

- [ ] **Step 1: Failing test** (`classbot-official.test.ts`):
```ts
import { officialTutors, getOfficialTutors, getOfficialTutor } from '../classbot-official';

it('exposes ≥3 official tutors, each ClassBot-shaped with a curriculum', () => {
  expect(getOfficialTutors().length).toBeGreaterThanOrEqual(3);
  for (const t of officialTutors) {
    expect(t.id).toMatch(/^ot_/);          // official-tutor id namespace
    expect(typeof t.name).toBe('string');
    expect(typeof t.subject).toBe('string');
    expect(t.greeting.length).toBeGreaterThan(0);
    expect(t.quickPrompts.length).toBe(4);  // chat panel contract
    expect(t.isLive).toBe(false);           // official tutors are not live-class
    expect(t.curriculum.length).toBeGreaterThanOrEqual(3);
    t.curriculum.forEach((u, i) => expect(u.order).toBe(i + 1)); // 1-based ordered
  }
});
it('getOfficialTutor resolves by id and returns undefined for misses', () => {
  expect(getOfficialTutor(officialTutors[0].id)?.id).toBe(officialTutors[0].id);
  expect(getOfficialTutor('nope')).toBeUndefined();
});
```
- [ ] **Step 2: Run — FAIL** (`cd apps/classbot && bun run test -- classbot-official`).
- [ ] **Step 3: Implement.** READ `lib/mock/classbot.ts` lines 9–55 for the full `ClassBot` type (required: `id,name,avatarEmoji,teacherName,organization,subject,grade,tone,greeting,quickPrompts,scope,isLive`) + the `ClassbotQuickPrompt`/`ScopeLevel` types. Create 3 tutors (수학/영어/과학) shaped exactly like `classBots`, but platform-authored: `teacherName: '풀림 공식'`, `organization: '풀림'`, `isLive: false`, sensible `tone`, a one-paragraph `greeting`, 4 `quickPrompts`, `scope` open-ish (4), and a 3–5 item `curriculum` (`{id,title,order}`, order 1-based). Add a `tagline` (one line for the market card). Import `type { ClassBot, ClassbotQuickPrompt, ScopeLevel } from './classbot'`. Implement `getOfficialTutors`/`getOfficialTutor`.
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): official curriculum tutor library — PR2 T1"`

---

### Task 2: Self-enrollment store (`self-learning.ts`)

**Files:** Create `apps/classbot/lib/store/self-learning.ts`, `apps/classbot/lib/store/__tests__/self-learning.test.ts`.

**Interfaces — Produces:**
- `type SelfEnrollment = { tutorId: string; enrolledAt: string }`
- `useSelfLearningStore` — zustand+persist `pullim-self-learning`, state `{ enrollments: SelfEnrollment[] }`, actions `enroll(tutorId: string): void` (no-op if already enrolled), `unenroll(tutorId: string): void`.
- Hooks: `useSelfEnrollments(): SelfEnrollment[]`, `useIsEnrolled(tutorId: string): boolean`, `useEnrolledTutors(): OfficialTutor[]` (joins enrollments → `getOfficialTutor`, drops misses).

- [ ] **Step 1: Failing test** (`self-learning.test.ts`):
```ts
import { renderHook, act } from '@testing-library/react';
import { useSelfLearningStore, useIsEnrolled, useEnrolledTutors } from '../self-learning';
import { officialTutors } from '@/lib/mock/classbot-official';

const A = officialTutors[0].id;
beforeEach(() => useSelfLearningStore.setState({ enrollments: [] }));

it('enroll adds once (idempotent) and unenroll removes', () => {
  act(() => { useSelfLearningStore.getState().enroll(A); useSelfLearningStore.getState().enroll(A); });
  expect(useSelfLearningStore.getState().enrollments.filter(e => e.tutorId === A)).toHaveLength(1);
  act(() => useSelfLearningStore.getState().unenroll(A));
  expect(useSelfLearningStore.getState().enrollments).toHaveLength(0);
});
it('useIsEnrolled + useEnrolledTutors reflect the store', () => {
  const { result: enrolled } = renderHook(() => useIsEnrolled(A));
  expect(enrolled.current).toBe(false);
  act(() => useSelfLearningStore.getState().enroll(A));
  const { result: tutors } = renderHook(() => useEnrolledTutors());
  expect(tutors.current.map(t => t.id)).toContain(A);
});
```
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement.** Mirror `lib/store/sidebar.ts`'s persist pattern. `enrolledAt` uses a stamp string — **do not call `Date.now()`/`new Date()` at module scope**; compute inside `enroll` via `new Date().toISOString()` (allowed at call time in app code). `useEnrolledTutors` maps `enrollments` through `getOfficialTutor(e.tutorId)` and filters `Boolean`.
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Verify** — `bun run typecheck && bun run gates`.
- [ ] **Step 6: Commit** — `git commit -m "feat(dualmode): self-enrollment store — PR2 T2"`

---

### Task 3: 봇 마켓 — browse + self-enroll (unlock `discover`)

**Files:** Modify `apps/classbot/app/(student)/classbot/discover/page.tsx`; Create `apps/classbot/components/classbot/tutor-market-card.tsx`; Modify `apps/classbot/components/shell/nav-config.ts` (remove the `locked` flag on the `봇 찾기` item).

**Interfaces — Consumes:** `getOfficialTutors` (T1), `useIsEnrolled`/`useSelfLearningStore` (T2), `botSignature` (`@/lib/tokens/bot-signature`).

- [ ] **Step 1: Tutor market card** (`tutor-market-card.tsx`, `'use client'`) — one official tutor with an enroll/registered toggle. Reuse `botSignature(tutor)` for the signature accent, the tutor `avatarEmoji`, `name`, `subject`/`grade`, `tagline`, and a 등록/등록됨 button. Skeleton (fill tokens/DS type, 44px button, no hex):
```tsx
'use client';
import { botSignature } from '@/lib/tokens/bot-signature';
import { useSelfLearningStore, useIsEnrolled } from '@/lib/store/self-learning';
import type { OfficialTutor } from '@/lib/mock/classbot-official';
import { cn } from '@/lib/utils';
import { Check, Plus } from 'lucide-react';

export function TutorMarketCard({ tutor }: { tutor: OfficialTutor }) {
  const sig = botSignature(tutor);
  const enrolled = useIsEnrolled(tutor.id);
  const { enroll, unenroll } = useSelfLearningStore();
  return (
    <div className="bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-pullim-xs">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill text-2xl" style={{ background: sig.softBg }}>{tutor.avatarEmoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-pullim-slate-900">{tutor.name}</p>
        <p className="text-xs text-pullim-slate-500">{tutor.subject} · {tutor.grade}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-pullim-slate-600">{tutor.tagline}</p>
      </div>
      <button type="button" onClick={() => (enrolled ? unenroll(tutor.id) : enroll(tutor.id))}
        aria-pressed={enrolled}
        className={cn('inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
          enrolled ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-blue-600 text-white')}>
        {enrolled ? <><Check className="h-3.5 w-3.5" /> 등록됨</> : <><Plus className="h-3.5 w-3.5" /> 등록</>}
      </button>
    </div>
  );
}
```
(Use the real `BotSignature` fields — READ `lib/tokens/bot-signature.ts` for the exact property names, e.g. `softBg`/`hex`; adapt the `style`/class accordingly.)
- [ ] **Step 2: Rebuild `discover/page.tsx`** — keep `BackLink` + `PageHeader` (update copy to "공식 튜터를 골라 자기주도 학습을 시작하세요"). REPLACE the `Lock` "v2에 만나요" `EmptyState` with a list: `getOfficialTutors().map(t => <TutorMarketCard key={t.id} tutor={t} />)` under a `SectionHeading title="과목 튜터"`. Keep the "곧 만날 봇 종류" Future section if you like (or trim to one). Page becomes `'use client'` (cards use hooks). Palette-safe.
- [ ] **Step 3: Unlock the nav item** — in `components/shell/nav-config.ts`, the `봇 찾기` student item (`href: '/classbot/discover'`) currently has `locked: true` (renders "준비 중"). Remove ONLY the `locked: true` property so it becomes a live nav link. Do NOT change its href/label/icon or anything else; do NOT touch `Role`.
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(dualmode): 봇 마켓 — browse + self-enroll official tutors — PR2 T3"`

---

### Task 4: "내 튜터" on the self-home

**Files:** Modify `apps/classbot/components/classbot/self-home-placeholder.tsx`; Create `apps/classbot/components/classbot/my-tutor-card.tsx`.

**Interfaces — Consumes:** `useEnrolledTutors` (T2), `botSignature`.

- [ ] **Step 1: `my-tutor-card.tsx`** (`'use client'`) — an enrolled tutor tile linking to the chat (`/classbot/chat?bot=<id>` — the existing chat reads the bot via query/switcher; confirm the param by reading `chat/page.tsx`'s bot-selection). Signature accent + avatar + name + subject + a "대화하기" affordance. Tokens/DS/44px/focus-visible, no hex.
- [ ] **Step 2: Extend the self-home** — make `self-home-placeholder.tsx` `'use client'`; read `const tutors = useEnrolledTutors();`. Under the `SectionHeading title="내 튜터"`: if `tutors.length === 0` keep the existing `EmptyState` (→ `/classbot/discover`); else render a responsive grid of `<MyTutorCard tutor={t} />`. Keep the hero. Palette-safe.
- [ ] **Step 3: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 4: Commit** — `git commit -m "feat(dualmode): 내 튜터 enrolled list on self-home — PR2 T4"`

---

### Task 5: PR-2 verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — typecheck + lint + test (incl. T1/T2 tests) + build, all pass.
- [ ] **Step 2: Class mode + e2e unchanged** — against :3032: **color-palette 8/8** + chat + mobile-and-focus + wellness-intensity-range pass (the mock student defaults to class; self surfaces are additive). Plus `/classbot/discover` is palette-safe (spot-check via the color-palette helper or a manual rgb scan).
- [ ] **Step 3: Self-flow smoke** — set `pullim-student-mode` → self; load `/classbot` (empty 내 튜터 → market CTA); `/classbot/discover` lists 3 tutors; click 등록 on one → it shows 등록됨; back on `/classbot` self-home the tutor appears under 내 튜터; reload → enrollment persists. Screenshot the market + populated self-home for the PR. No pageerror in the dev log.
- [ ] **Step 4: Done** — fix any gap, re-run, commit `fix(dualmode): <what>`.

---

## Self-Review

**Spec coverage (§8.2 PR-2):** official tutors + curricula → T1; self-enroll store → T2; unlock + browse the 봇 마켓 → T3; 내 튜터 list → T4; class+e2e unchanged → T5. ✅ Goal/path/progress + learning loop = PR-3/4 (out of scope).

**Placeholder scan:** T1/T2 have full data/store code + tests; T3/T4 give component skeletons + exact interfaces + "READ X for exact field names" where a real file owns the truth (`ClassBot` fields, `BotSignature` props, chat bot-param). No TBD; the self-home empty-state is the real PR-1 component, now conditional.

**Type consistency:** `OfficialTutor`/`TutorUnit`/`officialTutors`/`getOfficialTutor` (T1) → consumed in T2 (`useEnrolledTutors`), T3 (market), T4 (cards). `SelfEnrollment`/`useSelfLearningStore`/`enroll`/`unenroll`/`useIsEnrolled`/`useEnrolledTutors` (T2) → consumed in T3/T4. `botSignature` is the existing token fn — implementers READ `bot-signature.ts` for exact `BotSignature` field names before styling.

**Risk note:** (1) `ClassBot` has many required fields — T1 must fill all (the test checks the contract-critical ones; build/typecheck enforces the rest). (2) The chat bot-param in T4 must match what `chat/page.tsx` actually reads — T4 Step 1 requires confirming it. (3) Official tutors are NOT teacher enrollments, so they must never leak into class-mode `getMyBots()` (they don't — separate store/source); T5 Step 2 (class e2e unchanged) is the net.
