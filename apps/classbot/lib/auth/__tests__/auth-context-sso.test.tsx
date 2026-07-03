/**
 * auth-context — SSO 세션 확립 배선 통합 테스트 (실제 모듈 조합, fetch 만 mock).
 * 검증: OS `/me` 세션 복원 → ① domain-fetch 신원 스냅샷 publish(getAuthUserSnapshot),
 * ② me/sync 1회 호출(x-user-id = OS sub, { name, role }).
 * (스냅샷 해제·dedup·플래그 게이트 단위는 domain-fetch-sso / me-sync 테스트가 커버.)
 */
jest.mock('@/lib/auth/auth-mode', () => ({ OS_SSO_ENABLED: true }));
jest.mock('@/lib/features', () => ({ USE_REAL_CORE_BE: true, USE_REAL_REQUIZ_BE: false }));

import { render, screen, waitFor } from '@testing-library/react';
import { BASE_URL } from '@pullim-classbot/api-client';

import { getAuthUserSnapshot } from '@/lib/api/domain-fetch';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { API_BASE } from '@/lib/auth/os-sso';

const ME = {
  sub: '5f0c9a2e-1111-4222-8333-444455556666',
  email: 'teacher@pullim.com',
  displayName: '김교사',
  role: 'teacher',
  globalRole: 'user',
};

/** URL 별 라우팅 fetch mock — /me 는 json(), 도메인 라우트는 text() 계약. */
const fetchMock = jest.fn((url: string) => {
  if (url === `${API_BASE}/me`) {
    return Promise.resolve({ status: 200, ok: true, json: async () => ME } as unknown as Response);
  }
  if (url === `${BASE_URL}/me/sync`) {
    return Promise.resolve({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as unknown as Response);
  }
  return Promise.reject(new Error(`unexpected fetch: ${url}`));
});

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockClear();
});

function Probe() {
  const { user, isReady } = useAuth();
  if (!isReady) return <span>loading</span>;
  return <span data-testid="user">{user ? `${user.id}:${user.role}` : 'anonymous'}</span>;
}

it('세션 확립 → 스냅샷 publish + me/sync 1회 (x-user-id = OS sub, { name, role })', async () => {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('user')).toHaveTextContent(`${ME.sub}:teacher`);
  });

  // ① domain-fetch 가 세션 신원을 raw sub 로 판정한다 (데모 브리지 미적용).
  expect(getAuthUserSnapshot()).toEqual({ id: ME.sub });

  // ② me/sync 가 SSO 명의로 1회 호출됐다.
  await waitFor(() => {
    const syncCalls = fetchMock.mock.calls.filter(([url]) => url === `${BASE_URL}/me/sync`);
    expect(syncCalls).toHaveLength(1);
    const [, init] = syncCalls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: '김교사', role: 'teacher' }));
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(ME.sub);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
