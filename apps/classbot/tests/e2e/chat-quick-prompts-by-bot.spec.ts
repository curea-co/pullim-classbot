import { test, expect } from '@playwright/test';
import { joinDemoClass } from './helpers';

/**
 * 봇 주도 가이드 수업 — 흐름칩 + 힌트 사다리 + 오답 처방 (출시 빈 상태 기준 재작성).
 *
 * 신규 사용자는 참여 코드로 교사 클래스에 들어간 뒤 챗에서 가이드 수업을 진행한다.
 * 흐름칩(개념→예제→퀴즈)이 서로 다른 리치 답변을 만들고, 인라인 퀴즈는
 * 단계적 힌트 + 오답 처방을 제공한다.
 */
test.describe('가이드 수업 흐름칩 (참여 후)', () => {
  test('흐름칩 노출 + 칩별 답변(개념/예제/퀴즈)', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '예제 풀어줘' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();

    // 개념 더보기 → 개념 카드(「자세히 보기 →」는 챗 버블 전용 문구)
    await page.getByRole('button', { name: '개념 더보기' }).click();
    await expect(chat.getByRole('button', { name: '자세히 보기 — 학습 팁·예제 문항' })).toBeVisible({ timeout: 3000 });

    // 예제 풀어줘 → 예제 fading 카드(B3: 점감 스캐폴딩 리드 문구)
    await page.getByRole('button', { name: '예제 풀어줘' }).click();
    await expect(chat.getByText(/직접 채워봐/)).toBeVisible({ timeout: 3000 });

    // 퀴즈 내줘 → 인라인 퀴즈
    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(page.getByRole('button', { name: '제출', exact: true })).toBeVisible({ timeout: 3000 });
  });

  test('인라인 퀴즈 — 힌트 사다리 + 오답 처방', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(page.getByRole('button', { name: '제출', exact: true })).toBeVisible({ timeout: 3000 });

    // 단계적 힌트 — 최소 1개 공개
    await chat.getByRole('button', { name: '힌트 보기', exact: true }).click();
    await expect(chat.getByText(/힌트 1 ·/)).toBeVisible();

    // 참여 클래스 봇 cb_001(수학봇 → 일차함수의 그래프 리치 수업) — 정답은 ①('2'), ②('−3')는 오답.
    // 오답(②) 제출 → distractor 처방(y절편) + 처방 버튼(다시 풀기·개념)
    await chat.getByRole('radio').nth(1).click();
    await page.getByRole('button', { name: '제출', exact: true }).click();
    await expect(chat.getByText(/y절편/)).toBeVisible({ timeout: 2000 });
    await expect(chat.getByRole('button', { name: /다시 풀기/ })).toBeVisible();
    await expect(chat.getByRole('button', { name: /개념 다시 보기/ })).toBeVisible();
  });
});
