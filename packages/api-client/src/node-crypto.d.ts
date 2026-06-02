/**
 * node:crypto 최소 앰비언트 타입.
 * api-client 는 브라우저 타깃이라 @types/node 를 의존하지 않는다(tsconfig lib=DOM).
 * 서버 전용 jwt-verify.ts 가 HS256 검증에 쓰는 API 만 선언한다.
 */
declare module "node:crypto" {
  interface Hmac {
    update(data: string): Hmac;
    digest(): Uint8Array;
  }
  export function createHmac(algorithm: string, key: string): Hmac;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}
