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
}

/**
 * Auth Provider 계약.
 * 현재 구현체: ApiAuthProvider(classbot BE 연동).
 * classbot BE 에는 `/user/me` 가 없어 세션 사용자는 access token claim 에서 파생한다.
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
