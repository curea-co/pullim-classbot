// ============================================================================
// @pullim-classbot/api-client — FE → classbot BE(/api/auth/*) fetch 래퍼.
//
// 본체 pullim api-client 패턴을 차용하되 classbot BE 의 실제 계약에 맞춘다:
//  - classbot BE 는 응답 envelope({ success, data })가 없다 → raw 응답을 그대로 사용.
//  - 에러는 NestJS 기본 형태({ statusCode, message, error }).
//  - base URL 은 env(NEXT_PUBLIC_API_URL), 기본 http://localhost:4032/api.
// ============================================================================

/** env 미설정 시 로컬 BE(:4032). */
const DEFAULT_BASE_URL = "http://localhost:4032/api";

// Next.js 는 클라이언트 번들에 NEXT_PUBLIC_* 를 인라인할 때 **정적**
// `process.env.NEXT_PUBLIC_API_URL` 참조만 치환한다. globalThis.process 같은 동적 우회는
// 치환 대상이 아니어서 브라우저에서 항상 undefined → BASE_URL 이 localhost 로 고정되고
// 비로컬(프로드/프리뷰) 환경에서 로그인/회원가입/refresh 가 전부 사용자 localhost 로 새어 실패한다.
// 따라서 정적 참조를 쓴다. (@types/node 미의존이라 process 를 최소 ambient 로 선언해 typecheck 통과.)
declare const process: { env: Record<string, string | undefined> };

/** classbot BE base URL. env 미설정 시 로컬 BE(:4032). */
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_BASE_URL;

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
