import { test, expect } from '@playwright/test';

/**
 * chat 인삿말 봇 데이터 단일 출처 검증 (2026-05-13 / 2026-05-14 cb_004 확장).
 *
 * - chat/page.tsx에서 `bot.id === ...` 하드코딩 분기 제거됨
 * - 봇 chip 4개(cb_001 친근 / cb_002 정중 / cb_003 스파르타 / cb_004 차분) 전환 시
 *   인삿말이 각 봇의 `greeting` 필드 톤으로 자연스럽게 바뀌어야 함
 * - key={bot.id}로 ChatPanel remount되면서 첫 메시지가 새 봇의 greeting으로 교체됨
 */

test.describe('chat 인삿말 봇별 변화', () => {
  test('cb_001 친근 → cb_002 정중 → cb_003 스파르타 → cb_004 차분 전환', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    // cb_001 (수학이 형, 친근 반말) — 기본 선택
    await expect(page.getByText(/수학이 형이야/)).toBeVisible();

    // cb_002 영어 누나 클릭 → 정중 존댓말 인삿말
    await page.getByRole('button', { name: /영어 누나/ }).click();
    await expect(page.getByText(/영어 누나예요/)).toBeVisible();
    await expect(page.getByText(/잡아줄 수 있어요/)).toBeVisible();

    // cb_003 과학 쌤 클릭 → 스파르타 단호반말
    await page.getByRole('button', { name: /과학 쌤/ }).click();
    await expect(page.getByText(/과학 쌤이다/)).toBeVisible();
    await expect(page.getByText(/답은 직접 풀어/)).toBeVisible();

    // cb_004 국어 누나 클릭 → 차분 분석적 존댓말
    await page.getByRole('button', { name: /국어 누나/ }).click();
    await expect(page.getByText(/국어 누나예요/)).toBeVisible();
    await expect(page.getByText(/단계별로 같이 풀어드릴게요/)).toBeVisible();

    // cb_001 수학이 형 다시 클릭 → 친근 반말 복귀
    await page.getByRole('button', { name: /수학이 형/ }).click();
    await expect(page.getByText(/수학이 형이야/)).toBeVisible();
    await expect(page.getByText(/길은 알려줄게/)).toBeVisible();
  });
});
