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
 * 스냅샷 사용자의 최소 형태 — `AuthUser` 가 그대로 대입 가능하도록 구조적으로 느슨하게 둔다.
 *
 * ⛔ **`AuthUser.name` 은 여기 선언하지 않는다.** 그 칸은 KCB 실명이고 **본인-조회 한정 PII** 다
 * (권위: pullim-api `me-response.dto.ts` — 「KCB 실명 … 본인-조회 한정 · 로그/토큰 금지」).
 * 이 모듈이 쓰는 것은 `id` 하나뿐이다(`domain-fetch` 의 `currentSessionUserId`).
 * 넘어오는 객체는 `AuthUser` 를 **참조 그대로** 받은 것이라 런타임에는 그 칸이 붙어 있다 —
 * 타입이 지우는 것이 아니다. 그래서 **여기서 읽지 않는다는 것이 규칙이고**, 이 타입이 그 규칙이다.
 * 이름을 이 경로로 끌어다 쓰지 마라 — 이 스냅샷은 domain-fetch 로 가는 길이다.
 */
export interface SsoIdentityUser {
  /** OS 세션 sub (raw uuid) — 캐시 키로만 쓴다. 요청 명의는 쿠키가 진다(FE 는 id 를 보내지 않는다). */
  id: string;
  email: string;
  /** `AppUserRole`(student·teacher·admin·parent·institution) — 여기서는 갈라 읽지 않아 string 으로 둔다. */
  role: string;
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
