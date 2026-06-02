// ============================================================================
// 서버 전용 — JWT 서명 검증(HS256). 신원·역할 판정에 토큰을 신뢰하기 전에 반드시 호출.
//
// BE(@nestjs/jwt 기본값)는 HS256 + 문자열 secret 으로 서명한다. FE route handler 는
// 같은 secret 으로 HMAC-SHA256 서명을 재계산해 위조(self-signed)·변조 토큰을 거부한다.
// node:crypto 를 정적 import 하므로 **Node 런타임(route handler)에서만** 사용한다.
// (브라우저 표시용 비검증 디코드는 ./jwt 의 decodeAccessToken 을 쓴다.)
// ============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";

import type { AccessTokenPayload } from "@pullim-classbot/types";

import { base64UrlDecode } from "./jwt";

/** base64url → Uint8Array(서명 바이트 비교용). */
function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const nodeBuffer = (
    globalThis as { Buffer?: { from(s: string, e: string): Uint8Array } }
  ).Buffer;
  if (nodeBuffer) return nodeBuffer.from(padded, "base64");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Access Token 의 **서명(HS256)** 을 검증하고, 유효하면 페이로드를 반환한다.
 *
 * 검증 항목(하나라도 실패하면 null):
 *  1) 형식(3 파트)
 *  2) 헤더 alg === 'HS256' (alg=none / 비대칭 키 위조 방지)
 *  3) HMAC-SHA256 서명 일치(상수시간 비교)
 *  4) 필수 클레임(sub/role) 존재
 *  5) type === 'access'
 *  6) 만료(exp) 전
 *
 * 서명 검증 없이 디코드만 하는 `decodeAccessToken` 과 달리, 신원·역할을 신뢰해야 하는
 * 서버 write/RBAC 경로에서 사용한다.
 *
 * @param token - JWT access token
 * @param secret - BE 와 공유하는 JWT 서명 secret(JWT_SECRET)
 * @returns 검증 통과 시 페이로드, 아니면 null
 */
export function verifyAccessToken(
  token: string,
  secret: string,
): AccessTokenPayload | null {
  if (!secret) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const header = JSON.parse(base64UrlDecode(encodedHeader)) as {
      alg?: string;
    };
    if (header.alg !== "HS256") return null;

    const expected = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actual = base64UrlToBytes(encodedSignature);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as AccessTokenPayload;
    if (!payload.sub || !payload.role) return null;
    if (payload.type !== "access") return null;
    if (typeof payload.exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) return null;
    }
    return payload;
  } catch {
    return null;
  }
}
