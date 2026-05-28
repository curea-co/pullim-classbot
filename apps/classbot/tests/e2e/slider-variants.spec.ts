import { test, expect } from '@playwright/test';

/**
 * Slider primitive variant 검증 (2026-05-14).
 *
 * 검증 대상:
 *  1. thumb danger variant — 시험 모드 진입 후 시험 시간 슬라이더의 thumb computed
 *     background-color 가 풀림 danger 토큰(#E5484D = rgb(229, 72, 77)) 인지.
 *  2. (회귀) 비-시험 슬라이더의 thumb는 풀림 블루 유지 — 문항 수 슬라이더 blue-600(#1E68FF).
 *
 * dual-thumb 라이브 사용처는 이번 PR 범위 밖 — primitive 확장만 들어왔고,
 * 실 라이브 적용은 후속 plan으로 분리.
 */

const DANGER_RGB = 'rgb(229, 72, 77)';     // #E5484D
const BLUE_600_RGB = 'rgb(40, 84, 216)';   // #2854D8

test.describe('Slider primitive variant', () => {
  test('시험 모드 시간 슬라이더 thumb 색은 danger', async ({ page }) => {
    await page.goto('/teacher/assignment/new', { waitUntil: 'networkidle' });

    // 시험 모드 토글
    await page.getByTestId('mode-exam').click();

    // 시험 시간 슬라이더가 나타날 때까지 대기
    const timeSlider = page.locator('#af-time');
    await expect(timeSlider).toBeVisible();

    // Base UI Thumb는 <div>에 클래스가 붙고 안에 <input role="slider">가 있다.
    // computed background-color는 className이 적용된 div(input의 부모)에서 측정.
    const thumbDiv = timeSlider.locator('input[type="range"]').locator('..');
    await expect(thumbDiv).toBeVisible();

    const bg = await thumbDiv.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).toBe(DANGER_RGB);
  });

  test('문항 수 슬라이더 thumb 색은 풀림 블루 (회귀)', async ({ page }) => {
    await page.goto('/teacher/assignment/new', { waitUntil: 'networkidle' });

    const qSlider = page.locator('#af-qcount');
    await expect(qSlider).toBeVisible();

    const thumbDiv = qSlider.locator('input[type="range"]').locator('..');
    const bg = await thumbDiv.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg).toBe(BLUE_600_RGB);
  });
});
