const fetchOsCsrfTokenMock = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  fetchOsCsrfToken: (...args: unknown[]) => fetchOsCsrfTokenMock(...args),
}));

import { fetchWithOsCsrfRecovery } from '../csrf-fetch';

function response(status: number, body: unknown): Response {
  const value = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
  return { ...value, clone: () => value } as unknown as Response;
}

describe('fetchWithOsCsrfRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchOsCsrfTokenMock.mockResolvedValueOnce('stale').mockResolvedValueOnce('canonical');
  });

  it('CSRF_TOKEN_MISMATCH만 bootstrap 후 원 요청을 정확히 한 번 재시도한다', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response(403, { code: 'CSRF_TOKEN_MISMATCH' }))
      .mockResolvedValueOnce(response(201, { ok: true }));

    const result = await fetchWithOsCsrfRecovery('https://api/classbot/write', { method: 'POST' });

    expect(result.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(fetchOsCsrfTokenMock).toHaveBeenNthCalledWith(2, { force: true });
    expect((global.fetch as jest.Mock).mock.calls[1][1].headers['X-CSRF-Token']).toBe('canonical');
  });

  it.each(['FORBIDDEN', 'CSRF_ORIGIN_REJECTED'])(
    '%s 403은 retry하지 않는다',
    async (code) => {
      global.fetch = jest.fn().mockResolvedValue(response(403, { code }));

      const result = await fetchWithOsCsrfRecovery('https://api/classbot/write', { method: 'POST' });

      expect(result.status).toBe(403);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(fetchOsCsrfTokenMock).toHaveBeenCalledTimes(1);
    },
  );
});
