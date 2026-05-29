// ============================================================================
// 토큰 관리 — 쿠키 기반 (본체 pullim token-manager 패턴 차용).
// classbot 전용 쿠키 키(classbot_*)로 본체/타 도메인과 격리한다.
// localStorage 저장 금지(보안 방침) — SameSite=Lax 쿠키 사용.
// ============================================================================

const ACCESS_TOKEN_KEY = "classbot_access_token";
const REFRESH_TOKEN_KEY = "classbot_refresh_token";

// BE 기본 만료와 정렬: access 1h, refresh 14d (jwt.config 기본값).
const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1시간
const REFRESH_TOKEN_MAX_AGE = 14 * 24 * 60 * 60; // 14일

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

type TokenChangeCallback = (hasToken: boolean) => void;

/** 토큰 저장/조회/구독을 담당하는 매니저. */
class TokenManager {
  private listeners: TokenChangeCallback[] = [];

  /** Access Token 을 반환한다. 없으면 null. */
  getAccessToken(): string | null {
    return getCookie(ACCESS_TOKEN_KEY);
  }

  /** Refresh Token 을 반환한다. 없으면 null. */
  getRefreshToken(): string | null {
    return getCookie(REFRESH_TOKEN_KEY);
  }

  /** 토큰 쌍을 저장하고 구독자에게 알린다. */
  setTokens(accessToken: string, refreshToken: string): void {
    setCookie(ACCESS_TOKEN_KEY, accessToken, ACCESS_TOKEN_MAX_AGE);
    setCookie(REFRESH_TOKEN_KEY, refreshToken, REFRESH_TOKEN_MAX_AGE);
    this.notify(true);
  }

  /** 토큰 쌍을 제거하고 구독자에게 알린다. */
  clearTokens(): void {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    this.notify(false);
  }

  /**
   * 토큰 변경(로그인/로그아웃)을 구독한다.
   * @param callback - hasToken 여부를 받는 콜백
   * @returns 구독 해제 함수
   */
  onTokenChange(callback: TokenChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(hasToken: boolean): void {
    for (const listener of this.listeners) {
      listener(hasToken);
    }
  }
}

/** 전역 토큰 매니저 싱글톤. */
export const tokenManager = new TokenManager();
