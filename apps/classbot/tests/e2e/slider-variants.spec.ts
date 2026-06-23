import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Slider primitive variant 검증 (2026-05-14, CUDS 토큰-상대 비교로 2026-06 갱신).
 *
 * 검증 대상:
 *  1. thumb danger variant — 시험 모드 시간 슬라이더의 thumb 가 풀림 danger 토큰 색인지.
 *  2. (회귀) 문항 수 슬라이더의 thumb 는 풀림 blue-600 토큰 색인지.
 *
 * NOTE: CUDS 토큰이 OKLCH로 이전되며 (a) getComputedStyle 가 `lab()`/`oklab()`을 반환하고
 * (b) 실제 색값도 바뀌었다(예전 #E5484D/#2854D8 하드코딩은 stale). 그래서 색을 하드코딩하지
 * 않고, 같은 토큰 클래스를 가진 probe 요소의 색을 페이지에서 읽어 thumb 와 비교한다 —
 * 포맷·값 변동에 무관하게 "thumb 가 해당 토큰을 쓰는가"를 검증.
 */

const TOL = 3; // canvas sRGB 반올림 허용 오차

/** thumb div의 background-color를 canvas로 sRGB 채널 정규화 (lab/oklch/rgb/hex 모두 처리). */
async function thumbRgb(thumbDiv: Locator): Promise<[number, number, number]> {
  return thumbDiv.evaluate((el) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = window.getComputedStyle(el).backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b] as [number, number, number];
  });
}

/** 토큰 클래스(bg-*)를 가진 probe div를 띄워 그 배경색을 sRGB로 정규화. */
async function tokenRgb(page: Page, bgClass: string): Promise<[number, number, number]> {
  return page.evaluate((cls) => {
    const el = document.createElement('div');
    el.className = cls;
    document.body.appendChild(el);
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = window.getComputedStyle(el).backgroundColor;
    el.remove();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b] as [number, number, number];
  }, bgClass);
}

function expectClose(actual: [number, number, number], expected: [number, number, number]) {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(actual[i] - expected[i]), `채널 ${i}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(TOL);
  }
}

test.describe('Slider primitive variant', () => {
  test('시험 모드 시간 슬라이더 thumb 색은 danger', async ({ page }) => {
    await page.goto('/teacher/assignment/new', { waitUntil: 'networkidle' });

    await page.getByTestId('mode-exam').click();

    const timeSlider = page.locator('#af-time');
    await expect(timeSlider).toBeVisible();

    // Base UI Thumb는 <div>에 클래스가 붙고 안에 <input role="slider">가 있다.
    const thumbDiv = timeSlider.locator('input[type="range"]').locator('..');
    await expect(thumbDiv).toBeVisible();

    expectClose(await thumbRgb(thumbDiv), await tokenRgb(page, 'bg-pullim-danger'));
  });

  test('문항 수 슬라이더 thumb 색은 풀림 블루 (회귀)', async ({ page }) => {
    await page.goto('/teacher/assignment/new', { waitUntil: 'networkidle' });

    const qSlider = page.locator('#af-qcount');
    await expect(qSlider).toBeVisible();

    const thumbDiv = qSlider.locator('input[type="range"]').locator('..');
    expectClose(await thumbRgb(thumbDiv), await tokenRgb(page, 'bg-pullim-blue-600'));
  });
});
