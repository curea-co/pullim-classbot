# Classbot Dual-Mode (교사 주도 / 학생 자기주도) — Design Spec

**Date:** 2026-06-23
**Status:** approved (brainstorming) → ready for writing-plans
**Scope:** new product capability inside the existing single classbot app. FE-only, mock-first (BE is a separate later track per repo rule).

## Goal

Make **classbot one service with two student modes** — **교사 주도형** (current: bots assigned by a teacher) and **학생 자기주도형** (new: student self-enrolls in official curriculum tutors and learns goal-by-goal) — reusing the existing student layer (3-col chat, quiz/study-guide rail, wellbeing, replay, primitives, DS) and adding only the mode toggle, a dual home, the official-tutor library + market, a goal/path/progress layer, and self-enrollment.

## Locked decisions (from brainstorming)

1. **One service, two modes** — not a separate product; one classbot app.
2. **Explicit mode toggle** — the student app has a top-level `교사 수업 ↔ 자기주도` switch. Each mode has its own home / bot list / replay context. A student can hold both and switch.
3. **Entry = both (standalone-capable + add-on)** — a teacher-less student can sign up and use self-directed alone (onboarding/empty states must stand without a teacher); a teacher-enrolled student gets self-directed as an add-on. Teacher-less → defaults to `self`; enrolled → defaults to `class`.
4. **Self-directed bots = official curriculum tutors only (MVP)** — platform-authored subject tutors the student self-enrolls from the 봇 마켓. Student-created/custom tutors are **deferred**.
5. **Learning model = goal/path + progress (MVP)** — pick a 목표/단원 → the tutor guides a path (개념 → 연습 퀴즈 → 점검), with progress + streak + a daily "오늘의 한 가지" nudge. (NOT free-chat-only; NOT adaptive/diagnostic — that's deferred.)

**Approach:** thin **vertical MVP** — one end-to-end self-directed loop (toggle → market → enroll → self-home → goal/path → chat/quiz/점검) with 2–3 tutors, mostly mock/reused, then broaden. (Vs horizontal-by-layer / shell-first — both delay a working loop.)

---

## 1. Mode architecture

- New state **`StudentMode = 'class' | 'self'`** — a zustand store with `persist` (mirror `lib/store/sidebar.ts`'s pattern; key `pullim-student-mode`). Default resolved on load: `self` when the student has **no teacher enrollments**, else `class`.
- A **mode toggle** in the student shell (top of `AppHeader` or a segmented control under it; desktop + a compact mobile form). Switching re-renders the student home + nav emphasis + bot list + replay scope for that mode. Teacher role is unaffected (the toggle is student-only).
- **Routing:** keep the existing `app/(student)/classbot/*` routes. Mode is a *cross-cutting context*, not a route prefix — the same routes (home, chat, wellness, replay) render mode-aware content; **self-only** surfaces (the self home's goal/path, the tutor market) get new routes under `app/(student)/classbot/self/*` (or a `learn/*` segment). Teacher-only student surfaces (받은 과제, teacher-live) are hidden/empty in `self` mode.
- **Shell/nav (`components/shell/*`):** `AppSidebar`/`BottomNav` show a mode-aware student nav. This touches shared shell — **flag + keep additive** (the `Role` type stays `student | teacher`; mode is a sub-context of `student`, NOT a third Role).

## 2. Official tutor library + 봇 마켓

- New **`officialBots`** mock (`lib/mock/classbot-official.ts`) — platform-authored curriculum tutors reusing the existing `ClassBot` shape + `botSignature`/persona system. Each tutor: subject, persona/tone, default scope, and a **curriculum** (ordered 단원 list). MVP: 2–3 subjects (e.g. 수학·영어·과학).
- **Unlock the existing `봇 찾기 (공식 봇 마켓)` nav item** (currently `locked: true` in `nav-config.ts:49`) as the self-mode discovery surface: browse official tutors → **self-enroll**.
- **`SelfEnrollment`** (student ↔ official tutor) — distinct from teacher `StudentEnrollment`. A self-mode student's "내 튜터" list = their self-enrollments; a class-mode student's bot list = teacher enrollments. (A student may have both; each mode shows only its own.)

## 3. Self-directed learning layer (goal/path + progress)

- **Self home** (`self` mode home): "오늘의 한 가지" nudge + active goals + streak + 내 튜터 grid + enter-market CTA. Reuses KPI/EmptyState/SectionHeading/momentum patterns.
- **Goal/Path:** per enrolled tutor, pick a **목표/단원** → a path of steps: **개념 학습** (study-guide content + chat) → **연습 퀴즈** (the existing quiz/study-guide rail content) → **점검** (a short check). Reuse the 3-col chat (the tutor as the bot) + the `chat-study-rail` quiz/guide.
- **Progress model** (`LearningGoal`, `UnitProgress`): per tutor/unit completion state + a daily **streak** + the "오늘의 한 가지" selection. Light, mock-persisted (localStorage), standalone (no teacher).
- **Scope in self-mode:** self-set or a sensible full-help default (no exam lockdown, since no teacher policy). Reuse the existing Scope system, defaulting open.

## 4. Data model (mock-first; BE is a separate later track)

New mock + stores (FE-only this track):
- `lib/mock/classbot-official.ts` — `officialBots` + their curricula (단원).
- `lib/store/student-mode.ts` — `StudentMode` (persist).
- `lib/store/self-learning.ts` — `SelfEnrollment[]`, `LearningGoal`/`UnitProgress`, streak, "오늘의 한 가지" (persist). Standalone-capable (no teacher dependency); follows the demo-fallback philosophy already in the repo.
- Reuse `ClassBot`/`botSignature`/quiz/study-guide/wellbeing types as-is.

## 5. Reuse vs new

- **Reuse (most):** 3-col chat (`chat/page.tsx` + `chat-study-rail`), quiz/study-guide, wellbeing (shared across modes), replay, the primitive set, the Pullim DS, auth, the sidebar toggle pattern.
- **New:** mode toggle + dual student home + official-tutor library/market (unlock 봇 찾기) + goal/path/progress layer + `SelfEnrollment` + the two new stores.

## 6. MVP scope (this spec → first plan(s))

**In:** `StudentMode` toggle + mode-aware shell/home/nav · official tutors 2–3 + the 봇 마켓 self-enroll · self home (오늘의 한 가지 + goals + streak + 내 튜터) · one end-to-end goal/path loop (개념→연습 퀴즈→점검) for one subject, reusing chat + quiz rail · mock-persisted progress.
**Out (deferred):** student-created/custom tutors; adaptive/diagnostic (IRT) recommendation; BE persistence + real auth-scoped self-enrollment; cross-mode analytics; the teacher-side "publish to market" authoring.

## 7. Constraints & e2e

- **Preserve everything current:** the teacher experience and the current student **class-mode** flows are unchanged; the mode toggle + self surfaces are **additive**. All prod-verify e2e stay green — color-palette (8 routes; self-home `/classbot` and any scanned self routes must stay green/amber-free), chat (data-slots, greeting/quick-prompts), wellness-intensity-range, mobile-and-focus (수업 종료, assignment-form testids, solve a11y), slider-variants. New self surfaces follow the same guards (no green/amber on student routes; 44px touch; focus rings; DS type scale).
- **Role stays `student | teacher`**; mode is a student sub-context (do NOT add a third Role or break `findActiveSection`/nav).
- **FE-only, mock-first.** BE write/persistence + real auth-scoped self-enrollment is a **separate BE PR track** (repo rule: FE/BE never mixed). The mock/localStorage layer makes the whole loop demoable + e2e-able without a BE (consistent with the existing demo-fallback approach).
- **Phased stacked PRs** off `dev` → PR to `dev` (team flow `dev → main`). Each FE-only + small.

## 8. Phasing (for the plan)

1. **PR-1 — Mode foundation:** `StudentMode` store + the student-shell mode toggle + mode-aware nav/home routing scaffold (class-mode unchanged; self-mode shows a placeholder home). Default-mode resolution. e2e: class-mode flows + color-palette unchanged.
2. **PR-2 — Official tutors + market:** `classbot-official.ts` (2–3 tutors + curricula) + unlock the 봇 찾기 market (browse + self-enroll) + `SelfEnrollment` store + "내 튜터" list in self-home.
3. **PR-3 — Self home + goal/path:** self home (오늘의 한 가지 + goals + streak) + the goal/단원 picker + the path scaffold.
4. **PR-4 — Learning loop:** the 개념→연습 퀴즈→점검 loop wired to the 3-col chat + quiz/study-guide rail for one subject end-to-end + progress/streak persistence.
5. **PR-5 — Polish + onboarding:** self-mode standalone onboarding (teacher-less entry), empty states, motion, a11y, mobile.

Each PR: typecheck + lint+gates + jest + the relevant prod-verify e2e (esp. color-palette on touched routes) + boot smoke.

---

## Self-review

**Spec coverage:** the 5 locked decisions → §1 (toggle, entry) / §2 (official tutors, market) / §3 (goal-path learning) / §4 (data) ; MVP vertical → §6/§8. ✅
**Placeholder scan:** concrete file/store names + the existing-code anchors (`nav-config.ts:49` 봇 찾기, `StudentEnrollment`, `lib/store/sidebar.ts` pattern). MVP/out-of-scope explicit. No TBD.
**Consistency:** mode is a student sub-context (not a Role) — stated in §1 and §7; standalone-capable entry (§3 decision) consistent with the mock-first/demo-fallback data layer (§4/§7).
**Ambiguity:** "self surfaces get new routes under `self/*` or `learn/*`" — the plan picks one; flagged as a plan-time choice, not a spec gap.
**Scope:** large but coherently phased (5 PRs); each PR is a working increment. The first plan should cover **PR-1 (mode foundation)** only, like the DS revamp stack — subsequent phases get their own plans.
