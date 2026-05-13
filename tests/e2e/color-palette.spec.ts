import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * 색 스펙트럼 축소 (2026-05-12) 라이브 검증.
 *
 * 검증 기준 (spec § 14.1 Layer 1):
 *  - 한 화면에 동시 노출되는 색 hue ≤ 4 (블루 그라데이션 + 슬레이트 + 레몬 + 위험 빨강)
 *  - success/warn 톤(녹/앰버) 사용 0 — mock-browser traffic light(deprecated 토큰) 외
 *  - lemon 사용은 1~2 곳까지 (spec § 1.6)
 *
 * 방식:
 *  - 8 페이지(학생 5 + 교사 3) 렌더 후 computed background-color 수집
 *  - 금지 hue(녹/앰버 RGB 범위) 검출 시 fail
 *  - 캡처는 output/live-shots/color-palette/ 에 PNG 저장 — 수동 디자인 review용
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

/** 금지 hue RGB 범위 — success(#12B26B = rgb(18,178,107)) / warn(#F59E0B = rgb(245,158,11)). */
function isForbiddenHue(r: number, g: number, b: number): null | 'success' | 'warn' {
  // success(녹): G가 강하고 R이 약함
  if (g > 140 && g > r + 40 && g > b + 30 && r < 80) return 'success';
  // warn(앰버): R+G 강하고 B 약함
  if (r > 200 && g > 130 && g < 200 && b < 80) return 'warn';
  return null;
}

function hex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

test.describe.serial('색 스펙트럼 축소 검증', () => {
  test.beforeAll(async () => {
    await fs.mkdir(OUT_DIR, { recursive: true });
  });

  for (const r of [...STUDENT_ROUTES.map(x => ({ ...x, role: 'student' })), ...TEACHER_ROUTES.map(x => ({ ...x, role: 'teacher' }))]) {
    test(`${r.role}/${r.name} — 금지 hue 없음 + 캡처`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));

      await page.goto(r.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      // 모든 element 의 computed bg/text color 수집
      const samples = await page.evaluate(() => {
        const seen = new Map<string, { count: number; tag: string; cls: string }>();
        const all = document.querySelectorAll<HTMLElement>('*');
        for (const el of all) {
          // mock-browser traffic light 의도적 예외 — data-mock-browser 부모 안은 skip
          if (el.closest('[data-mock-browser]')) continue;
          const cs = getComputedStyle(el);
          for (const prop of ['backgroundColor', 'color', 'borderColor']) {
            const v = cs[prop as 'backgroundColor'];
            if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
            const className = typeof el.className === 'string' ? el.className : (el.getAttribute('class') ?? '');
          const cur = seen.get(v) ?? { count: 0, tag: el.tagName, cls: className.slice(0, 80) };
            cur.count += 1;
            seen.set(v, cur);
          }
        }
        return Array.from(seen.entries()).map(([color, info]) => ({ color, ...info }));
      });

      const forbidden: string[] = [];
      for (const s of samples) {
        const m = s.color.match(/rgba?\(([\d, .]+)\)/);
        if (!m) continue;
        const [r1, g1, b1] = m[1].split(',').map(x => parseInt(x.trim(), 10));
        const verdict = isForbiddenHue(r1, g1, b1);
        if (verdict) {
          forbidden.push(`${verdict} ${hex(r1, g1, b1)} (${s.color}) × ${s.count} on <${s.tag.toLowerCase()}> "${s.cls}"`);
        }
      }

      await page.screenshot({
        path: path.join(OUT_DIR, `${r.role}-${r.name}.png`),
        fullPage: true,
      });

      // 페이지 자체 에러 없는지
      expect(errors, `Page errors on ${r.path}`).toEqual([]);

      // 금지 hue 없는지
      expect(forbidden, `금지 hue 검출 (${r.path}):\n${forbidden.join('\n')}`).toEqual([]);
    });
  }
});
