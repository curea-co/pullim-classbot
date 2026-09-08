import { fetchOsCsrfToken } from '../os-sso';

describe('fetchOsCsrfToken single-flight', () => {
  it('동시 bootstrap은 하나의 /auth/csrf 요청을 공유한다', async () => {
    let resolveFetch!: (response: Response) => void;
    global.fetch = jest.fn(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );

    const first = fetchOsCsrfToken({ force: true });
    const second = fetchOsCsrfToken({ force: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: true, json: async () => ({ csrfToken: 'canonical' }) } as Response);
    await expect(Promise.all([first, second])).resolves.toEqual(['canonical', 'canonical']);
  });
});
