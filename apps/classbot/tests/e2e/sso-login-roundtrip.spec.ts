import { test, expect } from '@playwright/test';

/**
 * 풀림 OS SSO 로그인 라운드트립 e2e — 미로그인 진입 → OS 로그인 리다이렉트 → 세션 복원(/me) → 로그아웃.
 *
 * ⚠️ prod-verify 안전 게이트 (MUST):
 *  이 디렉터리의 모든 스펙은 prod-verify 워크플로가 **SSO OFF 인 production**(https://classbot.pullim.ai)
 *  에 대해 일괄 실행한다. SSO 는 Dev 미배포 상태라 prod 에는 OS 로그인 호스트·`/me` 엔드포인트가 없다.
 *  따라서 이 스펙은 전용 env `SSO_E2E_BASE_URL` 이 설정된 경우에만 실행되고, 없으면 **모든 test 가 skip** 된다
 *  (FAIL 아님). 각 test 최상단의 `test.skip(!SSO_E2E_BASE_URL, ...)` 가드가 env 부재 시 0 assertion 으로 건너뛴다.
 *
 *  실행 방법:
 *    # 리다이렉트 계약(test 1)만: classbot base 만 있으면 됨
 *    SSO_E2E_BASE_URL=http://localhost:3012 \
 *      bunx playwright test tests/e2e/sso-login-roundtrip.spec.ts
 *    # 세션·로그아웃(test 2·3)까지: /me 호출 대상 OS API origin + 유효 세션 쿠키 필요
 *    SSO_E2E_BASE_URL=https://dev-classbot.pullim.ai \
 *    SSO_E2E_API_BASE_URL=https://api.pullim.ai \
 *    SSO_E2E_SESSION_COOKIE='local-pullim-at=<유효세션쿠키값>' \
 *      bunx playwright test tests/e2e/sso-login-roundtrip.spec.ts
 *  (classbot 앱이 NEXT_PUBLIC_OS_SSO=true 로 구동되고, OS 로그인 호스트·pullim-api 가 도달 가능해야 실질 검증됨)
 *
 * 검증 대상(조사된 flowSteps/endpoints — 실제 코드에 존재하는 것만):
 *  - 미로그인 진입 시 프로필 메뉴 → '로그인' CTA 노출
 *  - '로그인' 클릭 → OS 로그인 URL(`${OS_URL}/login?next=<현재경로>`) 로 이동(osLoginUrl 규약)
 *  - (세션 쿠키 존재 시) `/me` 파생 사용자명이 프로필 메뉴에 노출
 *  - 로그아웃 → signOut() 후 세션 비워짐(비로그인 UI 복귀)
 */

const SSO_BASE = process.env.SSO_E2E_BASE_URL;
// `/me`·`/auth/*` 는 classbot origin 이 아니라 OS API origin(NEXT_PUBLIC_OS_API_URL)으로 호출된다.
// 세션 쿠키 기반 시나리오(2·3)는 이 API origin 을 알아야 쿠키를 올바른 origin 에 주입할 수 있다.
const SSO_API_BASE = process.env.SSO_E2E_API_BASE_URL;

test.describe('SSO 로그인 라운드트립 (OS SSO 모드 전용)', () => {
  test('미로그인 진입 → 로그인 CTA 가 OS 로그인 URL 로 향한다', async ({ page }) => {
    test.skip(!SSO_BASE, 'SSO_E2E_BASE_URL 미설정 — SSO Dev 미배포. prod-verify 안전 skip.');
    const base = SSO_BASE!;

    await page.goto(base + '/classbot', { waitUntil: 'networkidle' });

    // 미로그인 상태: 프로필 트리거 → '로그인' 항목 노출
    await page.getByRole('button', { name: '프로필 메뉴 열기' }).click();
    const loginItem = page.getByRole('menuitem', { name: '로그인' });
    await expect(loginItem).toBeVisible();

    // 로그인 클릭 → OS 로그인으로 리다이렉트. OS 호스트 origin 으로 이동하고 next 파라미터로 복귀 경로를 담는다.
    await Promise.all([
      page.waitForURL(/\/login(\?|$)/, { timeout: 15_000 }),
      loginItem.click(),
    ]);

    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    // osLoginUrl 규약: 현재 내부 경로(`/classbot`)를 next 로 부착(open-redirect 방지 통과 경로).
    expect(url.searchParams.get('next')).toBe('/classbot');
  });

  test('세션 쿠키 존재 시 /me 파생 사용자명이 프로필 메뉴에 노출된다', async ({ page }) => {
    test.skip(!SSO_BASE, 'SSO_E2E_BASE_URL 미설정 — SSO Dev 미배포. prod-verify 안전 skip.');
    test.skip(
      !SSO_API_BASE,
      'SSO_E2E_API_BASE_URL 미설정 — /me 호출 대상(OS API origin)을 몰라 세션 쿠키를 올바른 origin 에 주입 불가.',
    );
    test.skip(
      !process.env.SSO_E2E_SESSION_COOKIE,
      'SSO_E2E_SESSION_COOKIE 미설정 — 유효 OS 세션 쿠키 없이는 /me 200 을 얻을 수 없어 검증 불가.',
    );
    const base = SSO_BASE!;

    // getSession() 은 `${NEXT_PUBLIC_OS_API_URL}/me` 를 credentials:'include' 로 호출한다.
    // 따라서 쿠키는 classbot origin 이 아니라 **API origin(SSO_API_BASE)** 에 주입해야 /me 요청에 동봉된다.
    // (classbot origin 에 넣으면 cross-origin 이라 /me 로 전송되지 않아 항상 미로그인으로 판정된다.)
    const [cookieName, ...rest] = process.env.SSO_E2E_SESSION_COOKIE!.split('=');
    await page.context().addCookies([
      { name: cookieName, value: rest.join('='), url: SSO_API_BASE! },
    ]);

    await page.goto(base + '/classbot', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: '프로필 메뉴 열기' }).click();
    // 로그인 세션에서는 '로그인' 대신 '로그아웃' 항목이 노출된다(app-header ProfileMenu 분기).
    await expect(page.getByRole('menuitem', { name: '로그아웃' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '로그인' })).toHaveCount(0);
  });

  test('로그아웃 → OS 로 이탈하며 세션이 종료된다', async ({ page }) => {
    test.skip(!SSO_BASE, 'SSO_E2E_BASE_URL 미설정 — SSO Dev 미배포. prod-verify 안전 skip.');
    test.skip(
      !SSO_API_BASE,
      'SSO_E2E_API_BASE_URL 미설정 — 세션 쿠키를 API origin 에 주입할 수 없어 로그인 상태 구성 불가.',
    );
    test.skip(
      !process.env.SSO_E2E_SESSION_COOKIE,
      'SSO_E2E_SESSION_COOKIE 미설정 — 로그인 상태를 만들 수 없어 로그아웃 검증 불가.',
    );
    const base = SSO_BASE!;

    const [cookieName, ...rest] = process.env.SSO_E2E_SESSION_COOKIE!.split('=');
    await page.context().addCookies([
      { name: cookieName, value: rest.join('='), url: SSO_API_BASE! },
    ]);

    await page.goto(base + '/classbot', { waitUntil: 'networkidle' });

    // 로그인 상태 확인 후 로그아웃 실행.
    await page.getByRole('button', { name: '프로필 메뉴 열기' }).click();
    const logoutItem = page.getByRole('menuitem', { name: '로그아웃' });
    await expect(logoutItem).toBeVisible();

    // handleLogout: signOut()(GET /auth/csrf → POST /auth/logout) 직후 곧바로
    // window.location.assign(OS_URL) 로 이탈한다. 토스트는 이탈 전에 그려진다는 보장이 없어 플래키하므로,
    // 결정적 관측 신호인 **classbot origin 이탈**(OS 로 리다이렉트)을 검증한다.
    await Promise.all([
      page.waitForURL((u) => !u.toString().startsWith(base), { timeout: 15_000 }),
      logoutItem.click(),
    ]);
    expect(page.url().startsWith(base)).toBe(false);
  });
});
