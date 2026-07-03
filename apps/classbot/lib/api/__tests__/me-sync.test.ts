/**
 * me/sync — SSO 세션 사용자 upsert 동기화 단위 테스트.
 * getter 모킹으로 플래그(USE_REAL_CORE_BE / OS_SSO_ENABLED)를 케이스별로 토글한다.
 * fetch 는 전부 jest mock (실 BE 불요).
 */
const mockFlags = { core: true, sso: true };

jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return mockFlags.core;
  },
  get USE_REAL_REQUIZ_BE() {
    return false;
  },
}));
jest.mock('@/lib/auth/auth-mode', () => ({
  get OS_SSO_ENABLED() {
    return mockFlags.sso;
  },
}));

import { BASE_URL } from '@pullim-classbot/api-client';
import { syncMeOnce, resetMeSyncForTests } from '../me-sync';

const fetchMock = jest.fn();

const OS_USER = {
  id: '5f0c9a2e-1111-4222-8333-444455556666',
  email: 'teacher@pullim.com',
  role: 'teacher',
  name: '김교사',
};

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  mockFlags.core = true;
  mockFlags.sso = true;
  resetMeSyncForTests();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('syncMeOnce — POST /me/sync (플래그 ON)', () => {
  it('x-user-id = OS sub 로 { name, role } 을 1회 전송한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await syncMeOnce(OS_USER);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/me/sync`);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: '김교사', role: 'teacher' }));
    expect((init.headers as Record<string, string>)['x-user-id']).toBe(OS_USER.id);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('성공 후 재호출은 dedup — fetch 는 1회뿐', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await syncMeOnce(OS_USER);
    await syncMeOnce(OS_USER);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('동시 2회 호출은 in-flight 공유로 여전히 1회 (refreshSession 경합)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await Promise.all([syncMeOnce(OS_USER), syncMeOnce(OS_USER)]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('다른 사용자는 각자 1회씩 sync 된다 (사용자당 dedup)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const other = { ...OS_USER, id: 'other-uuid', name: '박학생', role: 'student' };

    await syncMeOnce(OS_USER);
    await syncMeOnce(other);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ name: '박학생', role: 'student' }));
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('other-uuid');
  });

  it('name 이 없으면 email 로 폴백한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const noName = { id: 'nn-uuid', email: 'nn@pullim.com', role: 'student' };

    await syncMeOnce(noName);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ name: 'nn@pullim.com', role: 'student' }));
  });

  it('실패(HTTP 500)는 console.warn 후 무시 — throw 하지 않는다 (비차단)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { message: 'boom' } }));

    await expect(syncMeOnce(OS_USER)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('네트워크 오류도 console.warn 후 무시 — throw 하지 않는다', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(syncMeOnce(OS_USER)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('실패(HTTP 500) 후 다음 트리거는 재시도한다 — 성공 시에만 dedup 마킹', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, { error: { message: 'boom' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await syncMeOnce(OS_USER); // 실패 — 마킹되지 않아야 함
    await syncMeOnce(OS_USER); // 재시도 → 성공 — 이제 마킹
    await syncMeOnce(OS_USER); // dedup

    expect(fetchMock).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('네트워크 오류 후 다음 트리거도 재시도한다', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await syncMeOnce(OS_USER);
    await syncMeOnce(OS_USER);
    await syncMeOnce(OS_USER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('동시 2회가 실패해도 시도는 1회 공유 — 이후 트리거에서 재시도', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, { error: { message: 'boom' } }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await Promise.all([syncMeOnce(OS_USER), syncMeOnce(OS_USER)]); // in-flight 공유 → 1회 실패
    await syncMeOnce(OS_USER); // 재시도 → 성공

    expect(fetchMock).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});

describe('syncMeOnce — 플래그 게이트 (회귀 0)', () => {
  it('USE_REAL_CORE_BE OFF → 호출하지 않는다', async () => {
    mockFlags.core = false;

    await syncMeOnce(OS_USER);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('OS_SSO_ENABLED OFF → 호출하지 않는다', async () => {
    mockFlags.sso = false;

    await syncMeOnce(OS_USER);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
