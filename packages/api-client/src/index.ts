// ============================================================================
// @pullim-classbot/api-client — FE → classbot BE(/api/auth/*) fetch 래퍼.
//
// 본체 pullim api-client 패턴을 차용하되 classbot BE 의 실제 계약에 맞춘다:
//  - classbot BE 는 응답 envelope({ success, data })가 없다 → raw 응답을 그대로 사용.
//  - 에러는 NestJS 기본 형태({ statusCode, message, error }).
//  - base URL 은 env(NEXT_PUBLIC_API_URL), 기본 http://localhost:4032/api.
// ============================================================================

/** classbot BE base URL. env 미설정 시 로컬 BE(:4032). */
export const BASE_URL = resolveBaseUrl();

function resolveBaseUrl(): string {
  // process 전역을 타입 의존 없이 접근 (Next 가 NEXT_PUBLIC_API_URL 을 인라인).
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.NEXT_PUBLIC_API_URL || "http://localhost:4032/api";
}

/** API 에러. NestJS 에러 응답의 message/statusCode/code 를 담는다. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export { tokenManager } from "./token-manager";
export { authRequest, publicRequest } from "./auth-fetch";
export { decodeAccessToken, isAccessTokenExpired } from "./jwt";
export * from "./auth-api";
export type * from "@pullim-classbot/types";
