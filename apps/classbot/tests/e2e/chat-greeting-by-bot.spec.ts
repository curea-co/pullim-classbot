import { test, expect } from '@playwright/test';
import { enrollFirstTutor } from './helpers';

/**
 * 신규 사용자 챗 진입 (출시 빈 상태 기준, 2026-06-24 재작성).
 *
 * 출시 기준 신규 사용자는 등록 튜터가 없다 → 챗은 빈 가드(봇 마켓 유도).
 * 봇 마켓에서 공식 튜터를 등록하면 챗이 열리고 봇 첫 인사 + 가이드 흐름칩이 노출된다.
 */
test.describe('신규 사용자 챗 진입', () => {
  test('등록 전 — 빈 가드(봇 마켓 유도)', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await expect(page.getByText('아직 등록한 튜터가 없어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '봇 마켓 둘러보기' })).toBeVisible();
  });

  test('등록 후 — 봇 대화 + 가이드 흐름칩', async ({ page }) => {
    await enrollFirstTutor(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });

    await expect(page.getByText('봇과 대화', { exact: true })).toBeVisible();
    // 봇 주도 수업 오프너 흐름칩
    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();
  });
});
