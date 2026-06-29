// ============================================================================
// 풀림 OS SSO 연동 — 로그인 리다이렉트 URL 구성.
//
// 권위(SoT):
//  - 로그인 호스트·복귀 파라미터: pullim-web `src/app/login/LoginClient.tsx`
//    → 복귀 경로는 쿼리 키 **`next`** 로 전달한다(`params.get('next')`).
//      ⚠️ 플랫폼 관례는 `next` 다. (`redirect`/`returnTo` 아님 — OS 로그인이 `next` 만 읽음)
//  - 호스트 맵: pullim-api `.claude/rules/local-ports.md`(OS = os.pullim.local:3001).
//
// 클래스봇은 공통 헤더가 없으므로 로그인 진입을 자체적으로 이 헬퍼로 처리한다.
// ============================================================================

import { isSafeNextPath } from '@/lib/auth/safe-next';

/** env 미설정 시 로컬 SSO OS 호스트. */
const DEFAULT_OS_URL = 'http://os.pullim.local:3001';

/** env 미설정 시 로컬 SSO pullim-api 호스트(`.claude/rules/local-ports.md` — api.pullim.local:3000). */
const DEFAULT_API_BASE = 'http://api.pullim.local:3000';

/**
 * 풀림 OS base URL. Next 가 클라이언트 번들에 인라인하려면 **정적** 참조여야 한다
 * (api-client 의 NEXT_PUBLIC_API_URL 주석과 동일 이유 — 동적 우회는 치환 안 됨).
 */
export const OS_URL = process.env.NEXT_PUBLIC_OS_URL || DEFAULT_OS_URL;

/**
 * pullim-api base URL(OS SSO 모드). `/me`·`/auth/csrf`·`/auth/logout`·`/classbot/*` 호출 대상.
 * 플랫폼 위성 앱 관례(pullim-web)와 동일하게 `NEXT_PUBLIC_API_URL` 을 pullim-api base 로 쓴다
 * (글로벌 envelope·`/api` 프리픽스 없음 — 경로는 `/me` 처럼 루트 기준).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE;

/**
 * 풀림 OS 로그인 URL 을 만든다. 로그인 성공 후 `next` 경로로 복귀한다.
 *
 * @param next - 로그인 후 돌아올 내부 경로(예: `/classbot`). open-redirect 방지를 위해
 *   `isSafeNextPath` 를 통과한 동일 오리진 내부 경로만 `next` 로 부착한다. 안전하지 않으면
 *   `next` 없이 OS 로그인 루트로 보낸다(OS 가 기본 홈으로 처리).
 * @returns `${OS_URL}/login` 또는 `${OS_URL}/login?next=<encoded>`
 */
export function osLoginUrl(next: string): string {
  const base = `${OS_URL}/login`;
  if (!isSafeNextPath(next)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
