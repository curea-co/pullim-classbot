// ============================================================================
// @pullim-classbot/api-client — 같은 오리진 `/api/*` 호출의 공용 조각.
//
// 종전에는 classbot 자체 BE(:4032)의 `/api/auth/*` 를 치는 fetch 래퍼였다. 그 인증은
// 폐기됐다 — 인가는 pullim-os·pullim-api 가 쥐고, 클래스봇 코어 루프의 정본 표면은
// `api.pullim.ai/classbot/*`(`apps/classbot/lib/api/domain-fetch.ts`)다.
// 그래서 base URL(`NEXT_PUBLIC_API_URL`)과 토큰 첨부·401 refresh 경로가 함께 걷혔다.
//
// 남은 것은 둘뿐이다:
//  - `ApiError` — 도메인 fetch·스토어가 공유하는 에러 타입
//  - `tokenManager` — 쿠키 기반 토큰 스토어
//
// ⚠️ `tokenManager` 는 지금 **읽는 곳만 있고 넣는 곳이 없다.** 값을 넣던 유일한 주체가
// 걷힌 로그인 폼이었다(OS SSO 세션은 HttpOnly 쿠키라 이 스토어를 쓰지 않는다). 즉
// `getAccessToken()` 은 항상 null 이고, `lib/api/read-fetch.ts` 의 읽기 게이트는 늘
// 닫혀 있다 — 이건 이 파일이 만든 상태가 아니라 **원래 그랬던 것**이다. 걷어내려면
// 읽기 경로를 쿠키 신원 모델로 재배선해야 하고 그건 동작 변경이라 별건이다.
// ============================================================================

/** API 에러. 서버 에러 응답의 message/status/code 를 담는다. */
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
export type * from "@pullim-classbot/types";
