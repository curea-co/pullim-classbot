import { expect, test } from '@playwright/test';

/**
 * 익명 레인 — **정본 API 가 이 화면의 오리진을 CORS 로 허용하는가.**
 *
 * 왜 이 스펙이 따로 있나: 허용 오리진 목록(`CORS_ALLOWED_ORIGINS`)은 **코드가 아니라 ECS 태스크
 * 정의의 env 에 산다.** 그래서 리포의 어떤 테스트도, 어떤 리뷰도 그 값을 못 본다. 게다가 배포가
 * 「라이브 task-def 를 떠서 **이미지만** 교체」하는 패턴이라(`pullim-api` `.github/workflows/deploy.yml`),
 * 뜨는 기준이 한 번 어긋나면 그 줄이 **조용히 사라진다**.
 *
 * 2026-09-21 에 실제로 그 상태를 만들었다 — 클래스봇 오리진이 `pullim-api-prod:34` 에만 있고
 * 도는 `:33` 에는 없었다. 그 뒤 되돌리면서 도는 쪽은 계속 없는 채로 남았다.
 *
 * 그리고 이 결손은 **서버 로그에 아무것도 남기지 않는다.** 막는 주체가 브라우저이고 API 는
 * 그대로 200 을 낸다 — 화면만 죽는다. 사람이 기억해서 확인하는 대신 여기서 붉어지게 한다.
 *
 * 범위: **우리 오리진만** 본다. 다른 도메인(writing·store 등)의 오리진도 같은 사고를 당할 수 있지만,
 * 우리가 고칠 수 없는 것 때문에 이 워크플로가 붉어지면 신호가 죽는다.
 */

/** 이 스펙이 실제로 치는 경로 — 앱이 쓰는 classbot 읽기 라우트(`@Controller('classbot')` + `@Get('bots')`). */
const PROBE_PATH = '/classbot/bots';

/**
 * 허용 목록에 들어 있을 리 없는 오리진. **대조군이 필요한 이유**: 허용 목록이 `*` 로 바뀌면
 * 긍정 단언만으로는 통과해 버린다 — 보안이 무너진 채 초록이 된다. 이 대조군이 그걸 잡는다.
 */
const FOREIGN_ORIGIN = 'https://not-allowed.invalid';

/**
 * 화면 오리진 → 그 환경의 정본 API 오리진.
 *
 * FE 는 이 값을 `NEXT_PUBLIC_OS_API_URL` 로 받지만 그건 **빌드 때 번들에 박히는** 값이라
 * 테스트 프로세스의 env 에는 없다. 그래서 여기서는 호스트 규칙으로 되짚는다 — 두 환경뿐이고
 * 규칙이 단순해서, 번들을 긁어 파싱하는 것보다 틀릴 자리가 적다.
 */
function apiOriginFor(siteOrigin: string): string | null {
  const { host, protocol } = new URL(siteOrigin);
  if (protocol !== 'https:') return null;
  if (host === 'classbot.pullim.ai') return 'https://api.pullim.ai';
  if (host === 'dev-classbot.pullim.ai') return 'https://dev-api.pullim.ai';
  return null;
}

/** preflight 한 번. `failOnStatusCode` 를 끄는 이유 — 거절도 **읽어야 할 답**이지 예외가 아니다. */
async function preflight(
  request: import('@playwright/test').APIRequestContext,
  apiOrigin: string,
  origin: string,
) {
  return request.fetch(`${apiOrigin}${PROBE_PATH}`, {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'content-type',
    },
    failOnStatusCode: false,
  });
}

test.describe('정본 API 의 CORS 허용 오리진', () => {
  test('이 화면의 오리진을 허용한다 · 모르는 오리진은 허용하지 않는다', async ({
    request,
    baseURL,
  }) => {
    test.skip(
      !baseURL || apiOriginFor(baseURL) === null,
      '배포된 두 환경(prod·dev preview)에서만 의미가 있다 — 로컬에는 정본 API 가 없다.',
    );

    const siteOrigin = new URL(baseURL as string).origin;
    const apiOrigin = apiOriginFor(siteOrigin) as string;

    // (a) 우리 오리진이 허용된다. 빠지면 브라우저가 막아 화면이 통째로 죽는다.
    const allowed = await preflight(request, apiOrigin, siteOrigin);
    expect(
      allowed.headers()['access-control-allow-origin'],
      `${apiOrigin} 가 ${siteOrigin} 를 CORS 로 허용하지 않는다. ` +
        'CORS_ALLOWED_ORIGINS 는 ECS 태스크 정의 env 에 있다 — 배포가 뜬 리비전에 그 줄이 있는지 보라.',
    ).toBe(siteOrigin);

    // 앱은 쿠키로 인증한다. 허용 오리진이어도 이게 꺼지면 인증 호출이 전부 실패한다.
    expect(allowed.headers()['access-control-allow-credentials']).toBe('true');

    // (b) 대조군 — 허용 목록이 허용 목록으로 남아 있는가(`*` 로 열리지 않았는가).
    const foreign = await preflight(request, apiOrigin, FOREIGN_ORIGIN);
    expect(
      foreign.headers()['access-control-allow-origin'],
      `${apiOrigin} 가 모르는 오리진(${FOREIGN_ORIGIN})에도 허용 헤더를 준다 — 허용 목록이 열렸다.`,
    ).toBeUndefined();
  });
});
