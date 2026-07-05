/**
 * domain-fetch — pullim-api classbot 정본 라우트 + OS 쿠키 인증 단위 테스트.
 * fetch 는 전부 jest mock (실 BE 불요). 검증: `${API_BASE}/classbot/*` 대상, credentials:'include',
 * 쓰기는 GET /auth/csrf 후 X-CSRF-Token 첨부, x-user-id·Authorization 미전송, 에러 봉투 파싱.
 */
import { renderHook } from '@testing-library/react';

// 가변 플래그 getter — useSyncUserId 의 ON/OFF 분기 검증용(replay-detail 패턴).
let _useRealCoreBE = false;
jest.mock('@/lib/features', () => ({
  get USE_REAL_CORE_BE() {
    return _useRealCoreBE;
  },
  get USE_REAL_REQUIZ_BE() {
    return false;
  },
}));

import { ApiError } from '@pullim-classbot/api-client';
import { API_BASE } from '@/lib/auth/os-sso';
import {
  domainFetch,
  currentSessionUserId,
  setDomainIdentitySnapshot,
  useSyncUserId,
} from '../domain-fetch';

const fetchMock = jest.fn();

/** classbot 정본 base(env 미설정 = 로컬 SSO api 호스트). */
const CLASSBOT_BASE = `${API_BASE}/classbot`;
const CSRF_URL = `${API_BASE}/auth/csrf`;

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  _useRealCoreBE = false;
  setDomainIdentitySnapshot(null);
});

/** domainFetch 계약(text() 파싱) 응답. */
function domainRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** CSRF 헬퍼 계약(json() 파싱) 응답. */
function csrfRes(token: string): Response {
  return { ok: true, status: 200, json: async () => ({ csrfToken: token }) } as unknown as Response;
}

describe('domainFetch — 읽기(GET): OS 쿠키, CSRF 없음', () => {
  it('hits ${API_BASE}/classbot/... with credentials include, no x-user-id / Authorization / CSRF', async () => {
    fetchMock.mockResolvedValueOnce(domainRes(200, [{ id: 'cb_001' }]));

    const result = await domainFetch<{ id: string }[]>('/bots?role=student');

    expect(result).toEqual([{ id: 'cb_001' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // read 는 CSRF 왕복 없음
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CLASSBOT_BASE}/bots?role=student`);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-CSRF-Token']).toBeUndefined();
    expect(init.body).toBeUndefined();
  });
});

describe('domainFetch — 쓰기(POST/PATCH): CSRF double-submit', () => {
  it('fetches /auth/csrf then POSTs with X-CSRF-Token + credentials include + JSON body', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfRes('csrf-xyz')) // GET /auth/csrf
      .mockResolvedValueOnce(domainRes(201, { membershipId: 'm1', classId: 'cb_001' })); // POST

    await domainFetch('/enrollments', { method: 'POST', body: { code: 'MATH-2024' } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // ① CSRF 발급
    const [csrfUrl, csrfInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(csrfUrl).toBe(CSRF_URL);
    expect(csrfInit.credentials).toBe('include');
    // ② 정본 write
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`${CLASSBOT_BASE}/enrollments`);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.body).toBe(JSON.stringify({ code: 'MATH-2024' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('csrf-xyz');
    expect(headers['x-user-id']).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
  });

  it('PATCH also attaches the CSRF token', async () => {
    fetchMock
      .mockResolvedValueOnce(csrfRes('csrf-abc'))
      .mockResolvedValueOnce(domainRes(200, { updated: 3 }));

    await domainFetch('/interventions/read-all', { method: 'PATCH' });

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('PATCH');
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-abc');
  });

  it('proceeds without X-CSRF-Token when CSRF issuance fails (fail-closed — 서버가 거부)', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as unknown as Response)
      .mockResolvedValueOnce(domainRes(201, {}));

    await domainFetch('/enrollments', { method: 'POST', body: { code: 'X' } });

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();
  });
});

describe('domainFetch — 에러 봉투', () => {
  it('throws ApiError from the spec envelope ({ error: { code, message } })', async () => {
    fetchMock.mockResolvedValueOnce(
      domainRes(404, { error: { code: 'NOT_FOUND', message: '유효하지 않은 참여 코드입니다.' } }),
    );

    await expect(domainFetch('/bots')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'NOT_FOUND',
      message: '유효하지 않은 참여 코드입니다.',
    });
  });

  it('throws ApiError from the NestJS default shape ({ statusCode, message })', async () => {
    fetchMock.mockResolvedValueOnce(domainRes(403, { statusCode: 403, message: 'Forbidden' }));

    const err = await domainFetch('/bots').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, message: 'Forbidden' });
  });

  it('falls back to HTTP status when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    } as unknown as Response);

    const err = await domainFetch('/bots').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, message: 'HTTP 502' });
  });
});

describe('세션 신원(로컬 필터·재동기화 키)', () => {
  it('currentSessionUserId: null without snapshot, raw sub after publish', () => {
    expect(currentSessionUserId()).toBeNull();
    setDomainIdentitySnapshot({ id: 'os-sub-1', email: 'a@b.c', role: 'teacher' });
    expect(currentSessionUserId()).toBe('os-sub-1');
    setDomainIdentitySnapshot(null);
    expect(currentSessionUserId()).toBeNull();
  });

  it('useSyncUserId: "" when flag OFF; session id / "anon" when flag ON', () => {
    // flag OFF — 상수 '' (신원 해석 비용 0)
    expect(renderHook(() => useSyncUserId()).result.current).toBe('');

    _useRealCoreBE = true;
    // flag ON + 미인증 → 'anon'
    expect(renderHook(() => useSyncUserId()).result.current).toBe('anon');
    // flag ON + 세션 → raw sub
    setDomainIdentitySnapshot({ id: 'os-sub-9', email: 'a@b.c', role: 'student' });
    expect(renderHook(() => useSyncUserId()).result.current).toBe('os-sub-9');
  });
});
