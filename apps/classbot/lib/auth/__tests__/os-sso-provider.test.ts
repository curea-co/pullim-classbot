import { OsSsoAuthProvider } from '@/lib/auth/os-sso-provider';
import { API_BASE } from '@/lib/auth/os-sso';

function jsonRes(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('OsSsoAuthProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getSession: /me 200 → AuthUser 매핑(sub→id, teacher→teacher), credentials include', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonRes(200, {
        sub: 'user_1',
        email: 'a@pullim.com',
        displayName: '김교사',
        role: 'teacher',
        globalRole: 'user',
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = await new OsSsoAuthProvider().getSession();

    expect(user).toEqual({ id: 'user_1', email: 'a@pullim.com', role: 'teacher' });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  });

  it('getSession: globalRole=admin → admin, 그 외 도메인 role(parent) → student', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'student', globalRole: 'admin' }))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'parent', globalRole: 'user' })) as unknown as typeof fetch;

    expect((await new OsSsoAuthProvider().getSession())?.role).toBe('admin');
    expect((await new OsSsoAuthProvider().getSession())?.role).toBe('student');
  });

  it('getSession: 401 → null (미로그인)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(401, {})) as unknown as typeof fetch;
    expect(await new OsSsoAuthProvider().getSession()).toBeNull();
  });

  it('getSession: 네트워크 오류 → null (fail-closed)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    expect(await new OsSsoAuthProvider().getSession()).toBeNull();
  });

  it('signOut: GET /auth/csrf 토큰을 받아 POST /auth/logout 에 X-CSRF-Token 동봉', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(200, { csrfToken: 'csrf-xyz' })) // /auth/csrf
      .mockResolvedValueOnce(jsonRes(204, {})); // /auth/logout
    global.fetch = fetchMock as unknown as typeof fetch;

    await new OsSsoAuthProvider().signOut();

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${API_BASE}/auth/csrf`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': 'csrf-xyz' },
    });
  });

  it('signInWithEmail: SSO 모드에서는 AuthError(SSO_REDIRECT) reject', async () => {
    await expect(new OsSsoAuthProvider().signInWithEmail()).rejects.toMatchObject({ code: 'SSO_REDIRECT' });
  });

  it('onAuthStateChange: 구독 즉시 현재값(null) 1회 전달 + getSession 후 통지', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonRes(200, { sub: 'u9', email: 'e', displayName: 'd', role: 'student', globalRole: 'user' })) as unknown as typeof fetch;
    const provider = new OsSsoAuthProvider();
    const seen: (string | null)[] = [];
    provider.onAuthStateChange((u) => seen.push(u?.id ?? null));
    await provider.getSession();
    expect(seen).toEqual([null, 'u9']);
  });
});
