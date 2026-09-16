/**
 * 비로그인이 들어올 수 있는 경로 — 목록이 곧 정책이다.
 *
 * 2026-09-16 계획 §10 결정 ②: 「소개(`/classbot/onboarding`)·랜딩만 공개. 나머지 학생·교사
 * 화면은 비로그인이면 `redirectToOsLogin()`」. `proc/spec/05-business-rules.md § 11.2` 가 그 정책의
 * 자리다. RoleGuard(`components/features/auth/role-guard.tsx`)가 이 목록으로 갈라 세운다.
 *
 * 여기 없는 경로는 전부 코어 화면이다 — 새 공개 화면은 이 목록에 **더해서** 연다. 가드 쪽에
 * 예외를 따로 적지 않는다(두 곳이 갈리면 어느 쪽이 정책인지 알 수 없어진다).
 */

/**
 * 학부모·기관 안내 한 장 — `app/(public)/classbot/role-notice/page.tsx`.
 * 어느 셸에도 속하지 않아 가드를 지나지 않지만, 「공개 경로」의 뜻을 한 목록에 두려고 함께 적는다.
 */
export const ROLE_NOTICE_PATH = '/classbot/role-notice';

/** 비로그인 통과 경로. 하위 경로(`/classbot/onboarding/...`)도 함께 연다. */
export const PUBLIC_PATHS: readonly string[] = ['/classbot/onboarding', ROLE_NOTICE_PATH];

/**
 * 이 경로가 비로그인에게도 열려 있는가.
 * @param pathname - `usePathname()` 값(SSR·테스트에서 null 일 수 있다)
 * @returns 공개 경로이거나 그 하위면 true. 모르면(null) false — 닫히는 쪽으로 접는다.
 */
export function isPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
