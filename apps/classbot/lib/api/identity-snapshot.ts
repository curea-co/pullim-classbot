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
 * 구조적으로 느슨하게 둔다. `name` 은 OS `/me` 의 displayName(OsSsoAuthProvider 가 동봉).
 */
export interface SsoIdentityUser {
  /** OS 세션 sub (raw uuid) — 캐시 키로만 쓴다. 요청 명의는 쿠키가 진다(FE 는 id 를 보내지 않는다). */
  id: string;
  email: string;
  /** `AppUserRole`(student·teacher·admin·parent·institution) — 여기서는 갈라 읽지 않아 string 으로 둔다. */
  role: string;
  /** OS `/me` displayName. */
  name?: string;
}

let sessionUser: SsoIdentityUser | null = null;

/** 스냅샷 변경 구독자 — `useSyncExternalStore` 어댑터가 재렌더 트리거로 쓴다. */
const listeners = new Set<() => void>();

/**
 * auth-context → domain-fetch 세션 사용자 publish (얇은 배선).
 * 로그인/세션 복원 시 AuthUser, 로그아웃 시 null. publish 자체는 언제나 안전하다 —
 * 소비 측(domain-fetch `currentSessionUserId`)은 이 값을 캐시 키로만 읽고 요청 명의로는 쓰지 않는다.
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
