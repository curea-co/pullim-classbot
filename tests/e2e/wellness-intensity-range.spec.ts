import { test, expect } from '@playwright/test';

/**
 * wellness check-in 강도 범위(dual-thumb) 라이브 회귀 (2026-05-18).
 *
 * - 학생 wellness check-in 페이지에서 mood 선택 시 dual-thumb slider 노출
 * - thumb 2개(Base UI는 `<input type="range">` 2개로 렌더)
 * - 초기 범위 2~4 표시, low/high 두 점이 분리되어 있음
 * - aria-label "감정 강도 범위" 적용
 */
test.describe('wellness intensity range (dual-thumb)', () => {
  test('mood 선택 시 dual-thumb 노출 + 초기 범위 2~4 표시', async ({ page }) => {
    await page.goto('/classbot/wellness/check-in', { waitUntil: 'networkidle' });

    // 강도 범위 블록은 mood 선택 전엔 숨겨짐
    await expect(page.getByTestId('intensity-range-block')).toHaveCount(0);

    // 1번 mood(좋아) 선택
    await page.getByRole('radio', { name: /좋아/ }).click();

    // 강도 범위 블록 등장
    const block = page.getByTestId('intensity-range-block');
    await expect(block).toBeVisible();

    // 라벨 "강도 범위 (선택)" 노출
    await expect(block.getByText('강도 범위 (선택)')).toBeVisible();

    // 초기 readout 2~4/5
    await expect(page.getByTestId('intensity-range-readout')).toHaveText('2~4/5');

    // dual-thumb: Base UI Slider.Thumb는 input[type="range"]를 렌더 — 두 개여야 함
    const thumbs = block.locator('input[type="range"]');
    await expect(thumbs).toHaveCount(2);

    // 두 thumb의 value 확인: low=2, high=4
    await expect(thumbs.nth(0)).toHaveAttribute('value', '2');
    await expect(thumbs.nth(1)).toHaveAttribute('value', '4');

    // aria-label 적용
    await expect(block.getByRole('group', { name: '감정 강도 범위' })).toBeVisible();
  });
});
