import { test, expect } from '@playwright/test';
import { joinDemoClass } from './helpers';

/**
 * 신규 사용자 챗 진입.
 *
 * 챗 목록은 **반 봇 + 담은 봇 한 벌**이다(`lib/store/mode-bots.ts`) — 학습 모드로 갈라
 * 한쪽만 보여 주던 분기는 걷었다. 둘 다 없는 신규 사용자는 빈 가드를 보고, 그 빈 가드에는
 * **나가는 길이 둘** 있어야 한다: 봇 마켓(혼자 지금 할 수 있는 길)과 참여 코드.
 * 예전엔 참여 코드 하나뿐이라, 선생님이 없는 학생에게는 막다른 길이었다.
 *
 * 이 스펙은 로그인 없이 돈다 — 마켓 목록은 신원을 요구하므로(마켓 계약 §2) 여기서 검증하는 것은
 * 「마켓으로 가는 **길이 있는가**」까지다. 참여 코드로 클래스에 들어가면 챗이 열리고
 * 봇 첫 인사 + 가이드 흐름칩이 노출된다.
 */
test.describe('신규 사용자 챗 진입', () => {
  test('봇이 하나도 없을 때 — 빈 가드에 마켓·참여 코드 두 길이 다 있다', async ({ page }) => {
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await expect(page.getByText('아직 대화할 봇이 없어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '봇 마켓 둘러보기' })).toBeVisible();
    await expect(page.getByRole('link', { name: '참여 코드 입력하러 가기' })).toBeVisible();
  });

  test('참여 후 — 봇 대화 + 가이드 흐름칩', async ({ page }) => {
    await joinDemoClass(page);
    await page.goto('/classbot/chat', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot="chat-scroll"]', { timeout: 15000 });

    await expect(page.getByText('봇과 대화', { exact: true })).toBeVisible();
    // 이 봇이 어느 쪽인지 — 참여 코드로 들어왔으니 반 봇이다(담은 봇이면 「내가 담은 봇」).
    await expect(page.getByText('선생님 반의 봇').first()).toBeVisible();
    // 봇 주도 수업 오프너 흐름칩
    await expect(page.getByRole('button', { name: '개념 더보기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '퀴즈 내줘' })).toBeVisible();
  });
});
