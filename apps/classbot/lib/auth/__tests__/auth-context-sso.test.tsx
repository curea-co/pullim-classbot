/**
 * auth-context — SSO 세션 확립 배선 통합 테스트 (실제 모듈 조합, fetch 만 mock).
 * 검증: OS `/me` 세션 복원 → domain-fetch 신원 스냅샷 publish(`currentSessionUserId`).
 * 정본 서버는 OS 쿠키의 sub 로 신원을 파생하므로 **사용자 프로비저닝(me/sync) 호출이 없다** —
 * `/me` 외 다른 fetch 가 나가지 않는 것을 함께 검증한다(구 x-user-id + me/sync 모델 폐기 회귀).
 * 그리고 `/me` 에 **닿지 못한** 것(네트워크·5xx)은 `sessionError` 로 갈라 비로그인과 다르게 노출한다.
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
      <span data-testid="user">{user ? `${user.id}:${user.role}` : 'anonymous'}</span>
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
    expect(screen.getByTestId('user')).toHaveTextContent(`${ME.sub}:teacher`);
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
