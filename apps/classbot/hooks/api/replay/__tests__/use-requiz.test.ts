import { authRequest } from '@pullim-classbot/api-client';
import { requizRequest } from '../use-requiz';
import type { ReplayRequizResponse } from '@pullim-classbot/types';

jest.mock('@pullim-classbot/api-client', () => ({
  authRequest: jest.fn(),
}));

const mockAuthRequest = authRequest as jest.MockedFunction<typeof authRequest>;

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

describe('requizRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authRequest를 올바른 endpoint와 method로 호출한다', async () => {
    mockAuthRequest.mockResolvedValueOnce(mockResponse);

    await requizRequest('r-1');

    expect(mockAuthRequest).toHaveBeenCalledWith('/replay/r-1/requiz', { method: 'POST' });
  });

  it('authRequest가 반환한 값을 그대로 반환한다', async () => {
    mockAuthRequest.mockResolvedValueOnce(mockResponse);

    const result = await requizRequest('r-1');

    expect(result).toEqual(mockResponse);
  });
});
