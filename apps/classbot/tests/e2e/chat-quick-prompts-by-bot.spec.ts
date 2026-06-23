import { test, expect } from '@playwright/test';

/**
 * 봇 주도 가이드 수업 — 빠른칩(흐름 내비) 검증 (2026-06-23 재구성).
 *
 * 빠른칩이 과목 입문 질문이 아니라 수업 흐름(개념 → 예제 → 퀴즈 → 다음 개념)으로 바뀌었고,
 * 각 칩은 서로 다른 리치 답변(개념 카드 / 예제 단계 / 인라인 퀴즈)을 생성한다.
 *
 * 시간대 의존(야간 웰빙 칩 prepend) 회피를 위해 항상 노출되는 앞 3칩만 초기 단언.
 */

test.describe('가이드 수업 흐름칩', () => {
  test('cb_001 — 흐름칩 노출 + 칩별 서로 다른 답변', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    // 기본 흐름칩 (개념/예제/퀴즈 — 야간 웰빙 prepend 와 무관하게 항상 노출)
    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '예제 풀어줘' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();

    // 개념 더보기 → 개념 카드 (자세히 보기 모달 진입점은 챗 버블 전용 텍스트)
    await page.getByRole('button', { name: '개념 더보기' }).click();
    await expect(chat.getByText('자세히 보기 (학습 팁·예제 문항) →')).toBeVisible({ timeout: 3000 });

    // 예제 풀어줘 → 예제 단계 카드 (제목은 챗 버블 전용)
    await page.getByRole('button', { name: '예제 풀어줘' }).click();
    await expect(chat.getByText(/극값 구하기/)).toBeVisible({ timeout: 3000 });

    // 퀴즈 내줘 → 인라인 퀴즈 (문항 + 제출하기 버튼)
    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(chat.getByText(/극댓값은\?/)).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: '제출하기' })).toBeVisible();

    // 퀴즈 후속칩 — 다음 개념 → 다른 개념 카드로 진행
    await page.getByRole('button', { name: '다음 개념 →' }).click();
    await expect(chat.getByText('다음 개념 가보자').first()).toBeVisible({ timeout: 3000 });
  });

  test('인라인 퀴즈 제출 → 정답/해설 노출', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(page.getByRole('button', { name: '제출하기' })).toBeVisible({ timeout: 3000 });

    // 보기 선택 후 제출 → 결과/해설 노출
    await chat.getByRole('radio').first().click();
    await page.getByRole('button', { name: '제출하기' }).click();
    await expect(chat.getByText(/정답이에요|다시 볼까요/)).toBeVisible({ timeout: 2000 });
  });

  test('인라인 퀴즈 — 힌트 사다리(scope 제한) + 오답 처방', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' }); // cb_001 = scope L3
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(page.getByRole('button', { name: '제출하기' })).toBeVisible({ timeout: 3000 });

    // 힌트 사다리 — L3 봇은 1개까지만
    await chat.getByRole('button', { name: /힌트 보기/ }).click();
    await expect(chat.getByText(/힌트 1 ·/)).toBeVisible();
    await expect(chat.getByText(/힌트 1개까지/)).toBeVisible(); // scope(L3) 제한 안내

    // 오답(② −2) 제출 → 처방(함정 설명 + 처방 버튼)
    await chat.getByRole('radio').nth(1).click();
    await page.getByRole('button', { name: '제출하기' }).click();
    await expect(chat.getByText(/극솟값/)).toBeVisible({ timeout: 2000 }); // distractor 피드백
    await expect(chat.getByRole('button', { name: /개념 다시 보기/ })).toBeVisible();
    await expect(chat.getByRole('button', { name: /다시 풀기/ })).toBeVisible();

    // 처방: 개념 다시 보기 → 챗에 개념 상세 주입(이동 없음)
    await chat.getByRole('button', { name: /개념 다시 보기/ }).click();
    await expect(chat.getByText('💡 학습 팁')).toBeVisible({ timeout: 2000 });
  });

  test('봇별로 흐름 답변이 과목에 맞게 다르다', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });
    const chat = page.locator('[data-slot="chat-scroll"]');

    // cb_002 영어 누나 — 예제는 빈칸 관련
    await page.getByRole('button', { name: /영어 누나/ }).click();
    await page.getByRole('button', { name: '예제 풀어줘' }).click();
    await expect(chat.getByText(/빈칸 잡기/)).toBeVisible({ timeout: 3000 });

    // cb_003 과학 쌤 — 퀴즈는 합성저항
    await page.getByRole('button', { name: /과학 쌤/ }).click();
    await page.getByRole('button', { name: '퀴즈 내줘' }).click();
    await expect(chat.getByText(/합성저항/)).toBeVisible({ timeout: 3000 });
  });
});
