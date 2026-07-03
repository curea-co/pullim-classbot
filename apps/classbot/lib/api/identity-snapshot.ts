/**
 * 도메인 신원 스냅샷 (모듈 레벨, 의존성 없는 leaf) — auth-context ↔ domain-fetch 배선.
 *
 * OS SSO 세션은 HttpOnly 쿠키라 domain-fetch 가 토큰을 직접 읽을 수 없다. auth-context 가
 * provider `onAuthStateChange` 로 받은 세션 사용자를 여기 publish 하면, domain-fetch 가
 * React 컨텍스트 밖(스토어 액션·sync 훅)에서도 세션 신원을 판정한다.
 *
 * **왜 별도 모듈인가**: auth-context 가 domain-fetch 를 직접 import 하면
 * domain-fetch → current-user → auth-context 기존 체인과 순환(cycle)이 생긴다.
 * 스냅샷을 leaf 로 분리해 양쪽이 여기만 바라보게 한다.
 */

/**
 * 스냅샷 사용자의 최소 형태 — `AuthUser`({ id, email, role }) 가 그대로 대입 가능하도록
 * 구조적으로 느슨하게 둔다. `name` 은 OS `/me` 의 displayName(OsSsoAuthProvider 가 동봉)
 * — me/sync 표시명(없으면 email 폴백)에 쓰인다.
 */
export interface SsoIdentityUser {
  /** OS 세션 sub (raw uuid) — `x-user-id` 명의. */
  id: string;
  email: string;
  /** student|teacher|admin — me/sync body 의 role. */
  role: string;
  /** OS `/me` displayName. */
  name?: string;
}

let sessionUser: SsoIdentityUser | null = null;

/** 스냅샷 변경 구독자 — useStudentSyncUserId 재동기화 트리거용. */
const listeners = new Set<() => void>();

/**
 * auth-context → domain-fetch 세션 사용자 publish (얇은 배선).
 * 로그인/세션 복원 시 AuthUser, 로그아웃 시 null. publish 자체는 인증 모드와 무관하게
 * 항상 안전하다 — SSO 분기는 소비 측(domain-fetch)이 `OS_SSO_ENABLED` 로 게이트한다.
 * @param user - 세션 사용자 (미로그인 null)
 */
export function setDomainIdentitySnapshot(user: SsoIdentityUser | null): void {
  sessionUser = user;
  for (const listener of listeners) listener();
}

/** 현재 스냅샷 (비훅) — domain-fetch 신원 판정용. */
export function peekDomainIdentitySnapshot(): SsoIdentityUser | null {
  return sessionUser;
}

/**
 * 스냅샷 변경 구독 — useSyncExternalStore subscribe 어댑터 조각.
 * @param callback - 변경 통지 콜백
 * @returns 구독 해제 함수
 */
export function subscribeDomainIdentity(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
