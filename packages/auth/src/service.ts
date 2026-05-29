// ============================================================================
// AuthService — 인증 서비스 싱글톤 (본체 pullim 패턴).
// 앱 코드는 authService 를 통해서만 Provider 와 대화한다.
// 기본 Provider 는 ApiAuthProvider(classbot BE 연동).
// ============================================================================

import { ApiAuthProvider } from "./providers/api";
import type { AuthUser, IAuthProvider } from "./types";

/** 인증 서비스. Provider 위임 + 교체 지점. */
class AuthService {
  private provider: IAuthProvider = new ApiAuthProvider();

  /** Provider 를 교체한다 (앱 초기화 시 1회). */
  setProvider(provider: IAuthProvider): void {
    this.provider = provider;
  }

  /** 현재 Provider 를 반환한다. */
  getProvider(): IAuthProvider {
    return this.provider;
  }

  /** 이메일/비밀번호 로그인. */
  signInWithEmail(email: string, password: string): Promise<AuthUser> {
    return this.provider.signInWithEmail(email, password);
  }

  /** 로그아웃. */
  signOut(): Promise<void> {
    return this.provider.signOut();
  }

  /** 현재 세션 사용자 조회. */
  getSession(): Promise<AuthUser | null> {
    return this.provider.getSession();
  }

  /**
   * 인증 상태 변경 구독.
   * @param callback - user 또는 null 콜백
   * @returns 구독 해제 함수
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.provider.onAuthStateChange(callback);
  }
}

/** 전역 AuthService 싱글톤. 기본값 ApiAuthProvider. */
export const authService = new AuthService();
