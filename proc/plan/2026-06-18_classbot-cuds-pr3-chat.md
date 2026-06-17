# CUDS PR-3 Chat 3-Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild `/classbot/chat` as a chatbot-centric layout — the center column is messages + composer only (fills shell height), bot identity / scope / watched-by / live status move into the shell-owned right context rail on desktop (a slim collapsible header on mobile), consuming `BotIdentityCard` + `LiveBadge` + `useSetRightRail` from PR-2a/2b — **without breaking any prod-verify chat e2e spec.**

**Architecture:** `ChatPanel` (keyed by `bot.id`, remounts per bot) calls `useSetRightRail(node)` to register a per-bot rail node; the shell's `RightRailAside` (desktop `hidden lg:flex w-80`) renders it. The dark inline `bot-meta-header` is replaced by `BotIdentityCard` used twice: comfortable in the rail (desktop) and compact/collapsible on a `lg:hidden` mobile header. LiveOverlay stays in the center column (unchanged) so live e2e contracts hold.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (CUDS tokens), sonner, Playwright (prod-verify e2e).

## Global Constraints

**E2E DOM contract — these MUST be preserved verbatim, in the message/center column, or specified specs break (grep-verified against `apps/classbot/tests/e2e/`):**
- `data-slot="chat-scroll"` — the single overflow-y scroll `<div>` with `ref=scrollRef`, `onScroll=handleScroll`, sticky-to-bottom logic. Keep byte-identical except the size classes. (chat-scroll-and-input, chat-greeting)
- `data-slot="new-message-banner"` — the "새 메시지" button, visible only when scrolled up, click → scrollToBottom + hide. (chat-scroll-and-input)
- textarea placeholder matching `/에게 물어보세요/` (`${bot.name}에게 물어보세요…`). (chat-scroll-and-input, chat-greeting)
- send button `aria-label="질문 보내기"` **exact**, disabled on empty/whitespace. (chat-scroll-and-input)
- message bubble body keeps the literal class `whitespace-pre-wrap`. (chat-scroll-and-input)
- bot-chip strip: all 5 bots simultaneously present as `role=button` with accessible name = `bot.name`, always visible/clickable (keep the `myBots.length > 1` gate). (quick-prompts, greeting)
- quick-prompt chips as `role=button` with exact subject text, swap per selected bot; `ChatPanel key={bot.id}` remount must clear stale prompts. (quick-prompts)
- first-message greeting text per bot in the thread (e.g. `/수학이 형이야/`). (chat-greeting)
- `?bot=cb_001` query-param routing preserved. (student-live)
- LiveOverlay strings stay rendered on `/chat` when live, **in the center column, simultaneously visible with the chat thread**: `실시간 자막`, `선생님에게 질문`, `지금 즉석 퀴즈`, `getByLabel('질문 입력')`, button `선생님에게 질문 보내기` (exact), `/교사 검토 중/`. (student-live — INC-2: do NOT tab/accordion these away from the chat thread)
- `봇과 대화` exact text stays as the chat-card sub-header.

**Duplicate-text rule (Playwright strict mode):** the strings `지금 봇 범위` (scope `<details>` summary) and `라이브 정책 적용 중` (live lock banner) are asserted with `getByText` — they must exist **exactly once** in the DOM and be visible at desktop. Render them **only in the rail** (non-collapsible). The `lg:hidden` mobile header must NOT contain these strings (a CSS-hidden duplicate still counts as a strict-mode match and fails). (student-live:25,98,104 — INC-1)

**Other:** tokens only, no hardcoded hex in `components/**` (the one allowed exception is `botSignature(bot).hex` data-driven inline avatar bg). Korean typography; `<html lang="ko">`/`x-build-sha` intact. Work on branch `feat/cuds-pr3-chat` (created, stacked on PR-2b). Commit per task. Verify per task from `apps/classbot/`: `bun run test && bun run typecheck && bun run build && bun run gates`.

---

### Task 1: Center column fills shell height + chip LiveBadge dot

**Files:** Modify `apps/classbot/app/(student)/classbot/chat/page.tsx`.

**Interfaces:** none new.

- [ ] **Step 1: Root → flex column**

At `ClassbotChatPageInner` root (chat/page.tsx:104), change the wrapper `<div className="space-y-3">` to `<div className="flex h-full min-h-0 flex-col gap-3">`.

- [ ] **Step 2: Chat section fills height**

The `<section>` "봇과 대화" card (chat/page.tsx:387, `bg-card flex flex-col rounded-2xl border mt-3`) → add `flex-1 min-h-0` and drop `mt-3` (gap handles it).

- [ ] **Step 3: Scroll region grows (drop hardcoded heights)**

On the `data-slot="chat-scroll"` div (chat/page.tsx:400-401), change `className="flex max-h-[520px] min-h-[360px] flex-col gap-3 overflow-y-auto p-4"` → `className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto p-4"`. **Keep `data-slot="chat-scroll"`, `ref={scrollRef}`, `onScroll={handleScroll}` unchanged.**

- [ ] **Step 4: Chip strip LiveBadge dot**

Import `LiveBadge` from `@/components/classbot/live-badge`. In the bot-chip strip (chat/page.tsx:128-130), replace the inline `<span className="bg-pullim-danger pullim-anim-live-pulse inline-block h-1.5 w-1.5 rounded-full" aria-label="라이브 진행 중" />` with `<LiveBadge variant="dot" aria-label="라이브 진행 중" />`. (Keep it conditional on `isLiveNow`.)

- [ ] **Step 5: Verify scroll mechanics intact**

`cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Then `bun run dev`, open `/classbot/chat`, confirm: the message area fills the viewport height (no 520px cap, no dead space), scrolling works, the composer stays at the bottom. Stop dev. (Full e2e in Task 4.)

- [ ] **Step 6: Commit** — `git commit -m "feat(chat): center column fills shell height; chip LiveBadge dot"`

---

### Task 2: Bot identity/scope/live → right rail (desktop) + slim mobile header

**Files:** Modify `apps/classbot/app/(student)/classbot/chat/page.tsx`.

**Interfaces:**
- Consumes `useSetRightRail` from `@/components/shell/right-rail-context`; `BotIdentityCard` from `@/components/classbot/bot-identity-card`; `LiveBadge` from `@/components/classbot/live-badge`; `LiveHeaderMeta` from `@/components/classbot/live-overlay`.

- [ ] **Step 1: Build the rail node + register it (desktop identity/scope/live)**

Inside `ChatPanel` (chat/page.tsx:148), after the existing hooks, add a memoized rail node and register it:
```tsx
const railNode = useMemo(() => (
  <BotIdentityCard
    bot={bot}
    density="comfortable"
    headingLevel="h2"
    showSignatureLiner
    trailing={isLive ? <LiveBadge variant="pill" /> : undefined}
  >
    {/* watched-by-teacher — always visible (no collapse) */}
    <div className="bg-white/10 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
      <Eye className="text-pullim-lemon h-3 w-3" />
      <span className="text-white/90"><strong className="text-pullim-lemon">{bot.teacherName}</strong>이 이 대화를 실시간으로 볼 수 있어요. 시험 기간엔 자동 차단.</span>
    </div>
    {isLive ? (
      /* live lock banner — the ONLY copy of "라이브 정책 적용 중" */
      <div className="bg-pullim-lemon/15 border-pullim-lemon/40 mt-2 rounded-lg border px-3 py-1.5 text-[11px]">
        <span className="text-pullim-lemon font-bold">🔒 라이브 정책 적용 중</span>
        <span className="text-white/80 ml-1">— {scope.label} <span className="font-mono text-[10px] text-white/55">({scope.short})</span>으로 자동 잠금. 종료 후 평시 정책 복귀.</span>
      </div>
    ) : (
      /* scope schedule — the ONLY copy of "지금 봇 범위" */
      <details className="bg-pullim-blue-700/30 mt-2 rounded-lg px-3 py-1.5 text-[11px] backdrop-blur">
        <summary className="cursor-pointer list-none flex items-center gap-1.5">
          <span className="bg-pullim-lemon text-pullim-lemon-ink rounded-full px-1.5 py-0.5 text-[10px] font-bold">{scope.label}</span>
          <span className="text-white/90 font-semibold">지금 봇 범위 — {scope.allow}</span>
          <span className="text-white/60 ml-auto text-[10px]">시간대별 자동 변동 ↗</span>
        </summary>
        <div className="text-white/80 mt-2 space-y-0.5 leading-relaxed">
          <p>· 18:00~19:00 · 단계 힌트까지 <span className="font-mono text-[10px] text-white/55">(L4)</span></p>
          <p>· 19:00~22:00 · 개념까지 <span className="font-mono text-[10px] text-white/55">(L3)</span> ← 현재 학원 시간</p>
          <p>· 22:00 이후 · 답까지 <span className="font-mono text-[10px] text-white/55">(L5)</span> 자기학습</p>
        </div>
      </details>
    )}
    {isLive && <LiveHeaderMeta bot={bot} />}
  </BotIdentityCard>
), [bot, isLive, scope]);
useSetRightRail(railNode);
```
Keep the `Eye`/`Shield` imports as needed. (These move the watched banner from chat/page.tsx:346-351, the scope `<details>` from :354-369, and the live lock from :370-375 verbatim — into the rail.)

- [ ] **Step 2: Replace the dark inline header with a slim mobile-only BotIdentityCard**

Replace the entire `<header data-slot="bot-meta-header" ...>` block (chat/page.tsx:270-378) with a `lg:hidden` mobile header that carries IDENTITY ONLY (no scope/watched/live children — those live in the rail, and a CSS-hidden duplicate here would break Playwright strict mode):
```tsx
<div className="lg:hidden">
  <BotIdentityCard
    bot={bot}
    density="compact"
    headingLevel="h1"
    collapsed={headerCollapsed}
    showSignatureLiner
    data-slot="bot-meta-header"
    data-collapsed={headerCollapsed ? 'true' : 'false'}
    leading={
      <Link href="/classbot" aria-label="클래스봇 홈으로" className="text-pullim-slate-300 hover:text-pullim-lemon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    }
    trailing={
      <button type="button" onClick={() => setHeaderCollapsed(c => !c)} aria-label={headerCollapsed ? '봇 정보 펼치기' : '봇 정보 접기'} aria-expanded={!headerCollapsed} className="text-pullim-slate-300 hover:bg-white/10 hover:text-white inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        {headerCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
    }
  />
</div>
```
If `BotIdentityCard` does not already forward arbitrary props (`data-slot`/`data-collapsed`) to its root element, READ `bot-identity-card.tsx` and add a `data-slot`/`data-collapsed` passthrough (or a `rootProps`) so the mobile header keeps `data-slot="bot-meta-header"` + `data-collapsed` (DOM stability; not e2e-required but recommended). Keep the existing `keyboardOpen → setHeaderCollapsed(true)` effect (chat/page.tsx:174-176) and the `headerCollapsed` state.

- [ ] **Step 3: Remove now-dead inline markup + the old liner span**

Delete the old inline identity row, org eyebrow, name h1, subject/grade/tone chips, Shield badge, watched banner, scope details, live lock, and the `pullim-anim-liner-swipe` span (chat/page.tsx:276-378) that the two BotIdentityCards now render. Remove imports left unused (e.g. `Shield` if only the old badge used it). Keep `ArrowLeft`, `ChevronDown`, `ChevronUp`, `Eye`.

- [ ] **Step 4: isLive consistency**

`BotIdentityCard` reads `bot.isLive` internally for its avatar breath + corner badge; the chat page derives `isLive` from `useLiveStore`. Confirm both agree for the live bot, or (if they can diverge) note it — the rail's `trailing` LiveBadge + live-lock already reflect the store's `isLive`, which is the authoritative live signal for this page.

- [ ] **Step 5: Verify desktop rail + mobile header + e2e text uniqueness**

`cd apps/classbot && bun run typecheck && bun run build && bun run gates`. Then `bun run dev`:
- Desktop (≥1024px): identity + scope/live appear in the right rail; the message column has no dark identity wall.
- Resize to ~400px: the slim mobile header shows; collapse toggle works.
- **Strict-mode check:** in DevTools console at desktop width, run `document.querySelectorAll('*')` text search isn't needed — instead grep the rendered HTML: confirm `지금 봇 범위` and `라이브 정책 적용 중` each appear once (they're only in the rail). Stop dev.

- [ ] **Step 6: Commit** — `git commit -m "feat(chat): bot identity/scope/live → right rail (desktop) + slim mobile header"`

---

### Task 3: Consolidate the two ad-hoc toasts onto sonner

**Files:** Modify `apps/classbot/app/(student)/classbot/chat/page.tsx`, `apps/classbot/components/classbot/chat-attach-sheet.tsx`.

**Interfaces:** none new (the global `<Toaster>` is already mounted in `app/layout.tsx:85`, position top-center).

- [ ] **Step 1: chat page notice → sonner**

In `chat/page.tsx`: remove the `notice` state (line 168) and the `<p role="status">{notice}</p>` block (lines 482-484). `ChatVoiceButton`'s `onNotify` handler (lines 457-460) should call `toast(msg)` (import `{ toast }` from `'sonner'`) instead of `setNotice`. Keep the message text identical (`음성 입력은 곧 열려요…`).

- [ ] **Step 2: chat-attach-sheet → sonner**

In `chat-attach-sheet.tsx`: remove the `openMessage` state (line 24) and the fixed toast `<div role="status">` (lines 63-70). `handlePick` (lines 26-30) calls `toast(msg)` from `'sonner'`. Keep the message text identical (`{label} — 곧 추가될 기능이에요…`). If `ChatVoiceButton`'s `onNotify` prop is now unused, drop the prop plumbing.

- [ ] **Step 3: Verify**

`cd apps/classbot && bun run typecheck && bun run build && bun run gates`. `bun run dev`, open `/classbot/chat`, click the `[+]` attach and `[🎤]` voice — confirm a single top-center sonner toast appears (no inline duplicate). Stop dev.

- [ ] **Step 4: Commit** — `git commit -m "feat(chat): consolidate inline toasts onto sonner"`

---

### Task 4: PR-3 verification gate (incl. chat e2e contract)

**Files:** none.

- [ ] **Step 1: Full CI** — from repo root: `bun --filter @pullim-classbot/classbot typecheck && bun --filter @pullim-classbot/classbot lint && bun --filter @pullim-classbot/classbot test && bun --filter @pullim-classbot/classbot build` → all pass.

- [ ] **Step 2: E2E DOM contract grep** — confirm every preserved marker still exists in the new `chat/page.tsx`:
```bash
cd apps/classbot
grep -c 'data-slot="chat-scroll"' "app/(student)/classbot/chat/page.tsx"      # 1
grep -c 'data-slot="new-message-banner"' "app/(student)/classbot/chat/page.tsx" # 1
grep -c '에게 물어보세요' "app/(student)/classbot/chat/page.tsx"               # ≥1
grep -c '질문 보내기' "app/(student)/classbot/chat/page.tsx"                    # ≥1 (exact aria-label)
grep -c 'whitespace-pre-wrap' "app/(student)/classbot/chat/page.tsx"           # ≥1
grep -c '봇과 대화' "app/(student)/classbot/chat/page.tsx"                       # 1
grep -c '지금 봇 범위' "app/(student)/classbot/chat/page.tsx"                    # 1 (rail only)
grep -c '라이브 정책 적용 중' "app/(student)/classbot/chat/page.tsx"            # 1 (rail only)
```
All counts as annotated. If `지금 봇 범위` or `라이브 정책 적용 중` is >1, FIX (duplicate breaks Playwright strict mode).

- [ ] **Step 3: Run the chat e2e specs locally** — start the dev server, then run the chat-touching specs against it:
```bash
cd apps/classbot
bun run dev &  # wait for Ready on :3032
PLAYWRIGHT_BASE_URL=http://localhost:3032 bunx playwright test tests/e2e/chat-scroll-and-input.spec.ts tests/e2e/chat-greeting-by-bot.spec.ts tests/e2e/chat-quick-prompts-by-bot.spec.ts tests/e2e/student-live-and-flows.spec.ts
```
All must pass. If Playwright browsers aren't installed, run `bunx playwright install chromium` first. If the environment cannot run Playwright at all, FALL BACK to: boot the dev server and `curl`-verify `/classbot/chat?bot=cb_001` (live) and `/classbot/chat?bot=cb_002` (non-live) return 200, plus a `javascript`/DOM check that the asserted strings render once and visible at a 1280px viewport (document the method used). Stop dev.

- [ ] **Step 4: Boot smoke** — `/classbot/chat`, `/classbot/chat?bot=cb_002`, `/classbot` → 200, zero runtime errors in the dev log.

- [ ] **Step 5: Done** — fix any gap in the owning task's file, re-run, commit `fix(chat): <what>`.

---

## Self-Review

**Spec coverage (design §4):** center = messages+composer flex-fill → T1; identity/scope/watched/live → rail + mobile slim header → T2; LiveBadge dedup → T1/T2; toast consolidation → T3. Live-mode 2-region (quiz/question → rail) is **deferred** — LiveOverlay stays in the center to preserve INC-2 (chat + overlay simultaneously visible); a later refinement can split it once the e2e is updated. Mobile scope/live detail is **deferred** (rail is desktop-only; mobile shows slim identity) to keep the asserted strings single-instance — noted as a follow-up.

**Placeholder scan:** the rail node + mobile header JSX are given verbatim; e2e contract is explicit. No TBD.

**Type consistency:** `useSetRightRail`/`BotIdentityCard`/`LiveBadge`/`LiveHeaderMeta` prop shapes match their PR-2a/2b definitions. `BotIdentityCard` may need a `data-slot`/`data-collapsed` passthrough (T2 Step 2 handles it).

**Risk note:** the highest risk is the Playwright strict-mode duplicate-text rule — T2 renders `지금 봇 범위`/`라이브 정책 적용 중` only in the rail, and T4 Step 2 grep-asserts count==1. T4 Step 3 runs the actual specs as the real safety net.
