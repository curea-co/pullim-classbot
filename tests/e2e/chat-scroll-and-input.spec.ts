import { test, expect } from '@playwright/test';

/**
 * chat scroll(sticky-to-bottom) + input(multiline textarea + 전송 가드) 회귀.
 *
 * 2026-05-15 plan/chat-scroll-and-input-polish 결과:
 * - 사용자가 위로 스크롤한 상태에서 새 메시지 도착 시 강제 auto-scroll 하지 않고 "새 메시지" 배너 노출
 * - 배너 클릭 → 최하단으로 이동 + 배너 dismiss
 * - <input> → <textarea>: Enter=전송, Shift+Enter=줄바꿈, IME composition 중엔 전송 차단
 * - 빈 입력·whitespace-only 입력은 전송 버튼 disabled
 *
 * BASE는 PLAYWRIGHT_BASE_URL env로 prod 회귀까지 동일하게 동작.
 */

test.describe('chat scroll sticky-to-bottom', () => {
  test('위로 스크롤 → 새 메시지 도착 시 배너 노출 + scrollTop 보존', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    const textarea = page.getByPlaceholder(/에게 물어보세요/);
    const scrollEl = page.locator('[data-slot="chat-scroll"]');

    // 1) 스크롤 컨테이너가 overflow 되도록 메시지 6건 보내기 (user 6 + bot 6 = 12 turns + greeting)
    for (let i = 0; i < 6; i++) {
      await textarea.fill(`긴 테스트 메시지 ${i} — 스크롤 영역을 채우기 위한 더미 텍스트 입니다.`);
      await textarea.press('Enter');
      // 봇 reply 도착 대기 (chat page setTimeout 900ms)
      await page.waitForTimeout(1100);
    }

    // 2) 현재 최하단 sticky 상태 확인 — scrollHeight ≈ scrollTop + clientHeight
    const isAtBottom = await scrollEl.evaluate(el => {
      return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    });
    expect(isAtBottom).toBe(true);

    // 3) 스크롤 최상단으로 이동 (sticky 해제)
    await scrollEl.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    // onScroll 핸들러가 stickyRef 갱신할 시간
    await page.waitForTimeout(100);

    const scrollTopBefore = await scrollEl.evaluate(el => el.scrollTop);
    expect(scrollTopBefore).toBeLessThan(80);

    // 4) 위로 올린 상태에서 메시지 전송 → 배너 노출
    await textarea.fill('스크롤 위에서 보내는 메시지');
    await textarea.press('Enter');

    // user 메시지가 turns에 추가되며 useEffect 트리거 — sticky off라 배너 표시
    await expect(page.locator('[data-slot="new-message-banner"]')).toBeVisible({ timeout: 2000 });

    // 5) scrollTop이 강제로 최하단으로 끌려 내려가지 않았는지 — 임계값 80px보다 한참 위에 있어야
    const scrollTopAfter = await scrollEl.evaluate(el => el.scrollTop);
    const distanceFromBottomAfter = await scrollEl.evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight);
    expect(distanceFromBottomAfter).toBeGreaterThan(80);
    expect(Math.abs(scrollTopAfter - scrollTopBefore)).toBeLessThan(200); // 자연 height 증가만큼만 허용
  });

  test('배너 클릭 → 최하단 복귀 + 배너 사라짐', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    const textarea = page.getByPlaceholder(/에게 물어보세요/);
    const scrollEl = page.locator('[data-slot="chat-scroll"]');

    // 메시지 6건 → 스크롤 overflow
    for (let i = 0; i < 6; i++) {
      await textarea.fill(`복귀 테스트 메시지 ${i} — 스크롤 영역 채우기.`);
      await textarea.press('Enter');
      await page.waitForTimeout(1100);
    }

    // 위로 스크롤
    await scrollEl.evaluate(el => el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    await page.waitForTimeout(100);

    // 메시지 보내 배너 띄우기
    await textarea.fill('배너 트리거');
    await textarea.press('Enter');

    const banner = page.locator('[data-slot="new-message-banner"]');
    await expect(banner).toBeVisible({ timeout: 2000 });

    // 배너 클릭 → 최하단으로 이동
    await banner.click();

    // smooth scroll 완료 대기
    await page.waitForTimeout(600);

    const distanceFromBottom = await scrollEl.evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight);
    expect(distanceFromBottom).toBeLessThan(80);

    // 배너 사라짐
    await expect(banner).toBeHidden();
  });
});

test.describe('chat textarea multiline input', () => {
  test('Enter 단독 → 전송 / Shift+Enter → 줄바꿈', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    const textarea = page.getByPlaceholder(/에게 물어보세요/);

    // Enter 단독 → 전송
    await textarea.fill('a');
    await textarea.press('Enter');

    // student turn으로 'a' 추가됐는지 — Bubble 내 textContent 'a'
    await expect(page.locator('.whitespace-pre-wrap', { hasText: /^a$/ })).toBeVisible({ timeout: 1500 });
    // 전송 후 textarea 비워짐
    await expect(textarea).toHaveValue('');

    await page.waitForTimeout(1100); // bot reply 대기 (pending 해제)

    // Shift+Enter → 줄바꿈 (전송 안 됨)
    await textarea.fill('b');
    await textarea.press('Shift+Enter');
    await textarea.pressSequentially('c');

    await expect(textarea).toHaveValue('b\nc');

    // 'b\nc' 메시지가 turns에 추가되지 않았어야 함 — 새 student bubble 없음
    const bubblesWithBC = await page.locator('.whitespace-pre-wrap', { hasText: /^b\nc$/ }).count();
    expect(bubblesWithBC).toBe(0);
  });

  test('빈 입력 / whitespace-only → 전송 버튼 disabled', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });

    const sendBtn = page.getByRole('button', { name: '질문 보내기', exact: true });
    const textarea = page.getByPlaceholder(/에게 물어보세요/);

    // 초기 빈 상태 → disabled
    await expect(sendBtn).toBeDisabled();

    // whitespace-only → 여전히 disabled
    await textarea.fill('   ');
    await expect(sendBtn).toBeDisabled();

    // 실제 텍스트 입력 → enabled
    await textarea.fill('실제 질문');
    await expect(sendBtn).toBeEnabled();

    // 다시 비우면 disabled
    await textarea.fill('');
    await expect(sendBtn).toBeDisabled();
  });
});
