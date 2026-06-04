/**
 * 도메인 읽기 fetch — 같은 오리진(Next.js route handler)을 친다.
 *
 * Phase 7 Stage 2: 학생 읽기 4면(`/api/bots`·`/api/assignments`·`/api/grades`·
 * `/api/wellness`)을 mock 폴백 없이 **인증 + 실DB** 로 소비하기 위한 client fetch.
 *
 * 왜 별도 헬퍼인가:
 *  - `@pullim-classbot/api-client` 의 `authRequest` 는 base URL 이 NestJS BE(:4032)라
 *    그쪽으로 보낸다. 그러나 위 읽기 라우트는 **classbot 앱 자신의 route handler**
 *    (같은 오리진, `/api/*`)다. 따라서 base 를 붙이지 않고 상대 경로로 친다.
 *  - 라우트 핸들러는 `Authorization: Bearer <access>` 의 JWT 를 서명 검증해 명의를
 *    판정한다(`getCurrentUserIdFromRequest`). 토큰은 `tokenManager`(쿠키)에서 읽는다.
 *  - 미로그인(토큰 없음)·만료 시 라우트가 401 을 준다 → `UnauthorizedReadError` 로
 *    변환해 호출부가 "로그인 필요" 상태로 게이트한다(mock 누수 없음 — D1 로그인월).
 */

import { tokenManager } from '@pullim-classbot/api-client/token-manager';

/** 읽기 인증 실패(401) — 호출부가 로그인 게이트로 처리한다. */
export class UnauthorizedReadError extends Error {
  constructor(message = '로그인이 필요합니다.') {
    super(message);
    this.name = 'UnauthorizedReadError';
  }
}

/** 그 외 읽기 실패(네트워크/5xx 등). */
export class ReadError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ReadError';
  }
}

/**
 * 같은 오리진 도메인 읽기 API 를 인증 헤더와 함께 호출한다.
 *
 * @param path - `/api/...` 같은 오리진 상대 경로
 * @returns 파싱된 JSON 본문
 * @throws {UnauthorizedReadError} 토큰이 없거나 401 일 때
 * @throws {ReadError} 그 외 비정상 응답
 */
export async function domainRead<T>(path: string): Promise<T> {
  const accessToken = tokenManager.getAccessToken();
  // 토큰이 없으면 서버 왕복 없이 바로 게이트(로그인월). 라우트도 401 을 주지만 선차단.
  if (!accessToken) {
    throw new UnauthorizedReadError();
  }

  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
    // 인증 라우트라 캐시 금지.
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new UnauthorizedReadError();
  }
  if (!res.ok) {
    throw new ReadError(`읽기 요청 실패 (HTTP ${res.status})`, res.status);
  }

  return (await res.json()) as T;
}
