/**
 * 같은 오리진 도메인 API fetch — 수업방·참여 코드·과제 라우트 전용.
 *
 * `lib/api/read-fetch.ts` 와 무엇이 다른가:
 *  - read-fetch 는 **토큰이 없으면 서버에 가 보지도 않고** 로그인 게이트를 세운다.
 *    그건 학생 읽기 3면의 「로그인월」 규약이라 맞다.
 *  - 이 헬퍼는 그렇게 하지 않는다. 로컬 개발 신원은 **쿠키**로 오고 토큰이 없기 때문이다.
 *    쿠키는 같은 오리진 요청에 자동으로 실리므로, 토큰이 없어도 일단 보내고 **서버가**
 *    401 인지 아닌지 판단하게 둔다. 진짜 토큰이 있으면 `Authorization` 헤더도 같이 실는다.
 *  - 토큰 접근자는 read-fetch 와 **같은 것**(`tokenManager`)을 쓴다 — 저장 위치를 두 벌로
 *    나누면 한쪽만 로그아웃되는 상태가 생긴다.
 *
 * 오류는 서버가 준 `{ message, code }` 를 그대로 실어 던진다 — 화면이 우리말 문구를
 * 그대로 보여줄 수 있어야 하기 때문이다.
 */

import { tokenManager } from '@pullim-classbot/api-client/token-manager';

/** 서버가 준 오류 봉투 — 화면이 code 로 분기하고 message 를 그대로 보여준다. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    /** HTTP 상태. */
    public readonly status: number,
    /** 계약 §4 의 오류 코드(AUTH_REQUIRED · FORBIDDEN · INVALID_INPUT · NOT_FOUND · CONFLICT). */
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** 응답 본문에서 기대하는 오류 모양. */
interface ErrorBody {
  message?: unknown;
  code?: unknown;
}

/** 상태 코드별 기본 문구 — 서버가 본문을 못 준 경우(네트워크 중간 장애 등)의 대비. */
function fallbackMessage(status: number): string {
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '권한이 없어요.';
  if (status === 404) return '찾을 수 없어요.';
  if (status === 409) return '지금은 처리할 수 없어요.';
  return `요청에 실패했어요 (HTTP ${status})`;
}

/** 요청 옵션 — 본문은 객체로 주면 JSON 으로 직렬화한다. */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/**
 * 같은 오리진 `/api/*` 라우트를 친다.
 *
 * @param path - `/api/...` 상대 경로
 * @param options - 메서드·본문
 * @returns 파싱된 JSON 본문
 * @throws {ApiClientError} 2xx 가 아닐 때(서버 문구·코드를 그대로 실어서)
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  // 진짜 세션 토큰이 있으면 붙인다. 없으면 안 붙인다 — dev 신원 쿠키가 대신 간다.
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const hasBody = options.body !== undefined;
  if (hasBody) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    // 신원 쿠키가 실려야 한다(같은 오리진이라 기본값이지만 뜻을 못박는다).
    credentials: 'same-origin',
    // 신원에 매인 응답이라 캐시 금지.
    cache: 'no-store',
  });

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      // 본문이 JSON 이 아니면 기본 문구로 간다.
    }
    const message =
      typeof body.message === 'string' && body.message
        ? body.message
        : fallbackMessage(res.status);
    const code = typeof body.code === 'string' && body.code ? body.code : 'UNKNOWN';
    throw new ApiClientError(message, res.status, code);
  }

  // 204 처럼 본문이 없는 응답도 안전하게 통과시킨다.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** GET 단축 — `apiRequest` 와 같다. */
export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

/** POST 단축 — 본문을 JSON 으로 보낸다. */
export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: body ?? {} });
}

/** DELETE 단축 — 본문 없이 보낸다(자원을 끄는 라우트가 쓴다). */
export function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
