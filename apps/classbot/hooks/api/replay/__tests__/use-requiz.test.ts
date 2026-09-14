/**
 * requizRequest 단위 테스트 — pullim-api 정본 라우트(OS 쿠키 + CSRF) 재배선(ADR-066 ⑥).
 * fetch 는 jest mock. 검증:
 *  - POST `${API_BASE}/classbot/replay/:id/requiz` — credentials:'include' + X-CSRF-Token(body 없음)
 *  - 201 JSON → ReplayRequizResponse 파싱
 *  - 비-2xx(429/502/503) → throw (호출부 onError → fallbackMock 이 흡수)
 */
import { API_BASE } from '@/lib/auth/os-sso';
import { requizRequest } from '../use-requiz';
import type { ReplayRequizResponse } from '@pullim-classbot/types';

// CSRF 토큰 발급은 os-sso 가 소유 — 여기선 고정 토큰만 반환하도록 목.
jest.mock('@/lib/auth/os-sso', () => {
  const actual = jest.requireActual('@/lib/auth/os-sso');
  return {
    ...actual,
    fetchOsCsrfToken: jest.fn(async () => 'csrf-token-123'),
  };
});

const fetchMock = jest.fn();
const REQUIZ_URL = `${API_BASE}/classbot/replay/r-1/requiz`;

const mockResponse: ReplayRequizResponse = {
  replayId: 'r-1',
  attemptId: 'a-1',
  questions: [
    {
      stem: '다음 빈칸에 알맞은 것을 고르시오.',
      options: ['①', '②', '③', '④', '⑤'],
      answerIndex: 2,
      explanation: '해설입니다.',
      subjectLabel: '영어 · 빈칸 추론',
    },
  ],
  degraded: false,
  generatedAt: '2026-06-26T00:00:00.000Z',
};

function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

describe('requizRequest', () => {
  it('pullim-api 정본 라우트를 POST · OS 쿠키 · CSRF 헤더로 호출한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(201, mockResponse));

    await requizRequest('r-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(REQUIZ_URL);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers['X-CSRF-Token']).toBe('csrf-token-123');
    // 고정 데모 좌표는 BE 소유 — body 를 싣지 않는다.
    expect(init.body).toBeUndefined();
  });

  it('201 JSON 본문을 ReplayRequizResponse 로 파싱해 반환한다', async () => {
    fetchMock.mockResolvedValueOnce(jsonRes(201, mockResponse));

    const result = await requizRequest('r-1');

    expect(result).toEqual(mockResponse);
  });

  it.each([429, 502, 503, 500])('비-2xx(%s) 응답이면 throw 한다', async (status) => {
    fetchMock.mockResolvedValueOnce(jsonRes(status, { message: 'nope' }));

    await expect(requizRequest('r-1')).rejects.toThrow(/HTTP/);
  });
});
