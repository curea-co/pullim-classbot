import { test, expect, type Page } from '@playwright/test';

/**
 * 익명 레인 — 로그인 없이 도는 유일한 스펙 (prod-verify `anon` 프로젝트).
 *
 * 왜 따로인가: 코어 화면(홈·챗·과제·교사 홈·수업방)은 곧 비로그인 방문자를 풀림 OS 로그인으로
 * 보낸다(완성 계획 2026-09-16 §10 결정 ②). prod-verify 는 익명으로 도는데, 그 뒤엔 기존
 * 스펙들이 전부 로그인 벽에 막혀 붉어진다. 그래서 회귀 검증을 두 레인으로 갈랐다 —
 * 이 스펙(익명)과 로그인 레인(나머지 스펙, `auth.setup.ts` 가 남긴 세션으로 돈다).
 *
 * 이 스펙이 보는 것:
 *  1. 공개 화면(`/classbot/onboarding`)이 익명에게 그대로 열린다 — 로그인으로 보내면 실패.
 *  2. 코어 화면 각각이 **다음 셋 중 하나**로 선다. 지금(콘텐츠)과 곧(로그인 뒤) 둘 다 통과해야
 *     FE 전환 PR 이 이 워크플로를 붉게 만들지 않는다. 판정 순서가 곧 우선순위다 — 게이트 카드는
 *     셸의 `main` **안에** 그려지므로 셸을 먼저 보면 (c) 가 영영 안 잡힌다:
 *     (a) 앱 오리진을 벗어나 `/login` 에 도착한다 — `redirectToOsLogin()` 뒤의 상태
 *     (b) 로그인 게이트 문구가 보인다 — `ReadLoginGate` 의 「로그인이 필요해요」(components/classbot/read-state.tsx)
 *     (c) 화면 셸이 그려진다 — `main` 랜드마크(PUDS `DashboardShell`). 오늘의 상태
 *     5xx 응답과 빈 문서는 셋 중 어느 것도 아니므로 실패한다. 어느 상태였는지는 어노테이션으로 남긴다.
 *
 * localStorage 시드·참여 코드 없이 돈다 — 익명 레인은 신원이 없는 방문자 그대로를 본다.
 */

/** 코어 화면 — 결정 ② 이후 비로그인이면 OS 로그인으로 가는 경로들. `/` 는 307 로 `/classbot` 에 간다. */
const CORE_ROUTES = [
  '/',
  '/classbot',
  '/classbot/chat',
  '/classbot/assignment',
  '/teacher',
  '/teacher/classroom',
] as const;

/**
 * (선택) OS 호스트. 주면 (b) 의 도착 오리진을 이 값으로 고정한다 — 없으면 「앱 오리진을
 * 벗어나 `/login` 에 닿았다」까지만 본다. 로그인 레인의 `auth.setup.ts` 와 같은 변수를 읽는다.
 */
const OS_URL = process.env.E2E_OS_URL;

type GateState = 'os-login' | 'login-gate' | 'shell';

/**
 * 로그인 게이트 카드의 실제 문구. 느슨한 /로그인/ 은 헤더 카피(「로그인하고 학습을 시작하세요」)까지
 * 걸려 셸을 게이트로 읽으므로 게이트 컴포넌트가 실제로 그리는 제목만 본다.
 *  - `ReadLoginGate`: 「로그인이 필요해요」 — 이 판정이 보는 것은 이 한 벌이다.
 *
 * 종전에는 「로그인하면 … 볼 수 있어요」 갈래도 함께 봤다. **마켓 목록·상세와 담은 봇에서
 * 그 문구가 사라져서** 걷었다 — 그 셋의 401 은 로그인으로 풀리지 않아(같은 오리진 route
 * handler 에 OS 세션을 풀 열쇠가 없다) 「아직 준비 중이에요」로 고쳐졌고, 애초에 아래
 * `CORE_ROUTES` 에 없어 이 판정에 들어오지도 않았다.
 *
 * ⚠ **같은 꼴의 문구가 앱에 한 벌 남아 있다** — `components/shell/notification-bell.tsx` 의
 * 「로그인하면 알림을 볼 수 있어요」. 셸이라 코어 6 경로 **전부**에 붙지만 닫힌 드롭다운
 * 안이라 DOM 에 없고, 이 스펙은 벨을 열지 않는다. 그래서 갈래를 걷어도 판정이 안 바뀐다.
 * 그 한 벌은 **문구가 참이라 그대로 뒀다** — 알림은 정본(pullim-api)을 읽고 신원도 실제
 * OS 세션(`useAuth`)에서 와서, 로그인하면 실제로 열린다. 벨을 여는 단언을 나중에 더한다면
 * 그때 이 갈래를 되살릴지 다시 본다.
 */
const LOGIN_GATE_COPY = /로그인이 필요해요/;

/**
 * 지금 페이지가 세 상태 중 어디에 있는지 본다. 어디에도 없으면 null — 호출자가 다시 본다.
 * 내비게이션 도중이면 로케이터가 던질 수 있는데, 그건 `toPass` 가 다시 돌린다.
 *
 * 순서가 판정이다: OS 도착 → 게이트 문구 → 셸. 게이트 카드는 셸 `main` 안에 그려지므로
 * 셸을 먼저 보면 게이트가 늘 'shell' 로 기록된다.
 */
async function observeGateState(page: Page, appOrigin: string): Promise<GateState | null> {
  const url = new URL(page.url());
  if (url.origin !== appOrigin) {
    if (url.pathname !== '/login') return null;
    if (OS_URL && url.origin !== new URL(OS_URL).origin) return null;
    return 'os-login';
  }
  // 텍스트 로케이터는 숨은 요소도 세므로 visible 로 거른다. getByRole 은 접근성 트리에서 이미 뺀다.
  if ((await page.getByText(LOGIN_GATE_COPY).filter({ visible: true }).count()) > 0) return 'login-gate';
  if ((await page.getByRole('main').count()) > 0) return 'shell';
  return null;
}

test.describe('익명 레인 — 공개 화면과 코어 화면의 로그인 게이트', () => {
  test('공개 화면 — /classbot/onboarding 은 익명에게 그대로 열린다', async ({ page, baseURL }) => {
    const appOrigin = new URL(baseURL!).origin;
    const response = await page.goto('/classbot/onboarding', { waitUntil: 'domcontentloaded' });

    expect(response, '응답이 없다').not.toBeNull();
    expect(response!.ok(), `/classbot/onboarding 이 ${response!.status()} 로 답했다`).toBe(true);
    // 공개 화면은 로그인으로 보내면 안 된다 — 앱 오리진에 머문 채 제 제목을 그린다.
    await expect(
      page.getByRole('heading', { level: 1, name: /풀림 클래스봇 처음이라면/ }),
    ).toBeVisible({ timeout: 15_000 });
    expect(new URL(page.url()).origin).toBe(appOrigin);
  });

  for (const route of CORE_ROUTES) {
    test(`코어 화면 ${route} — 셸이 그려지거나, OS 로그인으로 가거나, 로그인 안내가 선다`, async ({
      page,
      baseURL,
    }) => {
      const appOrigin = new URL(baseURL!).origin;
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      // 리다이렉트를 따라간 뒤의 마지막 응답이다 — 5xx 는 세 상태 어느 것도 아니다.
      expect(response, '응답이 없다').not.toBeNull();
      expect(response!.status(), `${route} 가 ${response!.status()} 로 답했다`).toBeLessThan(500);

      let state: GateState | null = null;
      await expect(async () => {
        state = await observeGateState(page, appOrigin);
        expect(
          state,
          `${route} 가 셸도, OS 로그인도, 로그인 안내도 아니다 — 현재 ${page.url()}`,
        ).not.toBeNull();
      }).toPass({ timeout: 15_000 });

      test.info().annotations.push({ type: 'gate-state', description: `${route} → ${state}` });
    });
  }
});
