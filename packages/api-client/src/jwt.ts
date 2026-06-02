// ============================================================================
// JWT 페이로드 디코딩 (검증 X — 서명 검증은 BE 책임).
// classbot BE 에는 `/user/me` 가 없으므로, FE 세션 사용자 정보는
// access token 의 claim(sub/email/role)에서 파생한다.
// ============================================================================

import type { AccessTokenPayload } from "@pullim-classbot/types";

/** base64url → 문자열 (브라우저/Node 양쪽 안전). */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    // 브라우저/엣지: UTF-8 멀티바이트(한글 이름 등) 복원.
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Node(SSR) 경로 — Buffer 전역을 타입 의존 없이 접근.
  const nodeBuffer = (globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } } })
    .Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(padded, "base64").toString("utf-8");
  }
  return "";
}

/**
 * Access Token 의 페이로드를 디코딩한다. 검증은 하지 않는다.
 * @param token - JWT access token
 * @returns 페이로드 또는 파싱 실패 시 null
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as AccessTokenPayload;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * 토큰이 만료되었는지(또는 곧 만료될지) 확인한다.
 * @param token - JWT access token
 * @param skewSeconds - 만료 직전 여유 (기본 30초)
 * @returns 만료/곧 만료면 true
 */
export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeAccessToken(token);
  if (!payload?.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - skewSeconds <= nowSeconds;
}

// 서버 전용 서명 검증은 node:crypto 를 정적 import 하므로 별도 모듈(jwt-verify.ts)로
// 분리한다(브라우저 번들에 node:crypto 가 섞이지 않도록). 그쪽에서 base64UrlDecode 재사용.
export { base64UrlDecode };
