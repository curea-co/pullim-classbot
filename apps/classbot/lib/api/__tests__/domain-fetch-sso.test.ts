/**
 * domain-fetch — OS SSO 세션 신원 경로(②) 단위 테스트.
 * `OS_SSO_ENABLED` ON 을 모킹하고, auth-context 가 publish 하는 세션 스냅샷을 직접
 * 주입해 3-way 판정(① JWT > ② SSO > ③ 데모)과 x-user-id 명의를 검증한다.
 * flag OFF(기본) 동작은 기존 domain-fetch.test.ts 가 그대로 커버한다(회귀 0).
 */
jest.mock('@/lib/auth/auth-mode', () => ({ OS_SSO_ENABLED: true }));

import { tokenManager, BASE_URL } from '@pullim-classbot/api-client';
import {
  domainFetch,
  getAuthUserSnapshot,
  setDomainIdentitySnapshot,
  studentRequestIdentity,
  teacherRequestIdentity,
} from '../domain-fetch';

const fetchMock = jest.fn();

/** OS /me 가 내려주는 세션 사용자 (sub = raw uuid). */
const OS_USER = {
  id: '5f0c9a2e-1111-4222-8333-444455556666',
  email: 'teacher@pullim.com',
  role: 'teacher',
  name: '김교사',
};

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  tokenManager.clearTokens();
  setDomainIdentitySnapshot(null);
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** 디코더블 access token (검증 없음 — decodeAccessToken 은 sub/role 만 요구). */
function fakeJwt(sub: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub, email: `${sub}@test.io`, role: 'student', exp: 9999999999 }),
  ).toString('base64url');
  return `header.${payload}.sig`;
}

describe('getAuthUserSnapshot — 3-way (SSO ON)', () => {
  it('② SSO 스냅샷 publish → 인증 판정 { id: OS sub } (토큰 없이)', () => {
    expect(getAuthUserSnapshot()).toBeNull();
    setDomainIdentitySnapshot(OS_USER);
    expect(getAuthUserSnapshot()).toEqual({ id: OS_USER.id });
  });

  it('① 디코더블 JWT 가 ② SSO 스냅샷보다 우선한다', () => {
    setDomainIdentitySnapshot(OS_USER);
    tokenManager.setTokens(fakeJwt('jwt-sub-1'), 'r');
    expect(getAuthUserSnapshot()).toEqual({ id: 'jwt-sub-1' });
  });

  it('잔여 비-디코더블 토큰이 있어도 ② SSO 세션이 인증으로 판정된다', () => {
    setDomainIdentitySnapshot(OS_USER);
    tokenManager.setTokens('garbage-not-a-jwt', 'r');
    expect(getAuthUserSnapshot()).toEqual({ id: OS_USER.id });
  });

  it('로그아웃(null publish) → ③ 미인증으로 복귀', () => {
    setDomainIdentitySnapshot(OS_USER);
    setDomainIdentitySnapshot(null);
    expect(getAuthUserSnapshot()).toBeNull();
  });
});

describe('request identity — SSO 세션은 raw sub, 데모 브리지 미적용', () => {
  it('student/teacher identity 가 raw uuid 를 유지하고 demoUserId 를 노출하지 않는다', () => {
    setDomainIdentitySnapshot(OS_USER);
    expect(studentRequestIdentity()).toEqual({
      isAuthenticated: true,
      userId: OS_USER.id,
      demoUserId: undefined,
    });
    expect(teacherRequestIdentity()).toEqual({
      isAuthenticated: true,
      userId: OS_USER.id,
      demoUserId: undefined,
    });
  });

  it('스냅샷 없으면 기존 데모 브리지 그대로 (SSO ON 이어도 미인증은 ③)', () => {
    expect(studentRequestIdentity()).toEqual({
      isAuthenticated: false,
      userId: 'student_001',
      demoUserId: 'student_001',
    });
  });
});

describe('domainFetch — ② SSO 세션 x-user-id 경로', () => {
  it('토큰 없이 x-user-id = OS sub 로 전송한다 (Bearer 없음, 데모 명의 아님)', async () => {
    setDomainIdentitySnapshot(OS_USER);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bots: [] }));

    const result = await domainFetch<{ bots: unknown[] }>('/bots?role=teacher');

    expect(result).toEqual({ bots: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/bots?role=teacher`);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(OS_USER.id);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('SSO sub 가 호출부 demoUserId 보다 우선한다 (오귀속 차단)', async () => {
    setDomainIdentitySnapshot(OS_USER);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await domainFetch('/enrollments', { method: 'POST', body: { code: 'X' }, demoUserId: 'student_001' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(OS_USER.id);
  });

  it('스냅샷 없으면 기존 데모 x-user-id 폴백 그대로 동작한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));

    await domainFetch('/bots', { demoUserId: 'student_001' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
  });

  it('잔여 토큰 401 → SSO x-user-id 명의로 1회 폴백한다 (자기 sub — 데모 아님)', async () => {
    setDomainIdentitySnapshot(OS_USER);
    tokenManager.setTokens('stale-access', 'stale-refresh');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: 'Unauthorized' })) // Bearer 시도
      .mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: 'Unauthorized' })) // refresh 시도
      .mockResolvedValueOnce(jsonResponse(200, { assignments: [] })); // SSO 폴백

    const result = await domainFetch<{ assignments: unknown[] }>('/assignments');

    expect(result).toEqual({ assignments: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(OS_USER.id);
  });
});
