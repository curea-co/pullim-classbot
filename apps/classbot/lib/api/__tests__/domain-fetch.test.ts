/**
 * domain-fetch 헬퍼 — Ph7 코어 스토어 전환의 BE fetch/신원 규약 단위 테스트.
 * fetch 는 전부 jest mock (실 BE 불요).
 */
import { tokenManager, ApiError, BASE_URL } from '@pullim-classbot/api-client';
import {
  domainFetch,
  toDomainUserId,
  fromDomainUserId,
  demoStudentDomainId,
  DEMO_TEACHER_ID,
} from '../domain-fetch';

const fetchMock = jest.fn();

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  tokenManager.clearTokens();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('identity bridge (roster ↔ seed 도메인 id)', () => {
  it('maps demo roster me (s1) to seed domain id student_001 and back', () => {
    expect(toDomainUserId('s1')).toBe('student_001');
    expect(fromDomainUserId('student_001')).toBe('s1');
  });

  it('passes non-hero roster ids through unchanged (s2~s18 = seed 그대로)', () => {
    expect(toDomainUserId('s7')).toBe('s7');
    expect(fromDomainUserId('s7')).toBe('s7');
  });

  it('demoStudentDomainId resolves the demo fallback user to student_001', () => {
    expect(demoStudentDomainId()).toBe('student_001');
    expect(demoStudentDomainId('student_001')).toBe('student_001');
  });

  it('DEMO_TEACHER_ID matches the seed teacher (김수학)', () => {
    expect(DEMO_TEACHER_ID).toBe('teacher_001');
  });
});

describe('domainFetch — 미인증 데모 (x-user-id 폴백)', () => {
  it('sends x-user-id to the BE base URL and parses JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { bots: [] }));

    const result = await domainFetch<{ bots: unknown[] }>('/bots?role=student', {
      demoUserId: 'student_001',
    });

    expect(result).toEqual({ bots: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/bots?role=student`);
    expect((init.headers as Record<string, string>)['x-user-id']).toBe('student_001');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });

  it('serializes POST body as JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { botId: 'cb_001' }));

    await domainFetch('/enrollments', {
      method: 'POST',
      body: { code: 'MATH-2024' },
      demoUserId: 'student_001',
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ code: 'MATH-2024' }));
  });

  it('throws ApiError with the domain error envelope ({ error: { code, message } })', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: '유효하지 않은 참여 코드입니다.' } }),
    );

    await expect(
      domainFetch('/enrollments', { method: 'POST', body: { code: 'NOPE' }, demoUserId: 'student_001' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: '유효하지 않은 참여 코드입니다.',
    });
  });

  it('throws ApiError with HTTP status fallback when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    } as unknown as Response);

    const err = await domainFetch('/bots', { demoUserId: 'student_001' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, message: 'HTTP 502' });
  });
});

describe('domainFetch — 인증 사용자 (Bearer 경로)', () => {
  afterEach(() => tokenManager.clearTokens());

  it('sends Authorization Bearer via authRequest when an access token exists', async () => {
    tokenManager.setTokens('access-abc', 'refresh-def');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { assignments: [] }));

    const result = await domainFetch<{ assignments: unknown[] }>('/assignments?audience=student', {
      demoUserId: 'student_001',
    });

    expect(result).toEqual({ assignments: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/assignments?audience=student`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-abc');
    // 인증 경로에서는 x-user-id 폴백을 쓰지 않는다.
    expect((init.headers as Record<string, string>)['x-user-id']).toBeUndefined();
  });
});
