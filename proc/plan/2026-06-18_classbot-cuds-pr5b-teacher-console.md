# CUDS PR-5b Teacher Console (grading / reports / replay / assignment-form) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refine the teacher console cluster (grading list+detail, reports list+detail, replay list+detail, assignment dispatch form) to CUDS variant-B — ContextRail on the detail pages, ScoreDisplay/AlertCard/EmptyState/BotNote adoption, dark action-slab softening — while preserving the assignment-form e2e contracts exactly.

**Architecture:** Detail pages (grading-detail, reports/[id], replay/[id]) adopt the `ContextRail` primitive (primary content left, meta/action in the rail). Hand-rolled danger/info sections become `AlertCard`; empty list cases become `EmptyState`; the dark slate-900 action slab on grading-detail softens to a light `bg-card` surface. The assignment-form's load-bearing testids and mode-radio a11y are untouched — only its surrounding exam-section + hint copy adopt AlertCard/BotNote.

**Tech Stack:** Next.js 16, Tailwind v4 (CUDS tokens), Playwright (mobile-and-focus).

## Global Constraints

**E2E contracts (mobile-and-focus — MUST preserve, assignment-form):**
- `data-testid="title-input"` on the title field, which ALSO has `id="af-title"` with a paired `<label htmlFor="af-title">` — keep all three on the same control; visible + focusable + fillable at 375px.
- `data-testid="dispatch-btn"` visible; clicking it (after a title) navigates to **`/teacher/classbot`** (exact URL). Keep `router.push('/teacher/classbot')`.
- `data-testid="mode-practice"` + `data-testid="mode-exam"` are `role="radio"` with `aria-checked` — practice default `true`, mutually exclusive toggle. **Do NOT migrate the mode toggle to RadioCard or any component.** Leave the mode-radio group exactly as-is.
- body `word-break: keep-all` global — untouched.

**color-palette:** these console routes (grading, grading/[id], reports, reports/[id], replay, replay/[id], assignment/new) are **NOT scanned** → semantic green/amber (success/warn) IS allowed where genuinely meaningful (token-based, no hex). **EXCEPTION:** do NOT bleed green/amber into `/teacher/classbot` (that route IS scanned) — but PR-5b doesn't touch it.

**No confidence bug:** investigation found `aiConfidence` is a 0–100 int rendered correctly (`grading-row.tsx` bar `width: ${aiConfidence}%`, label `{aiConfidence}%`; `grading-detail.tsx` `AI 신뢰도 {aiConfidence}%`). **No fix needed** — do not "correct" it.

**Other:** tokens only, no hex; Korean typography. Mock flows preserved. Work on branch `feat/cuds-pr5b-teacher-console` (created, stacked on PR-5a). **A dev server runs on :3032 for the user's iPad — implementers must NOT run `bun run dev`; verify with typecheck/build/gates; `git add` specific files only; the controller runs e2e.** Commit per task. (Deferred from PR-5a: the builder deploy-footer state-lift stays deferred — the standalone primary CTA is acceptable; NOT in PR-5b scope.)

---

### Task 1: Grading list + detail — EmptyState + ContextRail + slab soften + AlertCard

**Files:** Modify `apps/classbot/app/(teacher)/teacher/grading/page.tsx` + `apps/classbot/app/(teacher)/teacher/grading/[id]/grading-detail.tsx`.

- [ ] **Step 1 (list): EmptyState** — in grading/page.tsx, the empty-queue bare `<p>` (~:87-90) → `<EmptyState icon={ClipboardCheck} title="검수할 채점이 없어요" description="학생들이 새로 제출하면 여기에 쌓여요." size="md" />` (import EmptyState + ClipboardCheck). TeacherPageShell/KpiStat/FilterPills already adopted — keep.
- [ ] **Step 2 (detail): ContextRail** — in grading-detail.tsx, replace the manual `<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]"><div>…left…</div><aside>…right…</aside></div>` (~:92-213) with `<ContextRail railWidth="lg" stickyRail rail={<>…right aside content…</>}>…left content…</ContextRail>` (import ContextRail). Left = student response + RubricEditor + comment; rail = OverrideDeltaMeter + history + 메모.
- [ ] **Step 3 (detail): soften the dark action slab** — the sticky action bar (~:133, `bg-pullim-slate-900 sticky bottom-4 rounded-2xl p-3 shadow-pullim-md`) → `bg-card border sticky bottom-4 rounded-2xl p-3 shadow-pullim-md`. Update children: the `text-pullim-slate-300` label → `text-pullim-slate-500`; the approve button `bg-pullim-slate-700 hover:bg-pullim-slate-600 text-white` → `bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-800`; the slab's `<ScoreDisplay tone="inverse">` (~:140) → `tone="threshold"` (no longer on dark).
- [ ] **Step 4 (detail): AlertCard + EmptyState** — the 1:1 면담 메모 section (`bg-pullim-slate-50 rounded-2xl p-4`, ~:192-211) → `<AlertCard tone="info" icon={MessageSquare} title="1:1 면담 메모">…</AlertCard>` (import AlertCard, MessageSquare). The history empty `<p>이력 없음</p>` (~:172) → `<EmptyState title="이력 없음" size="sm" tone="plain" />`.
- [ ] **Step 5: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep no `bg-pullim-slate-900` remains on the grading-detail slab; ScoreDisplay tone fixed.
- [ ] **Step 6: Commit** — `git commit -m "feat(teacher-grading): EmptyState + ContextRail + soften action slab + AlertCard"`

---

### Task 2: Reports list + detail — EmptyState + AlertCard + stickyRail

**Files:** Modify `apps/classbot/app/(teacher)/teacher/reports/page.tsx` + `apps/classbot/app/(teacher)/teacher/reports/[id]/page.tsx`.

- [ ] **Step 1 (list): EmptyState** — reports/page.tsx empty `<p>` (~:62-64) → `<EmptyState icon={BarChart3} title="아직 생성된 리포트가 없어요" description="매일 19:50 자동 생성돼요." size="md" />` (import EmptyState, BarChart3). KpiStat/FilterPills already adopted — keep.
- [ ] **Step 2 (detail): 위기 신호 → AlertCard** — reports/[id]/page.tsx hand-rolled danger section (`border-pullim-danger/30 bg-pullim-danger-bg rounded-2xl border p-4`, ~:48-83) → `<AlertCard tone="danger" icon={AlertTriangle} title={`위기 신호 ${report.alerts?.length}건`}>{list + buttons}</AlertCard>`. The inner 1:1 상담 시작 button currently `bg-pullim-slate-900 hover:bg-pullim-slate-800 text-white` (dark-slab leak) → `bg-pullim-danger text-white hover:bg-pullim-danger/90` (semantically appropriate inside a danger card; console route allows it).
- [ ] **Step 3 (detail): rail 면담 메모 → AlertCard + stickyRail** — the `bg-pullim-slate-50 rounded-2xl p-4` 면담 메모 section in the existing ContextRail rail (~:114-123) → `<AlertCard tone="info" icon={MessageCircle} title="첨부된 1:1 면담 메모">…</AlertCard>`. Add `stickyRail` to the existing `<ContextRail>` (~:109) so the WellbeingGauge stays in view.
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(teacher-reports): EmptyState + 위기/메모 AlertCard + stickyRail"`

---

### Task 3: Replay list + detail (teacher) — BackLink + EmptyState + ContextRail + BotNote

**Files:** Modify `apps/classbot/app/(teacher)/teacher/replay/page.tsx` + `apps/classbot/app/(teacher)/teacher/replay/[id]/page.tsx`.

- [ ] **Step 1 (list): BackLink + EmptyState** — replay/page.tsx: add `<BackLink href="/teacher">` above the PageHeader (~:47, import BackLink from `@/components/classbot/back-link`); the empty `<li>…이 상태의 리플레이가 없어요</li>` (~:83-85) → `<li><EmptyState icon={History} title="이 상태의 리플레이가 없어요." size="md" /></li>` (import EmptyState, History). The custom client-state filter buttons (~:53-79) stay (FilterPills only emits Links — not substitutable for client `setFilter`).
- [ ] **Step 2 (detail): ContextRail** — replay/[id]/page.tsx: when `data.status !== 'processing'`, wrap the takeaways + segments sections (~:138-175) in `<ContextRail railWidth="sm" rail={data.segments.length > 0 ? <…segments…> : undefined}>…keyTakeaways…</ContextRail>` (import ContextRail). Removes the `segments.length > 0` conditional from the outer flow.
- [ ] **Step 3 (detail): BotNote** — the processing-card hint text (`text-pullim-slate-500 mt-1 text-xs`, ~:131-133) → `<BotNote icon={Sparkles}>처리 완료 시 …</BotNote>` (import BotNote, Sparkles). The status badge section (~:119-125, lemon/blue/slate tones) stays as-is (lemon = distinct "needs action" language, not a dark slab; this route isn't scanned).
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`.
- [ ] **Step 5: Commit** — `git commit -m "feat(teacher-replay): BackLink + EmptyState + ContextRail + BotNote"`

---

### Task 4: Assignment-form — exam-section AlertCard + BotNote hints (testids untouched)

**Files:** Modify `apps/classbot/app/(teacher)/teacher/assignment/new/assignment-form.tsx`.

- [ ] **Step 1: DO NOT TOUCH the e2e contracts** — leave intact, byte-for-byte: the title field's `data-testid="title-input"` + `id="af-title"` + `<Label htmlFor="af-title">` (~:218-229); `data-testid="dispatch-btn"` (~:486) + its `router.push('/teacher/classbot')` (~:159); the mode-radio group `data-testid="mode-practice"`/`"mode-exam"`/`"mode-wrong-conquest"` with `role="radio"` + `aria-checked` (~:233-257). **Do NOT migrate the mode toggle to RadioCard.**
- [ ] **Step 2: Exam-mode section → AlertCard** — the conditional 시험 모드 설정 section (`border-pullim-danger/30 bg-pullim-danger-bg rounded-2xl border p-4` + SectionHeading, ~:421-455) → `<AlertCard tone="danger" icon={Shield} title="시험 모드 설정">{slider + scope note}</AlertCard>` (import AlertCard, Shield). Drop the now-redundant inner SectionHeading. **This section does NOT contain the mode radios** (those are in section ①) — verify before editing.
- [ ] **Step 3: BotNote hints** — the Scope L1 note inside the exam section (`bg-white/50 rounded-lg p-2 text-[11px]`, ~:449-452) → `<BotNote icon={Shield}>Scope L1 자동 — 발사 후엔 변경할 수 없어요.</BotNote>`; the RAG 인덱스 hint `<p>`(~:303-306) → `<BotNote icon={BookOpen}>선택 단원의 RAG 인덱스에서 자동 추출돼요.</BotNote>` (import BotNote, BookOpen). The sticky action bar (~:459) already uses `bg-card border` — leave it (not a dark slab).
- [ ] **Step 4: Verify** — `cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Grep-confirm the contracts survive: `grep -c 'title-input'`==1, `grep -c 'af-title'`≥2 (id + htmlFor), `grep -c 'dispatch-btn'`==1, `grep -c "/teacher/classbot"`≥1, `grep -c 'mode-practice'`==1 + `grep -c 'mode-exam'`==1, `grep -c 'role="radio"'`≥2 (or aria-checked ≥2).
- [ ] **Step 5: Commit** — `git commit -m "feat(teacher-assignment-form): exam AlertCard + BotNote hints (e2e testids untouched)"`

---

### Task 5: PR-5b verification gate

**Files:** none.

- [ ] **Step 1: Full CI** — `bun --filter @pullim-classbot/classbot typecheck && … lint && … test && … build` → all pass.
- [ ] **Step 2: Contract grep (assignment-form)** — `title-input`==1, `af-title`≥2, `dispatch-btn`==1, `/teacher/classbot`≥1, `mode-practice`==1, `mode-exam`==1, `role="radio"`/`aria-checked` ≥2 (mode radios intact); no `bg-pullim-slate-900` slab left on grading-detail.
- [ ] **Step 3: assignment-form e2e** against live :3032:
```bash
cd apps/classbot
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/mobile-and-focus.spec.ts -g "교사 과제 발사" --reporter=line
```
(Run the assignment-form mobile tests — title-input/dispatch-btn visible at 375px, dispatch→/teacher/classbot, mode-practice/mode-exam aria-checked toggle.) These MUST pass. (The `:77` solve test + dispatch/feedback specs remain the documented STALE specs — not chased.)
- [ ] **Step 4: Boot smoke** — `/teacher/grading`, a grading detail id, `/teacher/reports`, a report detail id, `/teacher/replay`, a replay detail id, `/teacher/assignment/new` → 200, zero runtime errors in the dev log.
- [ ] **Step 5: Done** — fix any gap, re-run, commit `fix(teacher-console): <what>`.

---

## Self-Review

**Spec coverage (design §6.4 teacher detail):** grading list/detail → T1; reports list/detail → T2; replay list/detail → T3; assignment-form → T4; ContextRail/ScoreDisplay/EmptyState/AlertCard/BotNote adopted per page; dark action-slab softened (T1 grading slab, T2 reports button). The grading confidence "bug" was investigated → no bug, no change. ✅

**Placeholder scan:** every task has file:line + the primitive + the contract rule. No TBD.

**Type consistency:** `ContextRail`/`ScoreDisplay`/`EmptyState`/`AlertCard`/`BotNote`/`BackLink` props match their definitions (PR-2b/4b/5a). assignment-form testids/mode-radios preserved verbatim.

**Risk note:** the load-bearing contracts are entirely on the assignment-form (T4) — title-input id/label/testid, dispatch-btn→/teacher/classbot, mode-radio testids+aria-checked — all explicitly NOT touched (T4 only refines the exam-section + hints, which don't contain those elements). T5 greps the contracts + runs the assignment-form mobile e2e as the net. The grading-detail ContextRail swap (T1) is the largest structural change — verify the left/rail split renders.
