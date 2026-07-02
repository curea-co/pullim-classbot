/**
 * 도메인 라우트 요청 사용자 해석 — spec §3 · §6.1 과도기 규약.
 *
 * JWT 인증 사용자(request.user, 전역 JwtAuthGuard/OptionalJwtAuthGuard 가 주입)가
 * 있으면 그 id 를 쓰고, 없으면 `x-user-id` 헤더로 폴백한다.
 *
 * 둘 다 없으면 undefined — 호출부(service)가 **401 로 거부**한다. 원본 spec §3
 * 의 무신원 mock 폴백(student_001/teacher_001)은 M2 개정
 * `proc/spec/2026-07-03_be-api-m2-amendment.md` §3 으로 **폐지**됨 — 익명
 * 쓰기가 고정 mock 신원으로 기록되는 보안 구멍 차단(실출시 전제).
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
