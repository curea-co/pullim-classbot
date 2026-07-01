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

import { isSafeNext, isSafeNextPath } from '@/lib/auth/safe-next';

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
 * api-client 의 `NEXT_PUBLIC_API_URL`(= classbot BE base) 과는 **별개 변수**다. 둘이 충돌하지
 * 않도록 OS SSO/pullim-api base 는 전용 `NEXT_PUBLIC_OS_API_URL` 로 읽는다
 * (글로벌 envelope·`/api` 프리픽스 없음 — 경로는 `/me` 처럼 루트 기준).
 */
export const API_BASE = process.env.NEXT_PUBLIC_OS_API_URL || DEFAULT_API_BASE;

/**
 * 풀림 OS 로그인 URL 을 만든다. 로그인 성공 후 `next` 경로로 복귀한다.
 *
 * @param next - 로그인 후 돌아올 내부 경로(예: `/classbot`). open-redirect 방지를 위해
 *   `isSafeNextPath` 를 통과한 동일 오리진 내부 경로만 `next` 로 부착한다. 안전하지 않으면
 *   `next` 없이 OS 로그인 루트로 보낸다(OS 가 기본 홈으로 처리).
 * @returns `${OS_URL}/login` 또는 `${OS_URL}/login?next=<encoded>`
 */
export function osLoginUrl(next: string, selfOrigin?: string): string {
  return osAuthUrl('/login', next, selfOrigin);
}

/**
 * 풀림 OS 회원가입 URL 을 만든다. 회원가입 진입은 OS 로그인이 아니라 OS **회원가입**으로 위임한다
 * (학생 단독 가입 등 가입 플로우 보존). 복귀 규약은 osLoginUrl 과 동일(`next`).
 * @param next - 가입 후 돌아올 내부 경로
 * @returns `${OS_URL}/signup` 또는 `${OS_URL}/signup?next=<encoded>`
 */
export function osSignupUrl(next: string, selfOrigin?: string): string {
  return osAuthUrl('/signup', next, selfOrigin);
}

/**
 * OS 인증 진입 URL(`/login`·`/signup`)에 안전 검증한 `next` 를 부착한다.
 * `next` 는 내부 경로이거나, `selfOrigin` 이 주어지면 그 오리진의 절대 URL 일 수 있다(cross-host 복귀).
 */
function osAuthUrl(path: '/login' | '/signup', next: string, selfOrigin?: string): string {
  const base = `${OS_URL}${path}`;
  if (!isSafeNext(next, selfOrigin)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/** URL 문자열의 오리진을 안전하게 추출한다(파싱 실패 시 null). */
function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * B-7 — OS 로그인 후 앱으로 복귀할 `next` 대상을 결정한다.
 *
 * OS 가 앱과 **동일 오리진**이면 내부 경로(`/classbot`)로 충분하다(기존 동작 유지).
 * OS 가 앱과 **다른 오리진**(cross-host, 예: Dev `dev-os` ↔ `dev-classbot`)이면, OS 의 `next`
 * 상대경로 해석이 OS 자신을 가리켜 복귀가 깨지므로, 앱 오리진 기준 **절대 URL** 로 승격한다.
 * (승격된 절대 URL 은 `osLoginUrl(target, appOrigin)` 의 `selfOrigin` 가드를 통과하며, OS 측은
 *  별도로 `REDIRECT_HOST_ALLOWLIST` 에 앱 호스트를 등록해야 한다 — 블로커 B-8.)
 *
 * @param nextPath - 복귀할 내부 경로(예: `window.location.pathname + search`)
 * @param appOrigin - 앱 자신의 오리진(예: `window.location.origin`)
 * @returns 동일 오리진이면 `nextPath`, cross-host 이면 `${appOrigin}${nextPath}`.
 *   `nextPath` 가 안전한 내부 경로가 아니면 승격 없이 그대로 반환(부착 단계에서 드롭됨).
 */
export function resolveReturnTarget(nextPath: string, appOrigin: string): string {
  if (!isSafeNextPath(nextPath)) return nextPath;
  const osOrigin = safeOrigin(OS_URL);
  if (osOrigin && appOrigin && osOrigin !== appOrigin) {
    return `${appOrigin}${nextPath}`;
  }
  return nextPath;
}
