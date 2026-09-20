/**
 * auth-context — SSO 세션 확립 배선 통합 테스트 (실제 모듈 조합, fetch 만 mock).
 * 검증: OS `/me` 세션 복원 → domain-fetch 신원 스냅샷 publish(`currentSessionUserId`).
 * 정본 서버는 OS 쿠키의 sub 로 신원을 파생하므로 **사용자 프로비저닝(me/sync) 호출이 없다** —
 * `/me` 외 다른 fetch 가 나가지 않는 것을 함께 검증한다(구 x-user-id + me/sync 모델 폐기 회귀).
 * 그리고 `/me` 에 **닿지 못한** 것(네트워크·5xx)은 `sessionError` 로 갈라 비로그인과 다르게 노출한다.
 * 세션 사용자의 **이름**(`/me` displayName → `AuthUser.name`)이 계약의 칸으로 남아
 * `AuthUser | null` 경계를 지나 **소비자에서** 읽히는지도 함께 본다.
 */
import { render, screen, waitFor } from '@testing-library/react';

import { currentSessionUserId } from '@/lib/api/domain-fetch';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { API_BASE } from '@/lib/auth/os-sso';

const ME = {
  sub: '5f0c9a2e-1111-4222-8333-444455556666',
  email: 'teacher@pullim.com',
  displayName: '김교사',
  role: 'teacher',
  globalRole: 'user',
};

/** /me 만 응답한다. 다른 URL(예: 폐기된 /me/sync) 요청은 reject 되어 테스트가 실패한다. */
const fetchMock = jest.fn((url: string) => {
  if (url === `${API_BASE}/me`) {
    return Promise.resolve({ status: 200, ok: true, json: async () => ME } as unknown as Response);
  }
  return Promise.reject(new Error(`unexpected fetch: ${url}`));
});

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockClear();
});

function Probe() {
  const { user, isReady, sessionError } = useAuth();
  if (!isReady) return <span>loading</span>;
  return (
    <>
      <span data-testid="user">{user ? `${user.id}:${user.role}:${user.name}` : 'anonymous'}</span>
      <span data-testid="session-error">{sessionError ?? 'none'}</span>
    </>
  );
}

it('세션 확립 → 스냅샷 publish (raw sub), 프로비저닝 호출 없음(/me 만)', async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() => {
    // 이름까지 본다. 여기서 지키는 것은 **계약**이다 — 이름이 `AuthUser | null` 경계를 지나도
    // 칸이 남아 `user.name` 으로 읽힌다는 것.
    //
    // 「종전에는 이 값이 `undefined` 였다」로 읽지 마라. 이름은 provider 가 세운 세션 객체에
    // 처음부터 실려 있었다(`os-sso-provider.test.ts` 가 `getSession()` 결과에 `name` 이 있음을
    // 이미 단정한다) — 타입은 런타임에서 아무것도 깎지 않고, `auth-context` 는 그 객체를
    // `setUser(next)` 로 참조 그대로 넘긴다. 빠져 있던 것은 **읽는 자리**였다
    // (`lib/current-user.ts` 가 `user.name` 대신 email 로 이름을 만들고 있었다 —
    // `lib/__tests__/current-user-name.test.tsx` 가 그 순서를 본다).
    expect(screen.getByTestId('user')).toHaveTextContent(`${ME.sub}:teacher:${ME.displayName}`);
  });
  expect(screen.getByTestId('session-error')).toHaveTextContent('none');

  // domain-fetch 가 세션 신원을 raw sub 로 판정한다 (로컬 필터·재동기화 키).
  expect(currentSessionUserId()).toBe(ME.sub);

  // /me 외 다른 요청은 나가지 않는다 — me/sync 프로비저닝 폐기 회귀.
  const urls = fetchMock.mock.calls.map(([url]) => url);
  expect(urls.every((u) => u === `${API_BASE}/me`)).toBe(true);
});

it('/me 401 → 비로그인 확정(sessionError 없음)', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ status: 401, ok: false, json: async () => ({}) } as unknown as Response),
  ) as unknown as typeof fetch;

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  expect(screen.getByTestId('session-error')).toHaveTextContent('none');
});

it('/me 에 닿지 못하면(네트워크) user 는 null 이지만 sessionError=unavailable — 비로그인으로 접지 않는다', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('cors'))) as unknown as typeof fetch;

  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  expect(screen.getByTestId('session-error')).toHaveTextContent('unavailable');
  expect(currentSessionUserId()).toBeNull();
});
