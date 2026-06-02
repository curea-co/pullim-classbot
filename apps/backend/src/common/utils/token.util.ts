/** JWT 디코드 결과에서 우리가 사용하는 필드. */
export interface DecodedTokenPayload {
  jti?: unknown;
  exp?: unknown;
}

/**
 * 디코드된 JWT 페이로드에서 jti 와 만료 시각을 추출한다.
 * 블랙리스트 등록 시 사용한다(서명 검증은 Guard 가 이미 수행하므로 디코드만 필요).
 * 디코드 자체는 호출부에서 JwtService.decode 로 수행한 결과를 넘긴다.
 * @param payload - JwtService.decode 결과
 * @returns jti 와 만료 시각(Date). exp 가 없으면 즉시 만료로 간주.
 * @throws {Error} jti 가 없는 경우
 */
export function extractJtiAndExpiry(payload: DecodedTokenPayload | null): {
  jti: string;
  expiresAt: Date;
} {
  if (!payload || typeof payload.jti !== "string") {
    throw new Error("토큰에서 jti 를 추출할 수 없습니다");
  }
  const expSeconds = typeof payload.exp === "number" ? payload.exp : 0;
  return {
    jti: payload.jti,
    expiresAt: new Date(expSeconds * 1000),
  };
}
