import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * 색 스펙트럼 축소 라이브 검증.
 *
 * 검증 기준:
 *  - success/warn 톤(녹·앰버) 사용 **0** — [08 § 1.3] 두 토큰은 deprecated(2026-05-12)
 *  - lemon 은 **한 화면에 1~2 곳**까지 — [08 § 1.6] 키 CTA·스트릭 인증 한정
 *  - 화면에 쓰는 강조 hue 는 블루 + 레몬 + 위험 3종까지 — [08 § 14.1]
 *
 * ── 예전 판이 못 잡던 것 ────────────────────────────────────────────────
 * 이전 `isForbiddenHue` 는 **옛 토큰 값**(success `#12B26B` · warn `#F59E0B`) 기준의
 * RGB 범위를 썼는데, globals.css 는 그 뒤 `#0E8C56` · `#D97706` 으로 바뀌었다.
 *   success `#0E8C56` → G=140 인데 기준이 `G > 140` 이라 **1 차이로 빠져나갔다**
 *   warn    `#D97706` → G=119 인데 기준이 `G > 130` 이라 빠져나갔다
 * 그래서 텍스트·배경 어디에 써도 검사가 통과했다. 아래처럼 고쳤다:
 *   1) **토큰 RGB 정확 일치** — alpha 변형(`/30` 등)도 `rgba(r, g, b, a)` 로 원본 삼원색을 남기므로 같이 잡힌다
 *   2) 넓힌 hue 휴리스틱 — 토큰이 아닌 **하드코딩 녹·앰버 hex** 까지 backstop 으로 잡는다
 *   3) 레몬 **자리 수** 세기 — 색이 살아 있어도 남용되면 잡는다
 *
 * 방식:
 *  - 8 페이지(학생 5 + 교사 3) 렌더 후 computed background/text/border color 수집
 *  - 캡처는 output/live-shots/color-palette/ 에 PNG 저장 — 수동 디자인 review 용
 */

const STUDENT_ROUTES = [
  { name: 'home', path: '/classbot' },
  { name: 'chat', path: '/classbot/chat' },
  { name: 'assignment', path: '/classbot/assignment' },
  { name: 'replay', path: '/classbot/replay' },
  { name: 'wellness', path: '/classbot/wellness' },
];

const TEACHER_ROUTES = [
  { name: 'home', path: '/teacher' },
  { name: 'classbot', path: '/teacher/classbot' },
  { name: 'builder', path: '/teacher/builder' },
];

const OUT_DIR = path.resolve(
  process.cwd(),
  process.env.PROD_CAPTURE === '1'
    ? 'output/live-shots/color-palette-prod'
    : 'output/live-shots/color-palette',
);

/** [08 § 1.3] deprecated 토큰 — globals.css `--color-pullim-{success,warn}[-bg]` 와 1:1. */
const DEPRECATED_TOKEN_RGB: Record<string, [number, number, number]> = {
  'pullim-success':    [14, 140, 86],    // #0E8C56
  'pullim-success-bg': [230, 248, 239],  // #E6F8EF
  'pullim-warn':       [217, 119, 6],    // #D97706
  'pullim-warn-bg':    [255, 247, 230],  // #FFF7E6
};

/**
 * [08 § 1.6] 레몬 3종 — **자리 수**를 센다.
 * 세는 규칙:
 *   - 배경 채움과 **새로 지정한** 글자색만 센다. 물려받은 글자색은 세지 않는다
 *     (레몬 버튼 안의 <span> 까지 세면 한 버튼이 두 자리로 잡힌다).
 *   - 테두리(`border*Color`)는 세지 않는다 — [08 § 15.1.3] problem-card · [§ 15.3] LIVE 카드의
 *     **4px lime 좌측 라이너**는 명세가 메시지/카드 타입마다 요구하는 시각 단서라 개수 제한 대상이 아니다.
 *   - 한 요소가 `bg-pullim-lemon text-pullim-lemon-ink` 처럼 둘 다 쓰면 **한 자리**로 센다.
 */
const LEMON_RGB: Record<string, [number, number, number]> = {
  'pullim-lemon':      [230, 255, 76],   // #E6FF4C
  'pullim-lemon-soft': [244, 255, 184],  // #F4FFB8
  'pullim-lemon-ink':  [92, 107, 10],    // #5C6B0A
};

/** 한 화면에 허용하는 레몬 자리 수 ([08 § 1.6] "한 화면에 1~2 곳"). */
const LEMON_SPOT_LIMIT = 2;

function rgbOf(css: string): [number, number, number] | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(x => parseFloat(x.trim()));
  if (parts.length < 3 || parts.some(n => Number.isNaN(n))) return null;
  // 완전 투명은 색으로 치지 않는다
  if (parts.length >= 4 && parts[3] === 0) return null;
  return [parts[0], parts[1], parts[2]];
}

function sameRgb(a: [number, number, number], b: [number, number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * 토큰이 아닌 **하드코딩 녹·앰버** backstop.
 * 허용 팔레트(블루·슬레이트·레몬·위험)가 걸리지 않도록 폭을 잡았다:
 *   blue-500 #3B6FF6 · slate-500 #6B7489 · danger #C03B3F · lemon #E6FF4C · lemon-ink #5C6B0A
 */
function isForbiddenHue(r: number, g: number, b: number): null | 'success' | 'warn' {
  // 진한 녹 — G 가 R 보다 뚜렷이 크고 B 보다도 큼 (레몬은 G-R 이 25 이하라 안 걸린다)
  if (g - r > 40 && g - b > 20 && g > 90) return 'success';
  // 옅은 녹(민트 배경) — 거의 흰색인데 G 만 살짝 높음. 레몬 soft(G-B=71)는 제외
  if (r > 180 && g - r >= 10 && g - b >= 5 && g - b < 40) return 'success';
  // 진한 앰버 — R 이 압도적이고 G 는 중간대 (danger 는 G<80 이라 안 걸린다)
  if (r > 150 && r - b > 120 && r - g > 50 && g > 80 && g < 200) return 'warn';
  // 옅은 앰버(크림 배경) — R>G>B 이고 거의 흰색. blue-50/slate-50 은 B 가 제일 커서 안 걸린다
  if (r >= 250 && g > 230 && g < 252 && b < 240 && r - b >= 15 && r > g && g > b) return 'warn';
  return null;
}

function hex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

type Sample = { color: string; prop: string; tag: string; cls: string; inherited: boolean; elIdx: number };

/**
 * 봇 시그니처 5색은 hue 휴리스틱에서 뺀다.
 * 과학봇 mint(`#30CCB1`)·사회봇 amber(`#E1791B`)·영어봇 coral(`#FD7466`) 은 위 규칙에 걸리지만,
 * [07-branding § 4.6.2] 가 정한 **봇 정체성 체계**라 deprecated 토큰과 성격이 다르다.
 * 값을 하드코딩하지 않고 런타임에 `--color-bot-*` 를 실제로 읽어서 맞춘다 — 토큰이 바뀌면 같이 따라간다.
 * (넓은 면에 쓰지 말라는 규약은 `lib/tokens/bot-signature.ts` 주석이 맡는다. 여기서는 hue 수만 눈감아 준다.)
 */
const BOT_SIGNATURE_VARS = [
  '--color-bot-math', '--color-bot-english', '--color-bot-science',
  '--color-bot-korean', '--color-bot-social',
] as const;

async function readBotSignatureRgb(page: import('@playwright/test').Page): Promise<[number, number, number][]> {
  const raw = await page.evaluate((vars: readonly string[]) => {
    const probe = document.createElement('div');
    probe.style.position = 'fixed';
    probe.style.opacity = '0';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const out: string[] = [];
    for (const v of vars) {
      probe.style.backgroundColor = `var(${v})`;
      out.push(getComputedStyle(probe).backgroundColor);
    }
    probe.remove();
    return out;
  }, BOT_SIGNATURE_VARS as unknown as string[]);

  return raw.map(rgbOf).filter((x): x is [number, number, number] => x !== null);
}

test.describe.serial('색 스펙트럼 축소 검증', () => {
  test.beforeAll(async () => {
    await fs.mkdir(OUT_DIR, { recursive: true });
  });

  for (const r of [...STUDENT_ROUTES.map(x => ({ ...x, role: 'student' })), ...TEACHER_ROUTES.map(x => ({ ...x, role: 'teacher' }))]) {
    test(`${r.role}/${r.name} — 금지 hue 없음 + 레몬 ≤ ${LEMON_SPOT_LIMIT} 곳 + 캡처`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));

      await page.goto(r.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const botSigRgb = await readBotSignatureRgb(page);
      const isBotSignature = (rgb: [number, number, number]) => botSigRgb.some(b => sameRgb(rgb, b));

      /*
       * 모든 element 의 computed bg/text/border color 수집.
       *  - `color` 는 상속되므로 **부모와 같은 값이면 "물려받은 것"** 으로 표시해 자리 수 중복을 막는다.
       *  - 테두리는 shorthand(`borderColor`) 대신 **네 변을 따로** 읽는다. 네 변 색이 다르면
       *    shorthand 가 값 4개를 이어 붙여 돌려주고, 그러면 앞의 하나만 파싱돼 나머지가 검사에서 샌다
       *    (예: `borderLeftColor` 만 지정한 라이너).
       */
      const samples: Sample[] = await page.evaluate(() => {
        const out: { color: string; prop: string; tag: string; cls: string; inherited: boolean; elIdx: number }[] = [];
        const all = document.querySelectorAll<HTMLElement>('*');
        let elIdx = -1;
        for (const el of all) {
          elIdx += 1;
          const cs = getComputedStyle(el);
          const parent = el.parentElement;
          const ps = parent ? getComputedStyle(parent) : null;
          const className = typeof el.className === 'string' ? el.className : (el.getAttribute('class') ?? '');
          for (const prop of [
            'backgroundColor', 'color',
            'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
          ] as const) {
            const v = cs[prop];
            if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
            out.push({
              color: v,
              prop,
              tag: el.tagName,
              cls: className.slice(0, 80),
              elIdx,
              // color 만 상속된다. 부모와 같은 값이면 이 요소가 색을 "새로 쓴" 게 아니다.
              inherited: prop === 'color' && !!ps && ps.color === v,
            });
          }
        }
        return out;
      });

      /* ── 1) deprecated 토큰 정확 일치 ─────────────────────────────── */
      const deprecated: string[] = [];
      /* ── 2) 하드코딩 녹·앰버 backstop ─────────────────────────────── */
      const forbidden: string[] = [];
      /* ── 3) 레몬 자리 수 ──────────────────────────────────────────── */
      const lemonSpots: string[] = [];
      const lemonSeenEls = new Set<number>();

      for (const s of samples) {
        const rgb = rgbOf(s.color);
        if (!rgb) continue;

        for (const [name, token] of Object.entries(DEPRECATED_TOKEN_RGB)) {
          if (sameRgb(rgb, token)) {
            deprecated.push(`${name} ${s.color} · ${s.prop} on <${s.tag.toLowerCase()}> "${s.cls}"`);
          }
        }

        const verdict = isBotSignature(rgb) ? null : isForbiddenHue(rgb[0], rgb[1], rgb[2]);
        if (verdict) {
          forbidden.push(`${verdict} ${hex(rgb[0], rgb[1], rgb[2])} (${s.color}) · ${s.prop} on <${s.tag.toLowerCase()}> "${s.cls}"`);
        }

        // 물려받은 글자색·라이너(border*)는 자리로 세지 않는다 (위 LEMON_RGB 주석 참고)
        if (s.inherited || s.prop.startsWith('border')) continue;
        if (lemonSeenEls.has(s.elIdx)) continue;
        for (const [name, token] of Object.entries(LEMON_RGB)) {
          if (sameRgb(rgb, token)) {
            lemonSeenEls.add(s.elIdx);
            lemonSpots.push(`${name} · ${s.prop} on <${s.tag.toLowerCase()}> "${s.cls}"`);
            break;
          }
        }
      }

      await page.screenshot({
        path: path.join(OUT_DIR, `${r.role}-${r.name}.png`),
        fullPage: true,
      });

      // 페이지 자체 에러 없는지
      expect(errors, `Page errors on ${r.path}`).toEqual([]);

      // [08 § 1.3] deprecated 토큰이 화면에 나오면 안 된다
      expect(deprecated, `deprecated success/warn 토큰 검출 (${r.path}):\n${deprecated.join('\n')}`).toEqual([]);

      // 토큰이 아닌 하드코딩 녹·앰버도 안 된다
      expect(forbidden, `금지 hue 검출 (${r.path}):\n${forbidden.join('\n')}`).toEqual([]);

      // [08 § 1.6] 레몬은 키 CTA 한정 — 한 화면 1~2 곳
      expect(
        lemonSpots.length,
        `레몬 남용 (${r.path}) — ${lemonSpots.length} 곳, 한도 ${LEMON_SPOT_LIMIT}:\n${lemonSpots.join('\n')}`,
      ).toBeLessThanOrEqual(LEMON_SPOT_LIMIT);
    });
  }
});
