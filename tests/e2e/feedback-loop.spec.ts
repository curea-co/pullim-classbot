/**
 * 피드백 루프 — 학생 제출 → 교사 진행률 실시간 반영.
 *
 * 검증 핵심:
 *  1. 새 과제 발사 → 학생 풀이 → 제출 → 교사 화면 진행률 1+ 증가
 *  2. 결과 페이지에 store 기반 점수(% 표기) 표시
 *  3. 새로고침 후에도 submission 유지 (localStorage persist)
 *  4. 라이브 인디케이터 — 최근 30초 내 "방금 제출" 뱃지
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3032';

test.describe('피드백 루프 — 제출 ↔ 교사 진행률', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage 초기화
    await page.goto(BASE + '/teacher');
    await page.evaluate(() => {
      window.localStorage.removeItem('pullim-assignments');
    });
  });

  test('학생 제출 → 교사 화면 진행률 +1 + 라이브 뱃지', async ({ page }) => {
    // [1] 교사: 과제 발사
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('피드백 루프 검증 과제');
    await page.getByTestId('dispatch-btn').click();
    await expect(page).toHaveURL(BASE + '/teacher/classbot');

    // 발사 직후 진행률은 0/N
    // 학생 진입은 동일 컨텍스트의 다른 탭으로
    const initialRowProgress = await page
      .locator('[data-testid^="progress-as_user_"]')
      .first()
      .textContent();
    expect(initialRowProgress).toMatch(/^0\/\d+$/);

    // [2] 학생: 풀이 → 제출
    await page.goto(BASE + '/classbot/assignment');
    const overviewLink = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await overviewLink.click();
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/solve/);

    // 모든 문항을 통과해서 제출
    for (let i = 0; i < 15; i++) {
      const submitBtn = page.getByRole('button', { name: /제출/ });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /다음/ });
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      } else {
        break;
      }
    }

    await page.waitForURL(/\/classbot\/assignment\/as_user_\d+\/result/, { timeout: 10000 });
    // 결과 페이지에 점수 표시 (mock)
    await expect(page.getByTestId('result-score')).toBeVisible();

    // [3] 교사 화면 다시 방문 → 진행률 1+ 증가 + "방금 제출" 뱃지
    await page.goto(BASE + '/teacher/classbot');
    const updatedRowProgress = await page
      .locator('[data-testid^="progress-as_user_"]')
      .first()
      .textContent();
    expect(updatedRowProgress).toMatch(/^1\/\d+$/);
    await expect(page.getByText('방금 제출').first()).toBeVisible();
  });

  test('새로고침 영속성 — submission 도 localStorage 에 persist', async ({ page }) => {
    // 발사 + 제출
    await page.goto(BASE + '/teacher/assignment/new');
    await page.getByTestId('title-input').fill('영속성 검증 과제');
    await page.getByTestId('dispatch-btn').click();

    await page.goto(BASE + '/classbot/assignment');
    const link = page.locator('a[href^="/classbot/assignment/as_user_"]:not([href*="/solve"]):not([href*="/result"])').first();
    await link.click();
    await page.getByTestId('assignment-start-cta').click();
    await page.waitForURL(/\/solve/);
    for (let i = 0; i < 15; i++) {
      const submitBtn = page.getByRole('button', { name: /제출/ });
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /다음/ });
      if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
      else break;
    }
    await page.waitForURL(/\/result/);

    // 새로고침 후 store 의 submissions 가 있어야 함
    await page.reload();
    const stored = await page.evaluate(() => window.localStorage.getItem('pullim-assignments'));
    expect(stored).toBeTruthy();
    expect(stored).toContain('submissions');
    expect(stored).toMatch(/scorePercent/);
  });

  test('시드 과제 풀이 시에도 store 진행률 누적', async ({ page }) => {
    // 시드 과제 (as_today) 풀이 흐름
    await page.goto(BASE + '/classbot/assignment/as_today');
    const startCta = page.getByTestId('assignment-start-cta');
    if (await startCta.isVisible().catch(() => false)) {
      await startCta.click();
      await page.waitForURL(/\/solve/);
      for (let i = 0; i < 15; i++) {
        const submitBtn = page.getByRole('button', { name: /제출/ });
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          break;
        }
        const nextBtn = page.getByRole('button', { name: /다음/ });
        if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
        else break;
      }
      await page.waitForURL(/\/result/, { timeout: 10000 });

      // store 에 as_today submission 기록되었는지
      const stored = await page.evaluate(() => window.localStorage.getItem('pullim-assignments'));
      expect(stored).toContain('as_today');
    }
  });
});
