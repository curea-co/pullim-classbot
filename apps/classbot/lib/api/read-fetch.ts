/**
 * 도메인 읽기 fetch — 같은 오리진(Next.js route handler)을 친다.
 *
 * Phase 7 Stage 2: 학생 읽기 3면(`/api/bots`·`/api/assignments`·`/api/grades`)을
 * mock 폴백 없이 **인증 + 실DB** 로 소비하기 위한 client fetch.
 *
 * 왜 별도 헬퍼인가:
 *  - 이 읽기 라우트는 **classbot 앱 자신의 route handler**(같은 오리진, `/api/*`)다.
 *    따라서 base URL 을 붙이지 않고 상대 경로로 친다. (종전에는 base 가 classbot 자체
 *    BE(:4032)를 가리키던 `authRequest` 와 갈라야 해서 이 헬퍼가 따로 있었는데, 그
 *    래퍼는 걷혔다.)
 *  - 라우트 핸들러의 명의 판정은 `getCurrentUserIdFromRequest` 다.
 *  - 신원이 없으면 라우트가 401 을 준다 → `UnauthorizedReadError` 로 변환해 호출부가
 *    "로그인 필요" 상태로 게이트한다(mock 누수 없음 — D1 로그인월).
 *
 * ⚠️ **이 헬퍼는 지금 늘 게이트를 세운다.** `tokenManager` 에 값을 넣던 유일한 주체가
 * 걷힌 클래스봇 자체 로그인 폼이었고, OS SSO 세션은 HttpOnly 쿠키라 이 스토어를 쓰지
 * 않는다. 그래서 `getAccessToken()` 은 항상 null 이고 아래 선차단에 걸려 **서버에 가지
 * 않는다.** 라우트도 더는 `Authorization` 헤더를 보지 않는다(`lib/current-user.ts`).
 * 이 세 면(`/api/bots`·`/api/assignments`·`/api/grades`)을 실제로 열려면 읽기 경로를
 * 신원 쿠키 모델로 재배선해야 하고, 그건 **동작 변경**이라 별건이다.
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
