import { mapRole, OsSsoAuthProvider } from '@/lib/auth/os-sso-provider';
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

  it('getSession: /me 200 → AuthUser 매핑(sub→id, teacher→teacher, name→name), credentials include', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonRes(200, {
        sub: 'user_1',
        email: 'a@pullim.com',
        // `displayName` 은 가입 때 email local-part 로 파생된 값이다(pullim-api `deriveDisplayName`).
        // 이름 자리에 서야 하는 것은 `name`(KCB 실명)이다 — 둘을 다르게 줘서 어느 쪽이 실리는지 본다.
        name: '김수학',
        displayName: 'a',
        role: 'teacher',
        globalRole: 'user',
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = await new OsSsoAuthProvider().getSession();

    expect(user).toEqual({ id: 'user_1', email: 'a@pullim.com', role: 'teacher', name: '김수학' });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  });

  // `/me` 는 `as MeResponse` 캐스팅이라 칸이 아예 없는 응답을 타입이 막아 주지 않는다.
  // (서버 쪽 `decryptName` 은 이미 `displayName` 으로 떨어뜨리므로 정상 경로에서는 비지 않는다 —
  //  이 폴백이 지키는 것은 그 계약이 아니라 **검사받지 않은 JSON** 이다.)
  it('getSession: /me.name 이 없거나 공백뿐이면 displayName 으로 떨어진다 — 빈 이름을 싣지 않는다', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'psh', role: 'student', globalRole: 'user' }))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', name: '', displayName: 'psh', role: 'student', globalRole: 'user' }))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', name: '   ', displayName: 'psh', role: 'student', globalRole: 'user' })) as unknown as typeof fetch;

    expect((await new OsSsoAuthProvider().getSession())?.name).toBe('psh');
    expect((await new OsSsoAuthProvider().getSession())?.name).toBe('psh');
    expect((await new OsSsoAuthProvider().getSession())?.name).toBe('psh');
  });

  // 앞뒤 공백은 provider 가 자르지 않는다 — 자르는 자리는 `lib/current-user.ts` 의 `displayNameOf`
  // 한 곳이다. provider 는 `/me` 가 준 것을 비틀지 않고 옮긴다.
  it('getSession: /me.name 이 있으면 그대로 싣는다 — 앞뒤 공백도 provider 가 자르지 않는다', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonRes(200, { sub: 'u', email: 'e', name: '  김수학  ', displayName: 'psh', role: 'student', globalRole: 'user' })) as unknown as typeof fetch;

    expect((await new OsSsoAuthProvider().getSession())?.name).toBe('  김수학  ');
  });

  it('getSession: globalRole=admin → admin · parent·institution 은 그대로(학생으로 위장하지 않는다 — 계획 결정 ⑥)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'student', globalRole: 'admin' }))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'parent', globalRole: 'user' }))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'institution', globalRole: 'user' })) as unknown as typeof fetch;

    expect((await new OsSsoAuthProvider().getSession())?.role).toBe('admin');
    expect((await new OsSsoAuthProvider().getSession())?.role).toBe('parent');
    expect((await new OsSsoAuthProvider().getSession())?.role).toBe('institution');
  });

  it('mapRole: OS 역할 넷은 그대로, admin 이 우선, 낯선 값은 student(가장 좁은 화면)', () => {
    expect(mapRole('student', 'user')).toBe('student');
    expect(mapRole('teacher', 'user')).toBe('teacher');
    expect(mapRole('parent', 'user')).toBe('parent');
    expect(mapRole('institution', 'user')).toBe('institution');
    expect(mapRole('teacher', 'admin')).toBe('admin');
    expect(mapRole('unknown', 'user')).toBe('student');
  });

  it('getSession: 401 → null (미로그인) · lastFailure=unauthenticated', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(401, {})) as unknown as typeof fetch;
    const provider = new OsSsoAuthProvider();
    expect(await provider.getSession()).toBeNull();
    expect(provider.lastFailure).toBe('unauthenticated');
  });

  it('getSession: 네트워크 오류 → null (fail-closed) · lastFailure=unavailable — 비로그인으로 접지 않는다', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    const provider = new OsSsoAuthProvider();
    expect(await provider.getSession()).toBeNull();
    expect(provider.lastFailure).toBe('unavailable');
  });

  it('getSession: 5xx·그 밖의 비200 도 unavailable — CORS 미등록 dev 배포의 왕복을 막는 자리(리뷰 #350)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(503, {}))
      .mockResolvedValueOnce(jsonRes(200, { sub: 'u', email: 'e', displayName: 'd', role: 'student', globalRole: 'user' }))
      .mockResolvedValueOnce(jsonRes(401, {})) as unknown as typeof fetch;
    const provider = new OsSsoAuthProvider();

    expect(await provider.getSession()).toBeNull();
    expect(provider.lastFailure).toBe('unavailable');
    // 200 이 오면 실패 이유가 지워진다.
    expect((await provider.getSession())?.id).toBe('u');
    expect(provider.lastFailure).toBeNull();
    // 그 뒤 401 은 확정 비로그인.
    expect(await provider.getSession()).toBeNull();
    expect(provider.lastFailure).toBe('unauthenticated');
  });

  it('signOut 뒤의 null 은 비로그인이다 — unavailable 이 아니다', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonRes(200, { csrfToken: 'c' }))
      .mockResolvedValueOnce(jsonRes(204, {})) as unknown as typeof fetch;
    const provider = new OsSsoAuthProvider();
    await provider.signOut();
    expect(provider.lastFailure).toBe('unauthenticated');
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
