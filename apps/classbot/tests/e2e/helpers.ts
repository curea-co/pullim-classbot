import { type Page, expect } from '@playwright/test';

/**
 * 출시 기준 신규 사용자는 등록된 튜터가 없다(빈 상태).
 * 챗·과제 등 surface 를 검증하려면 먼저 봇 마켓에서 공식 튜터를 등록한다.
 * (self-learning 스토어 → localStorage 'pullim-self-learning' 에 지속)
 */
export async function enrollFirstTutor(page: Page): Promise<void> {
  await page.goto('/classbot/discover', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '등록', exact: true }).first().click();
  await expect(page.getByRole('button', { name: '등록됨' }).first()).toBeVisible();
}
