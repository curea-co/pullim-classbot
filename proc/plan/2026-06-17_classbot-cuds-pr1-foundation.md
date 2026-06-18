# CUDS PR-1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-found the classbot token layer on CUDS pullim×variant-B OKLCH values with a single source of truth, restore CUDS semantic colors, retire all hardcoded hex from `lib/tokens/*`, self-host Pretendard, and add the two CI grep gates — with zero broken Tailwind classes across the 29 existing pages.

**Architecture:** Keep the existing token *names* (`--color-pullim-blue-*`, `--color-pullim-slate-*`, `--color-bot-*`, etc.) so every `bg-pullim-blue-600` class across the app keeps resolving — only re-point their *values* to CUDS OKLCH. Make `lib/tokens/palette.ts` the single TS source consumed by `bot-signature.ts` / `tier.ts` / `assignment-state.ts` (no inline hex), and assert TS↔canonical parity with a checked-in test. CSS `@theme` mirrors the same canonical values.

**Tech Stack:** Next.js 16, Tailwind v4 (`@theme`, OKLCH), TypeScript, Jest (`*.test.ts`), `next/font/local`.

## Global Constraints

- Token color space: **OKLCH** for every ramp value (verbatim values in Task 2). No hex in `@theme` color ramps.
- Components reference **semantic tokens only**; no hardcoded 6-digit hex in `apps/classbot/components/**` (token files exempt).
- Korean typography forced defaults: `word-break: keep-all` + `overflow-wrap: break-word` on Korean text; **zero** `word-break: break-all`; body line-height ≥ 1.6; `font-feature-settings: "ss06" 1` + `tabular-nums` on numerics; Korean text never below 12px; 11px (`--text-2xs`) Latin/number micro-labels only.
- Radius (variant-B): `xs 6 · sm 8 · md 16 · lg 16 · xl 20 · 2xl 28 · full 9999`.
- Lemon (`--color-pullim-lemon`) is reserved for one semantic only: **attention / CTA / streak**. Crisis/urgent uses danger/warn.
- `<html lang="ko">` stays; the `x-build-sha` meta in `app/layout.tsx` must remain intact (prod-verify depends on it).
- Per-task verification runs from `apps/classbot/`: `bun --filter @pullim-classbot/classbot <script>` from repo root, or `bun run <script>` inside `apps/classbot/`.
- Work on branch `feat/cuds-pr1-foundation` (not `main`). Commit per task. Do not push unless asked.

---

### Task 1: Branch + CI grep gates (guards, wired into lint)

**Files:**
- Create: `apps/classbot/scripts/check-design-gates.mjs`
- Modify: `apps/classbot/package.json` (add `gates` script + chain into `lint`)

**Interfaces:**
- Produces: `bun run gates` exits non-zero if (a) any `word-break: break-all` appears under `app/`,`components/`,`lib/`, or (b) any 6-digit hex appears under `components/**` (excluding `**/__tests__/**`). Both currently pass (baseline 0), so this is a regression guard.

- [ ] **Step 1: Create the branch**

Run: `cd /Users/euiyunkim/dev/pullim/pullim-classbot && git checkout -b feat/cuds-pr1-foundation`
Expected: `Switched to a new branch 'feat/cuds-pr1-foundation'`

- [ ] **Step 2: Write the gate script**

Create `apps/classbot/scripts/check-design-gates.mjs`:

```js
#!/usr/bin/env node
// CUDS design CI gates. Run from apps/classbot.
import { execSync } from 'node:child_process';

function grep(pattern, paths) {
  try {
    const out = execSync(`grep -rEn "${pattern}" ${paths} --include='*.ts' --include='*.tsx' --include='*.css' || true`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean).filter(l => !l.includes('/__tests__/') && !l.includes('scripts/check-design-gates'));
  } catch { return []; }
}

const failures = [];

// Gate 1: no word-break: break-all anywhere in source.
const breakAll = grep('word-break:\\\\s*break-all', 'app components lib');
if (breakAll.length) failures.push(['word-break: break-all is banned (use overflow-wrap: anywhere on the parent)', breakAll]);

// Gate 2: no hardcoded 6-digit hex inside components/ (token files live in lib/tokens, exempt).
const hex = grep('#[0-9A-Fa-f]{6}', 'components');
if (hex.length) failures.push(['hardcoded hex in components/ — use var(--*) tokens', hex]);

if (failures.length) {
  for (const [msg, lines] of failures) {
    console.error(`\\n✗ ${msg}`);
    for (const l of lines.slice(0, 40)) console.error(`    ${l}`);
  }
  console.error(`\\n${failures.length} design gate(s) failed.`);
  process.exit(1);
}
console.log('✓ design gates passed');
```

- [ ] **Step 3: Add the script + chain into lint**

In `apps/classbot/package.json` `scripts`, change `"lint": "eslint"` to `"lint": "eslint && node scripts/check-design-gates.mjs"` and add `"gates": "node scripts/check-design-gates.mjs"`.

- [ ] **Step 4: Run the gates — expect PASS (baseline clean)**

Run: `cd apps/classbot && bun run gates`
Expected: `✓ design gates passed`

- [ ] **Step 5: Prove the gate bites (temporary)**

Run: `cd apps/classbot && echo '.x{ word-break: break-all; }' >> app/globals.css && bun run gates; git checkout app/globals.css`
Expected: gate FAILS with the break-all message, then file is restored.

- [ ] **Step 6: Commit**

```bash
git add apps/classbot/scripts/check-design-gates.mjs apps/classbot/package.json
git commit -m "ci(classbot): add CUDS design gates (break-all + hex-in-components)"
```

---

### Task 2: Canonical palette — `lib/tokens/palette.ts` (single TS source)

**Files:**
- Create: `apps/classbot/lib/tokens/palette.ts`
- Create: `apps/classbot/lib/tokens/__tests__/palette.test.ts`

**Interfaces:**
- Produces:
  - `primary: Record<50|100|200|300|400|500|600|700|800|900|950, string>` — OKLCH strings.
  - `gray: Record<0|25|50|100|200|300|400|500|600|700|800|900|950, string>` (0=`#fff` kept as `oklch(1 0 0)`, 25/50… CUDS-aligned).
  - `success/warning/danger/info: { 50, 500, 600, 900 }` OKLCH (CUDS `_base`).
  - `lemon: { base, soft, ink }`, `botSig: Record<'math'|'english'|'science'|'korean'|'social', { hex, inkLight }>`, `radius`, `space`, `text`, `motion`.
- Consumed by: Task 3 (globals.css mirrors these), Task 4–6 (bot-signature/tier/assignment-state import these).

- [ ] **Step 1: Write the failing parity test**

Create `apps/classbot/lib/tokens/__tests__/palette.test.ts`:

```ts
import { palette } from '../palette';

describe('palette canonical values (CUDS pullim × variant-B)', () => {
  it('primary ramp is the pullim hue-258 OKLCH ramp', () => {
    expect(palette.primary[600]).toBe('oklch(0.524 0.197 258)'); // seed #0362DA
    expect(palette.primary[50]).toBe('oklch(0.972 0.024 258)');
    expect(palette.primary[900]).toBe('oklch(0.364 0.118 258)');
  });
  it('restores CUDS semantic status colors (not blue-narrowed)', () => {
    expect(palette.success[500]).toBe('oklch(0.696 0.170 162)');
    expect(palette.warning[500]).toBe('oklch(0.795 0.184 86)');
    expect(palette.danger[500]).toBe('oklch(0.637 0.237 25)');
    expect(palette.info[500]).toBe('oklch(0.685 0.169 237)');
  });
  it('variant-B radius scale', () => {
    expect(palette.radius).toEqual({ xs: 6, sm: 8, md: 16, lg: 16, xl: 20, '2xl': 28, full: 9999 });
  });
  it('every palette color string is OKLCH or pure white/lemon brand hex', () => {
    const colorVals = [
      ...Object.values(palette.primary), ...Object.values(palette.gray),
      ...Object.values(palette.success), ...Object.values(palette.warning),
      ...Object.values(palette.danger), ...Object.values(palette.info),
    ];
    for (const v of colorVals) expect(v).toMatch(/^oklch\(/);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module missing)**

Run: `cd apps/classbot && bun run test -- palette`
Expected: FAIL — `Cannot find module '../palette'`.

- [ ] **Step 3: Write `palette.ts`**

Create `apps/classbot/lib/tokens/palette.ts` (values copied verbatim from CUDS audit; bot signature keeps brand hue identity but as named entries):

```ts
/**
 * 풀림 클래스봇 단일 토큰 소스 (CUDS pullim × variant-B).
 * 권위: curea-design-system packages/tokens/themes/{_base,variant-b, brands/pullim}.
 * globals.css @theme 는 이 값을 1:1 미러링한다 (palette.test.ts 가 canonical 잠금).
 * 인라인/차트 등 JS 소비자는 여기서 import — hex 직접 작성 금지.
 */
export const palette = {
  primary: {
    50: 'oklch(0.972 0.024 258)', 100: 'oklch(0.940 0.039 258)', 200: 'oklch(0.890 0.069 258)',
    300: 'oklch(0.820 0.108 258)', 400: 'oklch(0.730 0.154 258)', 500: 'oklch(0.640 0.189 258)',
    600: 'oklch(0.524 0.197 258)', 700: 'oklch(0.474 0.181 258)', 800: 'oklch(0.414 0.154 258)',
    900: 'oklch(0.364 0.118 258)', 950: 'oklch(0.264 0.083 258)',
  },
  gray: {
    0: 'oklch(1 0 0)', 25: 'oklch(0.991 0.001 286)', 50: 'oklch(0.985 0 0)', 100: 'oklch(0.967 0.001 286)',
    200: 'oklch(0.920 0.003 286)', 300: 'oklch(0.871 0.006 286)', 400: 'oklch(0.705 0.010 286)',
    500: 'oklch(0.552 0.013 286)', 600: 'oklch(0.442 0.015 286)', 700: 'oklch(0.370 0.014 286)',
    800: 'oklch(0.274 0.012 286)', 900: 'oklch(0.213 0.010 286)', 950: 'oklch(0.141 0.008 286)',
  },
  success: { 50: 'oklch(0.965 0.024 158)', 500: 'oklch(0.696 0.170 162)', 600: 'oklch(0.596 0.145 163)', 900: 'oklch(0.332 0.077 168)' },
  warning: { 50: 'oklch(0.987 0.026 102)', 500: 'oklch(0.795 0.184 86)', 600: 'oklch(0.681 0.162 76)', 900: 'oklch(0.421 0.095 58)' },
  danger:  { 50: 'oklch(0.971 0.013 17)',  500: 'oklch(0.637 0.237 25)', 600: 'oklch(0.577 0.245 27)', 900: 'oklch(0.396 0.141 25)' },
  info:    { 50: 'oklch(0.977 0.014 234)', 500: 'oklch(0.685 0.169 237)', 600: 'oklch(0.588 0.158 241)', 900: 'oklch(0.379 0.146 265)' },
  lemon: { base: 'oklch(0.967 0.197 116)', soft: 'oklch(0.985 0.090 116)', ink: 'oklch(0.520 0.110 116)' },
  botSig: {
    math:    { hex: 'oklch(0.967 0.197 116)', inkLight: 'oklch(0.520 0.110 116)' },
    english: { hex: 'oklch(0.720 0.170 28)',  inkLight: 'oklch(0.520 0.150 28)' },
    science: { hex: 'oklch(0.760 0.130 178)', inkLight: 'oklch(0.520 0.090 178)' },
    korean:  { hex: 'oklch(0.620 0.220 286)', inkLight: 'oklch(0.470 0.170 286)' },
    social:  { hex: 'oklch(0.680 0.160 55)',  inkLight: 'oklch(0.500 0.120 55)' },
  },
  radius: { xs: 6, sm: 8, md: 16, lg: 16, xl: 20, '2xl': 28, full: 9999 },
  space: { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 12, 6: 16, 7: 20, 8: 24, 9: 32, 10: 40, 11: 48, 12: 64 },
  text: { '2xs': 11, xs: 12, sm: 13, base: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48 },
  motion: { instant: 100, fast: 200, normal: 400, slow: 500, easeStandard: 'cubic-bezier(0.2,0,0,1)', easeEmphasized: 'cubic-bezier(0.3,0,0,1)' },
} as const;

export type Palette = typeof palette;
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `cd apps/classbot && bun run test -- palette`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/lib/tokens/palette.ts apps/classbot/lib/tokens/__tests__/palette.test.ts
git commit -m "feat(tokens): canonical CUDS pullim×variant-B palette source + parity test"
```

---

### Task 3: Rewrite `globals.css` @theme to CUDS values (names preserved)

**Files:**
- Modify: `apps/classbot/app/globals.css:9-122` (`@theme inline` color/radius), `:root`/`.dark` semantic vars, `@layer base`.

**Interfaces:**
- Consumes: canonical values from `palette.ts` (Task 2) — mirror them.
- Produces: same token *names* as today (`--color-pullim-blue-50..950`, `--color-pullim-slate-0..950`, `--color-pullim-success*`, `--color-pullim-warn*`, `--color-pullim-danger*`, `--color-pullim-lvl-1..5`, `--color-pullim-lemon*`, `--color-bot-*`, `--color-pullim-heat-*`, `--radius-*`) with CUDS OKLCH values, so all existing Tailwind classes keep resolving.

- [ ] **Step 1: Re-point the blue ramp to CUDS primary (OKLCH)**

In `@theme inline`, replace the `--color-pullim-blue-50..950` hex block (lines 49-59) with the OKLCH primary ramp from `palette.primary` (50→`oklch(0.972 0.024 258)` … 600→`oklch(0.524 0.197 258)` … 950→`oklch(0.264 0.083 258)`).

- [ ] **Step 2: Re-point the slate ramp to CUDS gray (OKLCH)**

Replace `--color-pullim-slate-0..950` (lines 62-74) with `palette.gray` values (`-0`→`oklch(1 0 0)`, `-25`→`oklch(0.991 0.001 286)`, `-50`→`oklch(0.985 0 0)`, … `-950`→`oklch(0.141 0.008 286)`).

- [ ] **Step 3: Restore semantic status colors (decision #6)**

Replace the `--color-pullim-success/-bg/-warn/-bg/-danger/-bg` block (lines 77-83) with CUDS-derived values and add `info`:
```css
  --color-pullim-success:    oklch(0.596 0.145 163);
  --color-pullim-success-bg: oklch(0.965 0.024 158);
  --color-pullim-warn:       oklch(0.681 0.162 76);
  --color-pullim-warn-bg:    oklch(0.987 0.026 102);
  --color-pullim-danger:     oklch(0.637 0.237 25);
  --color-pullim-danger-bg:  oklch(0.971 0.013 17);
  --color-pullim-info:       oklch(0.588 0.158 241);
  --color-pullim-info-bg:    oklch(0.977 0.014 234);
```

- [ ] **Step 4: Re-point lvl, lemon, bot, heat to OKLCH**

Map `--color-pullim-lvl-1..5` to `primary-{100,300,500,700,900}`; `--color-pullim-lemon/-soft/-ink` to `palette.lemon`; `--color-bot-{math,english,science,korean,social}` to `palette.botSig[*].hex`; `--color-pullim-heat-0..5` to `gray-100, primary-{100,300,500,700,900}`.

- [ ] **Step 5: Set variant-B radius scale**

Replace radius block (lines 113-121):
```css
  --radius-xs: 6px; --radius-sm: 8px; --radius-md: 16px; --radius-lg: 16px;
  --radius-xl: 20px; --radius-2xl: 28px; --radius-pill: 9999px;
  --radius-3xl: calc(var(--radius-2xl) * 1.3); --radius-4xl: calc(var(--radius-2xl) * 1.6);
```

- [ ] **Step 6: Re-point `:root`/`.dark` shadcn semantic vars + motion**

In `:root`: set `--primary: oklch(0.524 0.197 258)`, `--ring: oklch(0.524 0.197 258)`, `--accent: oklch(0.972 0.024 258)`, `--accent-foreground: oklch(0.474 0.181 258)`, `--destructive: oklch(0.637 0.237 25)`, `--muted: oklch(0.985 0 0)`, `--border:/--input: oklch(0.920 0.003 286)`, chart-1..5 to `primary-{600,400,700,300,200}`. In `.dark`: lower-chroma equivalents (primary→`oklch(0.730 0.131 258)`). Update `--duration-fast/base/slow` to `200ms/300ms/400ms` and `--easing-standard: cubic-bezier(0.2,0,0,1)`, `--easing-emphasis: cubic-bezier(0.3,0,0,1)`.

- [ ] **Step 7: Tighten Korean typography in `@layer base`**

In the `body` rule (lines 227-236) keep `word-break: keep-all` + `overflow-wrap: break-word` (change `anywhere`→`break-word`), set `letter-spacing: -0.011em`, `line-height: 1.75`, `font-feature-settings: 'ss06' 1, 'tnum' 1`. Keep the heading letter-spacing rule; extend to scale: `h1{letter-spacing:-0.04em} h2{-0.03em} h3{-0.025em}`.

- [ ] **Step 8: Verify build + gates + visual smoke**

Run: `cd apps/classbot && bun run typecheck && bun run build && bun run gates`
Expected: typecheck PASS, build PASS (all routes), gates PASS.
Then: `bun run dev` and open `http://localhost:3032/classbot` — confirm pages render with the new (truer-blue, rounder) palette and no unstyled/black elements.

- [ ] **Step 9: Commit**

```bash
git add apps/classbot/app/globals.css
git commit -m "feat(tokens): re-point @theme to CUDS pullim×variant-B OKLCH (names preserved)"
```

---

### Task 4: `bot-signature.ts` → palette refs (no inline hex)

**Files:**
- Modify: `apps/classbot/lib/tokens/bot-signature.ts`
- Create: `apps/classbot/lib/tokens/__tests__/bot-signature.test.ts`

**Interfaces:**
- Consumes: `palette.botSig` (Task 2).
- Produces: `botSignature(bot)` returns `{ cssVar, hex, inkLight, kind }` where `hex`/`inkLight` come from `palette.botSig[kind]` (no literal hex in this file). `FALLBACK.kind` stays `'math'` but `hex`/`inkLight` come from `palette.botSig.math` (drops the off-palette `#2854D8`/`#1E40AF`).

- [ ] **Step 1: Write the failing test**

Create `apps/classbot/lib/tokens/__tests__/bot-signature.test.ts`:

```ts
import { botSignature } from '../bot-signature';
import { palette } from '../palette';

describe('botSignature', () => {
  it('maps math subject to the palette math signature (no inline hex)', () => {
    const sig = botSignature({ subject: '미적분' });
    expect(sig.kind).toBe('math');
    expect(sig.hex).toBe(palette.botSig.math.hex);
    expect(sig.inkLight).toBe(palette.botSig.math.inkLight);
  });
  it('falls back to math palette entry (not an off-palette hex)', () => {
    const sig = botSignature(null);
    expect(sig.hex).toBe(palette.botSig.math.hex);
  });
  it('resolves by id', () => {
    expect(botSignature({ id: 'cb_002' }).kind).toBe('english');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/classbot && bun run test -- bot-signature`
Expected: FAIL (current `hex` values are literal hex, not `palette.botSig.*`).

- [ ] **Step 3: Refactor `bot-signature.ts` to use palette**

Replace the `BY_SUBJECT` literal-hex entries and `FALLBACK` so each `{ hex, inkLight }` reads from `palette.botSig[kind]`. Build entries via a helper, e.g.:
```ts
import { palette } from './palette';
const sig = (kind: BotSignature['kind']): Omit<BotSignature,'cssVar'> & { cssVar: BotSignature['cssVar'] } =>
  ({ cssVar: `--color-bot-${kind}`, hex: palette.botSig[kind].hex, inkLight: palette.botSig[kind].inkLight, kind });
// BY_SUBJECT: { '수학': sig('math'), '미적분': sig('math'), '영어': sig('english'), ... }
const FALLBACK = sig('math');
```
Update the file header comment (`src/app/globals.css` → `app/globals.css`).

- [ ] **Step 4: Run — expect PASS + gates**

Run: `cd apps/classbot && bun run test -- bot-signature && bun run gates`
Expected: PASS; gates still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/lib/tokens/bot-signature.ts apps/classbot/lib/tokens/__tests__/bot-signature.test.ts
git commit -m "refactor(tokens): bot-signature reads palette refs, drops inline hex"
```

---

### Task 5: `tier.ts` → palette refs

**Files:**
- Modify: `apps/classbot/lib/tokens/tier.ts`
- Create: `apps/classbot/lib/tokens/__tests__/tier.test.ts`

**Interfaces:**
- Consumes: `palette.primary` (Task 2).
- Produces: `aiTierMeta[T].color`/`.bg` come from `palette.primary[*]` (no inline hex).

- [ ] **Step 1: Write the failing test**

Create `apps/classbot/lib/tokens/__tests__/tier.test.ts`:

```ts
import { aiTierMeta } from '../tier';
import { palette } from '../palette';

it('tier colors come from the primary ramp (no inline hex)', () => {
  expect(aiTierMeta.T1.color).toBe(palette.primary[400]);
  expect(aiTierMeta.T2.color).toBe(palette.primary[600]);
  expect(aiTierMeta.T3.color).toBe(palette.primary[700]);
  for (const t of Object.values(aiTierMeta)) {
    expect(t.color).toMatch(/^oklch\(/);
    expect(t.bg).toMatch(/^oklch\(/);
  }
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/classbot && bun run test -- tier`
Expected: FAIL.

- [ ] **Step 3: Refactor `tier.ts`**

Replace the inline hex in `color`/`bg` with `palette.primary[400/600/700]` (color) and `palette.primary[50/100/50]` (bg): `T1 {color: primary[400], bg: primary[50]}`, `T2 {color: primary[600], bg: primary[100]}`, `T3 {color: primary[700], bg: primary[50]}`. Add `import { palette } from './palette';`.

- [ ] **Step 4: Run — expect PASS**

Run: `cd apps/classbot && bun run test -- tier`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/lib/tokens/tier.ts apps/classbot/lib/tokens/__tests__/tier.test.ts
git commit -m "refactor(tokens): tier meta reads primary ramp, drops inline hex"
```

---

### Task 6: `assignment-state.ts` → semantic token refs (kills 7 magic hex)

**Files:**
- Modify: `apps/classbot/lib/tokens/assignment-state.ts:57-127`
- Create: `apps/classbot/lib/tokens/__tests__/assignment-state.test.ts`

**Interfaces:**
- Consumes: `palette` (Task 2).
- Produces: `getAssignmentVisual(a).linerHex` returns a `palette`-derived OKLCH string for every state (exam→`gray[950]`, wrong-conquest→`lemon.base`, complete→`success[600]`, overdue→`danger[600]`, urgent→`warning[600]`, in-progress→`primary[50]`). No literal hex remains in the file. Public type `AssignmentVisual` unchanged.

- [ ] **Step 1: Write the failing test**

Create `apps/classbot/lib/tokens/__tests__/assignment-state.test.ts`:

```ts
import { getAssignmentVisual } from '../assignment-state';
import { palette } from '../palette';
import type { Assignment } from '@/lib/mock';

const base = (over: Partial<Assignment>): Assignment => ({
  id: 'a', mode: 'practice', state: 'in-progress', dDay: 'D-5',
  questionCount: 10, completedCount: 2,
} as Assignment & typeof over);

it('liner colors come from palette (no magic hex)', () => {
  expect(getAssignmentVisual(base({ mode: 'exam' })).linerHex).toBe(palette.gray[950]);
  expect(getAssignmentVisual(base({ mode: 'wrong-conquest' })).linerHex).toBe(palette.lemon.base);
  expect(getAssignmentVisual(base({ state: 'overdue' })).linerHex).toBe(palette.danger[600]);
  expect(getAssignmentVisual(base({ dDay: '오늘' })).linerHex).toBe(palette.warning[600]);
  expect(getAssignmentVisual(base({})).linerHex).toBe(palette.primary[50]);
  expect(getAssignmentVisual(base({})).linerHex).toMatch(/^oklch\(/);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/classbot && bun run test -- assignment-state`
Expected: FAIL (current `linerHex` are literal hex like `#0F1A3A`).

- [ ] **Step 3: Replace the 7 `linerHex` literals with palette refs**

Add `import { palette } from './palette';`. Replace each `linerHex:` value: line 57 `palette.gray[950]`, 67 `palette.lemon.base`, 80 `palette.success[600]`, 92 `palette.danger[600]`, 105 `palette.danger[600]`, 115 `palette.warning[600]`, 126 `palette.primary[50]`. (Tailwind `progressClass`/`dDayChipClass` strings are token classes already — leave them.)

- [ ] **Step 4: Run — expect PASS + full suite + gates**

Run: `cd apps/classbot && bun run test && bun run gates && bun run typecheck`
Expected: all tests PASS, gates PASS, typecheck PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/lib/tokens/assignment-state.ts apps/classbot/lib/tokens/__tests__/assignment-state.test.ts
git commit -m "refactor(tokens): assignment-state liners use semantic palette refs (no magic hex)"
```

---

### Task 7: Reconcile `lib/tokens/index.ts` to re-export palette (kill the second copy)

**Files:**
- Modify: `apps/classbot/lib/tokens/index.ts`
- Modify: `apps/classbot/lib/tokens/__tests__/palette.test.ts` (add re-export assertions)

**Interfaces:**
- Consumes: `palette` (Task 2).
- Produces: existing named exports (`pullimBlue`, `pullimSlate`, `pullimSemantic`, `pullimIrtLevel`, `pullimHeat`, `pullimRadius`, `pullimLemon`, `pullimChartColors`, `pullimSubjectColors`, `pullimShadow`) preserved as **derivations of `palette`** so downstream imports keep working but there is one source. `pullimSemantic.success/warn` un-deprecated (CUDS values restored).

- [ ] **Step 1: Add the failing re-export assertions**

Append to `apps/classbot/lib/tokens/__tests__/palette.test.ts`:

```ts
import { pullimBlue, pullimSemantic } from '../index';
it('index.ts derives from palette (single source)', () => {
  expect(pullimBlue[600]).toBe(palette.primary[600]);
  expect(pullimSemantic.success).toBe(palette.success[600]);
  expect(pullimSemantic.warn).toBe(palette.warning[600]);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/classbot && bun run test -- palette`
Expected: FAIL (index.ts still has independent hex).

- [ ] **Step 3: Rewrite `index.ts` to derive from palette**

Replace the literal-hex maps with derivations, e.g.:
```ts
import { palette } from './palette';
export const pullimBlue = palette.primary;
export const pullimSlate = palette.gray;
export const pullimSemantic = {
  success: palette.success[600], successBg: palette.success[50],
  warn: palette.warning[600], warnBg: palette.warning[50],
  danger: palette.danger[600], dangerBg: palette.danger[50],
} as const;
export const pullimIrtLevel = [palette.primary[100], palette.primary[300], palette.primary[500], palette.primary[700], palette.primary[900]] as const;
export const pullimHeat = [palette.gray[100], palette.primary[100], palette.primary[300], palette.primary[500], palette.primary[700], palette.primary[900]] as const;
export const pullimRadius = palette.radius;
export const pullimLemon = palette.lemon;
export const pullimChartColors = [palette.primary[600], palette.primary[400], palette.primary[700], palette.primary[300], palette.primary[500], palette.primary[200]] as const;
export const pullimSubjectColors = { korean: palette.primary[700], math: palette.primary[500], english: palette.primary[400], science: palette.primary[600], social: palette.primary[300], history: palette.primary[800] } as const;
export const pullimShadow = { /* keep existing rgba multi-layer strings — shadows stay as-is */ } as const;
export type PullimIrtLevel = 1|2|3|4|5; export type PullimHeatLevel = 0|1|2|3|4|5;
```
Keep `pullimShadow` string values unchanged (shadows are not part of the color gate).

- [ ] **Step 4: Run full suite + typecheck + build + gates**

Run: `cd apps/classbot && bun run test && bun run typecheck && bun run build && bun run gates`
Expected: all PASS. (`bun run build` confirms no downstream import broke from the derivation change.)

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/lib/tokens/index.ts apps/classbot/lib/tokens/__tests__/palette.test.ts
git commit -m "refactor(tokens): index.ts derives from palette — single source, semantics restored"
```

---

### Task 8: Self-host Pretendard via `next/font/local`; tokenize `themeColor`

**Files:**
- Create: `apps/classbot/app/fonts/PretendardVariable.woff2` (downloaded asset)
- Modify: `apps/classbot/app/layout.tsx`
- Modify: `apps/classbot/app/globals.css:1-2` (remove CDN `@import`)

**Interfaces:**
- Consumes: nothing.
- Produces: `--font-sans` driven by a self-hosted `next/font/local` variable (`--font-pretendard`); no render-blocking CDN `@import`; `viewport.themeColor` uses the brand primary.

- [ ] **Step 1: Download the Pretendard variable woff2**

Run:
```bash
mkdir -p apps/classbot/app/fonts
curl -fsSL -o apps/classbot/app/fonts/PretendardVariable.woff2 \
  https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2
ls -la apps/classbot/app/fonts/PretendardVariable.woff2
```
Expected: a ~1MB woff2 file exists.

- [ ] **Step 2: Wire `next/font/local` in `layout.tsx`**

Add near the Geist import:
```ts
import localFont from 'next/font/local';
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});
```
Add `pretendard.variable` to the `<html className=...>` list. Change `viewport.themeColor` from `'#0362DA'` to `'#0362da'` is NOT token-able in metadata; instead set it to the seed brand hex documented as the primary seed — keep `'#0362DA'` but add a comment `/* = --color-pullim-blue-600 seed */` (themeColor must be a static color; OKLCH is allowed in modern browsers — set `themeColor: 'oklch(0.524 0.197 258)'`).

- [ ] **Step 3: Point `--font-sans` at the self-hosted face; drop the CDN import**

In `globals.css`: delete line 2 (the `@import url('...pretendard...')`). Change `--font-sans` to lead with `var(--font-pretendard)`:
```css
  --font-sans: var(--font-pretendard), 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', system-ui, sans-serif;
```

- [ ] **Step 4: Build + verify no CDN font request**

Run: `cd apps/classbot && bun run build && bun run gates`
Expected: build PASS, gates PASS.
Then `bun run dev`, open `http://localhost:3032/classbot`, DevTools Network → filter `font` → confirm Pretendard is served from the app origin (`/_next/...`), not jsdelivr.

- [ ] **Step 5: Commit**

```bash
git add apps/classbot/app/fonts/PretendardVariable.woff2 apps/classbot/app/layout.tsx apps/classbot/app/globals.css
git commit -m "perf(font): self-host Pretendard via next/font/local; tokenize themeColor"
```

---

### Task 9: Foundation gate — full verification + prod-verify safety

**Files:** none (verification only).

- [ ] **Step 1: Full local CI**

Run: `cd /Users/euiyunkim/dev/pullim/pullim-classbot && bun --filter @pullim-classbot/classbot typecheck && bun --filter @pullim-classbot/classbot lint && bun --filter @pullim-classbot/classbot test && bun --filter @pullim-classbot/classbot build`
Expected: all four PASS (lint includes the design gates).

- [ ] **Step 2: prod-verify invariants intact**

Run: `cd apps/classbot && grep -n "x-build-sha" app/layout.tsx && grep -rn "PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032'" tests/e2e | head -1`
Expected: `x-build-sha` meta still present; e2e baseURL pattern unchanged.

- [ ] **Step 3: Visual smoke across roles**

`bun run dev`, then visually confirm no regressions on: `/classbot`, `/classbot/chat`, `/classbot/assignment`, `/classbot/wellness`, `/teacher`, `/teacher/grading`, `/login`. Look for: rounder corners (md=16px), truer pullim blue, restored green/amber/red status colors, Korean text wrapping by 어절 (no mid-word breaks), no black/unstyled elements.

- [ ] **Step 4: Final commit (if any smoke fixes) + summary**

If smoke surfaced a token gap, fix in the relevant Task-N file, re-run Step 1, commit `fix(tokens): <what>`. Otherwise PR-1 is complete on `feat/cuds-pr1-foundation`.

---

## Self-Review

**Spec coverage (§2 Foundation):**
- §2.2 CSS = single source → Tasks 2,3,7. §2.3 CUDS OKLCH values → Task 3 (+palette Task 2). §2.4 type scale → `palette.text` (Task 2) + base typography (Task 3 Step 7); component adoption is later PRs. §2.5 Korean typography → Task 3 Step 7. §2.6 CI gates → Task 1. §1.6 semantic color restore → Tasks 2,3,7. Pretendard self-host → Task 8. Hardcoded-hex purge (85) → Tasks 4,5,6,7. ✅
- Deferred to later PRs (correctly out of PR-1): per-component class adoption of the new type scale, shell rightRail, chat 3-col, dark per-page QA. Noted in spec §7.

**Placeholder scan:** every code step shows full code or exact edits; no TBD/TODO. ✅

**Type consistency:** `palette` shape defined in Task 2 is consumed with identical keys in Tasks 3–7 (`primary[600]`, `botSig.math.hex`, `success[600]`, `gray[950]`, `lemon.base`, `warning[600]`). `botSignature` return shape unchanged. `AssignmentVisual` public type unchanged. ✅

**Note for executor:** the OKLCH `botSig` values in Task 2 are approximations of the original signature hues converted to the pullim space — if a signature reads off-brand in Step-3 visual smoke (Task 9), adjust the `palette.botSig` entries (single source) and re-run, rather than reintroducing hex.
