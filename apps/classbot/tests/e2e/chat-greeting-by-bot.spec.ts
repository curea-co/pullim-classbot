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
    // 빈 가드는 조회 **둘**(정본 `GET /classbot/bots?role=student` · 같은 오리진
    // `/api/marketplace/bots`)이 끝난 뒤에야 그려진다 — 앞의 것은 계획 PR 8 이전에는
    // 같은 오리진 `/api/me/classrooms` 였다
    // (`lib/store/mode-bots.ts` 의 `isLoading` → chat `page.tsx` 의 `!classHydrated || botsLoading` 가드).
    // 그 전에는 「불러오는 중…」이고, 그 문구는 **SSR HTML 에 이미 들어 있다.**
    //
    // `networkidle` 로는 그 구간을 못 덮는다 — 「500ms 무통신」이라 **하이드레이션이 느리면
    // 조회가 나가기도 전에 풀린다.** 실서비스 실측(CPU 20x 스로틀): networkidle 764ms인데
    // 첫 조회는 2078ms에 나갔다. 그러면 기본 5초 단정이 하이드레이션 + 왕복 둘을 다 삼켜야 하고,
    // 새 배포 직후 콜드 스타트가 얹히면 진다 — 재현: CPU 20x + 조회 4초 지연 → 가드가
    // networkidle 로부터 **5110ms** 뒤에 떴다. 승격 직후 prod-verify 가 이 줄에서 죽은 이유다.
    //
    // 그래서 **정착 신호를 먼저 기다린다** — 로딩 자리표시가 사라질 때까지.
    await expect(page.getByText('불러오는 중…')).toBeHidden({ timeout: 30_000 });
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
