# 리플레이 깊이 PR-A (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 또는 executing-plans. 단계는 `- [ ]` 체크박스.

**Goal:** 리플레이 회고의 데이터·로직 토대 — 약점 파생, 시험지 문항 데이터, 해결 상태 스토어, exam-sheet 렌더러 — UI 배선 없이 단위 테스트로 검증.

**Architecture:** 순수 파생 함수(`getReplayWeakPoints`) + mock 문항(`ExamQuestion`/`getReplayQuiz`) + replay persist 스토어 확장(resolved) + 재사용 `ExamSheet` 컴포넌트. 모두 store/router 비의존(컴포넌트는 props·store만).

**Tech Stack:** Next.js 16(App Router), React 19, zustand+persist, Tailwind v4(PUDS 토큰), Jest + RTL.

## Global Constraints

- `components/**` hex 금지(토큰만), `text-[Npx]` 금지(타입 스케일), 44px 터치, focus-visible.
- 학생 라우트 **green/amber 금지** — exam-sheet/약점 칩은 danger(red)·blue·slate·lemon만.
- 시험지 영역만 의도적 serif(`font-serif` 유틸). 신규 hex 없음(기존 토큰).
- import alias `@/*` → `apps/classbot/*`. mock 구동(BE 없음).
- 검증: `bun --filter @pullim-classbot/classbot {typecheck,lint,test}` (worktree는 node_modules 심링크, build는 CI).
- 브랜치 `feat/classbot-replay-depth`(off dev). 커밋 per task.

---

### Task 1: 약점 파생 `getReplayWeakPoints`

**Files:** Create `apps/classbot/lib/mock/classbot-replay-recap.ts`, `apps/classbot/lib/mock/__tests__/classbot-replay-recap.test.ts`.

**Interfaces — Produces:**
- `type WeakPoint = { key: string; atSec: number; label: string; reason: 'wrong' | 'low-focus' }`
- `const FOCUS_THRESHOLD = 40`
- `getReplayWeakPoints(replay: Replay): WeakPoint[]` — wrong: `seg.type==='quiz' && seg.myAnswer && seg.correctAnswer && seg.myAnswer!==seg.correctAnswer` (key=`q:${atSec}`). low-focus: `focusBins[min]<FOCUS_THRESHOLD` → 가장 가까운 `concept|attention` 세그먼트(key=`f:${atSec}`); 같은 atSec dedupe(wrong 우선); `atSec` 정렬; 상위 4 cap.

- [ ] Step 1: 실패 테스트 — wrong 1 + low-focus 1 픽스처 → length/순서/reason 검증. 빈 focusBins·정답 only → []. dedupe·cap 케이스.
- [ ] Step 2: `bun --filter @pullim-classbot/classbot test -- classbot-replay-recap` → RED(module 없음).
- [ ] Step 3: 구현 (위 로직).
- [ ] Step 4: 테스트 GREEN.
- [ ] Step 5: 커밋 `feat(classbot): getReplayWeakPoints 약점 파생`.

### Task 2: 시험지 문항 데이터 `ExamQuestion` + `getReplayQuiz`

**Files:** Create `apps/classbot/lib/mock/classbot-replay-exam.ts`, `__tests__/classbot-replay-exam.test.ts`.

**Interfaces — Produces:**
- `type ExamPassage = { paragraphs: string[] }`, `type ExamBoxed = { lines: string[] }`
- `type ExamQuestion = { stem: string; passage?: ExamPassage; boxed?: ExamBoxed; options: string[]; answerIndex: number; explanation: string; subjectLabel: string }`
- `getReplayQuiz(replayId: string, atSec: number): ExamQuestion | null` — 시드 매핑(데모 sent 리플레이의 오답 세그먼트 atSec → 문항). 미존재 시 null.

- [ ] Step 1: 실패 테스트 — 알려진 (replayId, atSec) → ExamQuestion(options 길이·answerIndex 범위·subjectLabel). 미존재 → null.
- [ ] Step 2: RED.
- [ ] Step 3: 구현 — 데모 리플레이 id를 `getSentReplays()`에서 확인해 1~2개 오답 세그먼트에 문항 시드(영어 빈칸 1 = passage, 수학 1 = boxed).
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): ExamQuestion + getReplayQuiz 시드`.

### Task 3: replay 스토어 해결 상태

**Files:** Modify `apps/classbot/lib/store/replay.ts`; Create `apps/classbot/lib/store/__tests__/replay-resolved.test.ts`.

**Interfaces — Produces (스토어에 추가):**
- state `resolvedWeakPoints: Record<string, string[]>` (replayId → weakKey[])
- `resolveWeakPoint: (replayId: string, key: string) => void` (idempotent)
- selector `useResolvedWeakPoints(replayId: string): string[]`

- [ ] Step 1: 실패 테스트 — `resolveWeakPoint('r1','q:1100')` 두 번 → 1개. 다른 키 추가 누적. `useResolvedWeakPoints` 반영.
- [ ] Step 2: RED.
- [ ] Step 3: 구현 — persist 키 `pullim-replay-overrides` 그대로(state 추가), `resolvedWeakPoints` 기본 `{}`.
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): replay 스토어 약점 해결 상태`.

### Task 4: `ExamSheet` 컴포넌트 (재사용)

**Files:** Create `apps/classbot/components/classbot/exam-sheet.tsx`, `components/classbot/__tests__/exam-sheet.test.tsx`.

**Interfaces — Consumes:** `ExamQuestion` (Task 2).
**Produces:** `function ExamSheet({ question, onResult }: { question: ExamQuestion; onResult: (correct: boolean) => void }): JSX.Element`

동작: ①~⑤ 선택 → 제출 → 채점(해설 reveal) → `onResult(selected===answerIndex)`. passage 있으면 serif 박스, boxed 있으면 〈보기〉 박스. 토큰만, 학생 라우트 palette-safe(정답 blue, 오답 danger; amber/green 금지).

- [ ] Step 1: 실패 테스트(RTL) — render → 옵션 클릭 → 제출 → 정답 옵션이면 `onResult(true)`, 아니면 `onResult(false)`; 해설 텍스트 표시.
- [ ] Step 2: RED.
- [ ] Step 3: 구현 (pure component, useState selectedIndex/checked).
- [ ] Step 4: GREEN.
- [ ] Step 5: 커밋 `feat(classbot): ExamSheet 시험지 렌더러`.

---

## PR-A 마감
- [ ] 전체 `typecheck` / `lint`(0 error, design gates) / `test` green (worktree, node_modules 심링크).
- [ ] PR `feat/classbot-replay-depth → dev` (FE only). spec/plan 문서 포함.
- [ ] PR-B(회고 카드 + 플레이어 배선)는 별도 plan.

## Self-review 메모
- spec §5 데이터 모델 → Task 1·2·3 커버. spec §6 exam-sheet → Task 4. recap 카드·플레이어 배선은 PR-B(범위 외, 명시).
- 타입 일관: `WeakPoint.key` 형식(`q:`/`f:` + atSec) = 스토어 resolved 키 = recap(PR-B)에서 매칭. exam-sheet은 `ExamQuestion`만 소비(스토어 비의존).
