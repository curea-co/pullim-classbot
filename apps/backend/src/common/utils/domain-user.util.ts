/**
 * 도메인 라우트 요청 사용자 해석 — spec §3 · §6.1 과도기 규약.
 *
 * JWT 인증 사용자(request.user, 전역 JwtAuthGuard/OptionalJwtAuthGuard 가 주입)가
 * 있으면 그 id 를 쓰고, 없으면 `x-user-id` 헤더로 폴백한다.
 *
 * ⚠ Ph7 정리 대상: FE 의 mock→fetch 교체 + 도메인 라우트 JWT 가드 전면 적용이
 * 끝나면 x-user-id 헤더 폴백은 제거해야 한다 (spec §6.1 비고).
 */

/** 해석에 필요한 최소 요청 형태 (express Request 부분집합). */
export interface DomainUserRequest {
  user?: unknown;
  headers: Record<string, unknown>;
}

/**
 * 요청에서 도메인 사용자 id 를 해석한다.
 * @param request - express 요청(부분집합)
 * @returns JWT 사용자 id → x-user-id 헤더 순. 둘 다 없으면 undefined
 */
export function resolveDomainUserId(
  request: DomainUserRequest,
): string | undefined {
  const user = request.user as { id?: unknown } | undefined;
  if (user && typeof user.id === "string" && user.id.length > 0) {
    return user.id;
  }

  const raw = request.headers["x-user-id"];
  const value = Array.isArray(raw) ? (raw[0] as unknown) : raw;
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}
