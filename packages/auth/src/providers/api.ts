// ============================================================================
// ApiAuthProvider — classbot BE 연동 IAuthProvider 구현체.
//
// 본체 pullim ApiAuthProvider 패턴 차용. 단, classbot BE 에는 `/user/me` 가
// 없으므로 세션 사용자 정보는 access token 의 claim(sub/email/role)에서 파생한다.
// ============================================================================

import { login as apiLogin, logout as apiLogout } from "@pullim-classbot/api-client/auth-api";
import { tokenManager } from "@pullim-classbot/api-client/token-manager";
import { decodeAccessToken } from "@pullim-classbot/api-client/jwt";
import type { AccessTokenPayload } from "@pullim-classbot/types";

import type { AuthUser, IAuthProvider } from "../types";
import { AuthError } from "../types";

/** classbot BE 연동 인증 Provider. */
export class ApiAuthProvider implements IAuthProvider {
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  /**
   * 이메일/비밀번호 로그인.
   * @throws AuthError 인증 실패 또는 토큰 파싱 실패 시
   */
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const tokens = await apiLogin({ email, password });
      return this.handleTokensReceived(tokens.accessToken, tokens.refreshToken);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (error instanceof Error && "status" in error) {
        throw new AuthError(error.message, "invalid-credentials");
      }
      throw new AuthError("로그인에 실패했습니다.", "unknown");
    }
  }

  /** 로그아웃. BE 호출 실패해도 클라이언트 토큰은 제거한다. */
  async signOut(): Promise<void> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await apiLogout({ refreshToken });
      }
    } catch {
      // 로그아웃 API 실패는 무시 — 토큰만 정리한다.
    } finally {
      tokenManager.clearTokens();
      this.setCurrentUser(null);
    }
  }

  /**
   * 현재 세션 사용자 조회. access token claim 에서 파생한다.
   * access 가 없거나 만료면 refresh 토큰 존재 여부로만 세션 유효성을 판정하되,
   * 사용자 정보(role)는 access claim 이 필요하므로 access 없으면 null 로 본다.
   */
  async getSession(): Promise<AuthUser | null> {
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      const user = userFromToken(accessToken);
      if (user) {
        this.setCurrentUser(user);
        return user;
      }
    }
    // access 가 없거나 손상된 경우: 세션 없음으로 간주.
    // (자동 갱신은 authRequest 의 401 리프레시 경로가 담당.)
    this.setCurrentUser(null);
    return null;
  }

  /**
   * 토큰 변경(로그인/로그아웃)을 구독한다. 구독 즉시 현재 사용자로 1회 호출.
   * @param callback - user 또는 null 콜백
   * @returns 구독 해제 함수
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * 토큰 쌍을 저장하고 세션 사용자를 설정한다.
   * 회원가입 직후 받은 토큰을 세션에 반영할 때도 사용한다.
   * @throws AuthError access token 파싱 실패 시
   */
  handleTokensReceived(accessToken: string, refreshToken: string): AuthUser {
    const user = userFromToken(accessToken);
    if (!user) {
      throw new AuthError("토큰 정보를 해석할 수 없습니다.", "invalid-token");
    }
    tokenManager.setTokens(accessToken, refreshToken);
    this.setCurrentUser(user);
    return user;
  }

  private setCurrentUser(user: AuthUser | null): void {
    this.currentUser = user;
    for (const listener of this.listeners) {
      listener(user);
    }
  }
}

/** access token claim → AuthUser. 파싱 실패 시 null. */
function userFromToken(accessToken: string): AuthUser | null {
  const payload: AccessTokenPayload | null = decodeAccessToken(accessToken);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
