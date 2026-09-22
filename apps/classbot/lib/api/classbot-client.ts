/**
 * classbot 정본 훅들의 공용 조각 — 401 처리와 재시도 규칙.
 *
 * `lib/api/domain-fetch.ts` 는 순수 transport 라 상태 코드를 뜻으로 바꾸지 않는다. 화면 훅이
 * 공통으로 필요한 것은 둘이다:
 *  - **401 → OS 로그인.** 코어 화면은 RoleGuard 가 비로그인을 이미 막지만
 *    (`proc/spec/05-business-rules.md § 11.2`), 화면을 보는 도중 세션이 끊기면 다음 요청이 401 로
 *    돌아온다. 그때 에러 카드가 아니라 로그인으로 보낸다 — `redirectToOsLogin` 이 현재 위치를
 *    `next` 로 실어 복귀시킨다. 오류는 그대로 다시 던져 호출부의 `isUnauthenticated` 판정도 선다.
 *  - **4xx 는 다시 보내도 같은 답이다.** 5xx·네트워크만 한 번 더.
 *
 * 문은 둘이다 — `classbotRead`(GET) · `classbotWrite`(POST · PUT · PATCH — 메서드 인자로 가른다 · 본문 없는 문은 `undefined`).
 *
 * 같은 오리진 `/api/*` 를 치는 `lib/api/client-fetch.ts` 와 짝이 되는 자리다 — 그쪽 오류는
 * `ApiClientError`, 이쪽은 `@pullim-classbot/api-client` 의 `ApiError` 다. 두 타입을 섞어 판정하지 마라.
 */

import { ApiError } from '@pullim-classbot/api-client';

import { domainFetch, domainFetchWithStatus } from '@/lib/api/domain-fetch';
import { redirectToOsLogin } from '@/lib/auth/os-sso';

/** 오류의 HTTP 상태 — `ApiError` 가 아니면 null(네트워크 등). */
export function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

/** 401 인가 — 세션이 없거나 끊겼다. */
export function isUnauthorized(error: unknown): boolean {
  return statusOf(error) === 401;
}

/** 404 인가 — 내가 볼 수 있는 것 중에 없다(남의 반도 404 로 온다 — 계획 §05). */
export function isNotFound(error: unknown): boolean {
  return statusOf(error) === 404;
}

/**
 * react-query `retry` — 4xx 는 재시도하지 않는다(같은 답). 5xx·네트워크만 한 번 더.
 * @param failureCount - 지금까지 실패 횟수
 * @param error - 마지막 오류
 * @returns 다시 보낼지
 */
export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  const status = statusOf(error);
  if (status !== null && status < 500) return false;
  return failureCount < 1;
}

/** 401 이면 OS 로그인으로 보내고, 어느 경우든 오류는 그대로 다시 던진다. */
function rethrowAfterLoginRedirect(error: unknown): never {
  if (isUnauthorized(error)) redirectToOsLogin();
  throw error;
}

/**
 * 정본 읽기(GET) — `domainFetch` + 401 로그인 유도.
 * @param path - `/assignments?audience=student` 같은 `/classbot` 상대 경로
 * @returns 파싱된 JSON 본문
 * @throws {ApiError} 비정상 응답(401 이면 리다이렉트를 건 뒤에 던진다)
 */
export async function classbotRead<T>(path: string): Promise<T> {
  try {
    return await domainFetch<T>(path);
  } catch (error) {
    return rethrowAfterLoginRedirect(error);
  }
}

/** 정본이 쓰기로 쓰는 메서드 셋 — 전부 `CsrfGuard` 를 지난다(`domain-fetch.ts` `CSRF_METHODS`). */
export type ClassbotWriteMethod = 'POST' | 'PUT' | 'PATCH';

/**
 * 정본 쓰기 — CSRF 는 `domainFetch` 가 붙인다. 상태 코드를 함께 돌려준다 —
 * 참여(`201` 새로 들어옴 · `200` 이미 멤버)처럼 **같은 본문에 뜻이 다른 코드**가 오는 문이 있어서다.
 *
 * 기본은 POST 다. `PUT` 은 봇 할당(`PUT /classes/:classId/bot` — 전체 교체·멱등·null 해제),
 * `PATCH` 는 봇 부분 수정(`PATCH /bots/:id` — `undefined` 그대로·`null` 비움)과 신호 확인
 * (`PATCH /signals/:id/ack` — 본문 없음, 서버가 시각·주체를 정한다)이 쓴다(api.md § 3.5b · § 3.9).
 * @param path - `/enrollments` 같은 `/classbot` 상대 경로
 * @param body - JSON 본문(`undefined` 면 보내지 않는다 — 본문 없는 문)
 * @param method - 쓰기 메서드. @default 'POST'
 * @returns `{ status, body }`
 * @throws {ApiError} 비정상 응답(401 이면 리다이렉트를 건 뒤에 던진다)
 */
export async function classbotWrite<T>(
  path: string,
  body?: unknown,
  method: ClassbotWriteMethod = 'POST',
): Promise<{ status: number; body: T }> {
  try {
    return await domainFetchWithStatus<T>(path, { method, body });
  } catch (error) {
    return rethrowAfterLoginRedirect(error);
  }
}

