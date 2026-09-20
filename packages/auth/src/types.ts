// ============================================================================
// 인증 추상화 — IAuthProvider 계약 (본체 pullim packages/auth 패턴).
// 구현체를 교체해도 앱 코드(AuthProvider 컨텍스트, 로그인 폼)는 바뀌지 않는다.
// ============================================================================

import type { UserRole } from "@pullim-classbot/types";

/** 인증된 사용자 정보 (FE 세션 모델). */
export interface AuthUser {
  id: string;
  email: string;
  /** student/teacher/admin. 역할별 라우팅·메뉴 분기에 사용. */
  role: UserRole;
  /**
   * 사람 이름(표시명) — 화면이 사람을 부를 때 쓰는 값.
   *
   * **무엇을 위한 칸인가 — 값을 나르기 위한 칸이 아니다.** 구현체가 세우는 세션 객체는 계약에
   * 칸이 없어도 이 값을 실어 보낼 수 있다. TypeScript 인터페이스는 런타임에서 아무것도 깎지
   * 않고, 컨텍스트는 그 객체를 참조 그대로 넘긴다. 칸이 필요한 쪽은 **읽는 쪽**이다 —
   * `AuthUser` 로 받은 세션에서 `user.name` 을 읽으려면 계약에 칸이 있어야 컴파일된다.
   *
   * **왜 optional 인가.** 이름은 신원의 필수 부분이 아니다:
   *  - 이 계약은 구현체에게 이름을 **요구하지 않는다.** `getSession()`·`signInWithEmail()` 이
   *    id·email·role 만으로 세션을 세워도 계약은 지켜진 것이다.
   *  - 지금 유일한 구현(`apps/classbot/lib/auth/os-sso-provider.ts` 의 `OsSsoAuthProvider`)이
   *    이 칸을 채우는 출처는 pullim-api `GET /me` 의 `displayName` 인데, **그 값 자체가 비어 올 수
   *    있다.** 같은 auth 프로필을 투영하는 반 명단 DTO 가 이미 그렇게 적혀 있다 —
   *    `apps/classbot/lib/api/classbot-dto.ts` 의 `ClassMemberDto.displayName` 은
   *    `string | null` 이고 「auth 프로필 투영이라 비어 있을 수 있다(탈퇴·부재)」가 근거다.
   *  - `/me` 응답은 런타임 JSON 이라 타입 검사를 지나지 않는다 — 구현체가 `as MeResponse` 로
   *    받는다. 칸이 아예 없는 응답도 타입이 막아 주지 않는다.
   *
   * **그래서 읽는 쪽은 폴백을 가져야 한다.** 빈 문자열(`''`)도 「없음」과 같이 다뤄라 —
   * 화면에서 둘은 똑같은 빈칸이다. 이 앱에서 그 폴백이 설 자리는
   * `apps/classbot/lib/current-user.ts` 의 `useCurrentUser()` 이고, 순서는
   * **이름 → 없으면 email 로컬파트** 다 — 그 읽기와 순서를 고정하는 테스트는 이 칸에 기대는
   * FE PR(#375)이 함께 들인다.
   */
  name?: string;
}

/**
 * Auth Provider 계약.
 *
 * 구현체는 이 패키지에 없다 — 현재 유일한 구현은 `apps/classbot` 의
 * `OsSsoAuthProvider` 이고, 세션 사용자는 pullim-api `/me`(OS 쿠키)에서 파생한다.
 *
 * *(종전 구현체 `ApiAuthProvider`(classbot 자체 BE 이메일/비번 + JWT claim 파생)는
 * 자체 인증과 함께 걷혔다.)*
 */
export interface IAuthProvider {
  /** 이메일/비밀번호 로그인. 실패 시 AuthError throw. */
  signInWithEmail(email: string, password: string): Promise<AuthUser>;
  /** 로그아웃. */
  signOut(): Promise<void>;
  /** 현재 세션 사용자 조회. 미로그인 시 null. */
  getSession(): Promise<AuthUser | null>;
  /**
   * 인증 상태 변경 구독.
   * @param callback - user 또는 null 을 받는 콜백 (구독 즉시 1회 호출)
   * @returns 구독 해제 함수
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

/** 인증 에러. code 로 원인을 구분한다. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
