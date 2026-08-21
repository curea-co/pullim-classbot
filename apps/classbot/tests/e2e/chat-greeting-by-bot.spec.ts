import { test, expect } from '@playwright/test';
import { joinDemoClass } from './helpers';

/**
 * 신규 사용자 챗 진입 (교사 수업 모드 기준, 2026-08-20 재작성).
 *
 * 학생 모드는 `class`(교사 수업) 고정이다 — 자기주도 모드 보류(`lib/store/student-mode.ts`).
 * 신규 사용자는 참여한 클래스가 없다 → 챗은 빈 가드(참여 코드 유도).
 * 참여 코드로 클래스에 들어가면 챗이 열리고 봇 첫 인사 + 가이드 흐름칩이 노출된다.
 */
test.describe('신규 사용자 챗 진입', () => {
  test('참여 전 — 빈 가드(참여 코드 유도)', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await expect(page.getByText('아직 참여한 클래스가 없어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '참여 코드 입력하기' })).toBeVisible();
  });

  test('참여 후 — 봇 대화 + 가이드 흐름칩', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });

    await expect(page.getByText('봇과 대화', { exact: true })).toBeVisible();
    // 봇 주도 수업 오프너 흐름칩
    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();
  });
});
