import { test, expect } from '@playwright/test';

/**
 * chat quickPrompts 봇별 분리 검증 (2026-05-13 / 2026-05-14 cb_004 확장).
 *
 * 봇 chip 전환 시 quick prompt 4개 텍스트가 봇 과목에 맞게 바뀌어야 함.
 * - cb_001 수학이 형 → "극값 어떻게 찾아요?"
 * - cb_002 영어 누나 → "빈칸 추론 어떻게 풀어요?"
 * - cb_003 과학 쌤   → "전기회로 어디부터?"
 * - cb_004 국어 누나 → "비문학 주제 어떻게 잡아요?"
 *
 * 추가로 quickPrompt 클릭 시 expectedReplyKey가 forcedKey로 들어가
 * 봇 톤+과목에 맞는 reply가 나오는지(자유 질문 키워드 매칭과 무관) 검증.
 */

test.describe('chat quickPrompts 봇별 변화', () => {
  test('cb_001 → cb_002 → cb_003 → cb_004 전환 시 과목별 prompt 노출', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    // cb_001 (수학이 형) — 기본 선택
    await expect(page.getByRole('button', { name: '극값 어떻게 찾아요?' })).toBeVisible();

    // cb_002 (영어 누나) 클릭 → 영어 prompt
    await page.getByRole('button', { name: /영어 누나/ }).click();
    await expect(page.getByRole('button', { name: '빈칸 추론 어떻게 풀어요?' })).toBeVisible();
    // 수학 prompt 사라짐
    await expect(page.getByRole('button', { name: '극값 어떻게 찾아요?' })).toHaveCount(0);

    // cb_003 (과학 쌤) 클릭 → 과학 prompt
    await page.getByRole('button', { name: /과학 쌤/ }).click();
    await expect(page.getByRole('button', { name: '전기회로 어디부터?' })).toBeVisible();
    await expect(page.getByRole('button', { name: '빈칸 추론 어떻게 풀어요?' })).toHaveCount(0);

    // cb_004 (국어 누나) 클릭 → 국어 prompt
    await page.getByRole('button', { name: /국어 누나/ }).click();
    await expect(page.getByRole('button', { name: '비문학 주제 어떻게 잡아요?' })).toBeVisible();
    await expect(page.getByRole('button', { name: '전기회로 어디부터?' })).toHaveCount(0);
  });

  test('quickPrompt 클릭 → 봇 톤+과목에 맞는 reply 노출', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    // cb_002 영어 누나 → "빈칸 추론" 클릭 → 정중 톤 영어 답변
    await page.getByRole('button', { name: /영어 누나/ }).click();
    await page.getByRole('button', { name: '빈칸 추론 어떻게 풀어요?' }).click();
    await expect(page.getByText(/빈칸 추론은 글의 흐름을 먼저 잡아야 해요/)).toBeVisible({ timeout: 3000 });

    // cb_003 과학 쌤 → "전기회로" 클릭 → 스파르타 톤 과학 답변
    await page.getByRole('button', { name: /과학 쌤/ }).click();
    await page.getByRole('button', { name: '전기회로 어디부터?' }).click();
    await expect(page.getByText(/옴의 법칙 V=IR부터 외워라/)).toBeVisible({ timeout: 3000 });

    // cb_004 국어 누나 → "비문학 주제" 클릭 → 차분 톤 국어 답변
    await page.getByRole('button', { name: /국어 누나/ }).click();
    await page.getByRole('button', { name: '비문학 주제 어떻게 잡아요?' }).click();
    await expect(page.getByText(/비문학 주제 추론은 단락 단위 요약으로 시작합니다/)).toBeVisible({ timeout: 3000 });
  });
});
