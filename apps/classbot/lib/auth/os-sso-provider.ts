// ============================================================================
// OsSsoAuthProvider — 풀림 OS SSO 인증 Provider (쿠키 기반).
//
// 기존 ApiAuthProvider(classbot BE 이메일/비번 + Bearer)를 대체한다. 세션은 토큰을
// JS 가 들고 있지 않고, OS 로그인이 set 한 **HttpOnly 세션 쿠키**를 pullim-api `/me`
// 호출(credentials:'include')로 확인한다. 로그인 진입은 redirect(`osLoginUrl`)로 처리하므로
// signInWithEmail 은 사용하지 않는다.
//
// 권위(SoT):
//  - /me 응답: pullim-api `src/auth/modules/account/.../me-response.dto.ts`
//  - CSRF: GET /auth/csrf → { token }, mutation 에 `X-CSRF-Token` 헤더(double-submit)
//  - 로그아웃: POST /auth/logout (CsrfGuard)
// ============================================================================

import { AuthError, type AuthUser, type IAuthProvider } from '@pullim-classbot/auth';
import type { UserRole } from '@pullim-classbot/types';

import { API_BASE } from '@/lib/auth/os-sso';

/** pullim-api `GET /me` 응답(필요 필드만). */
interface MeResponse {
  sub: string;
  email: string;
  displayName: string;
  /** 도메인 역할: student|parent|teacher|institution. */
  role: string;
  /** 글로벌 역할: admin|user. */
  globalRole: string;
}

/**
 * pullim-api 역할 → classbot UserRole(student|teacher|admin) 매핑.
 * globalRole=admin → admin, 도메인 role=teacher → teacher, 그 외(student/parent/institution) → student.
 */
function mapRole(role: string, globalRole: string): UserRole {
  if (globalRole === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}

/** OS SSO 쿠키 세션 Provider. */
export class OsSsoAuthProvider implements IAuthProvider {
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  private current: AuthUser | null = null;

  /**
   * 현재 세션 사용자를 pullim-api `/me`(쿠키 동반)로 조회한다.
   * 200 → AuthUser, 그 외(401 등)·네트워크 오류 → null(미로그인 취급, fail-closed).
   */
  async getSession(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.status !== 200) {
        this.emit(null);
        return null;
      }
      const me = (await res.json()) as MeResponse;
      const user: AuthUser = {
        id: me.sub,
        email: me.email,
        role: mapRole(me.role, me.globalRole),
      };
      this.emit(user);
      return user;
    } catch {
      this.emit(null);
      return null;
    }
  }

  /** OS 세션을 종료한다. CSRF 토큰을 받아 `POST /auth/logout` 에 동봉한다. */
  async signOut(): Promise<void> {
    try {
      const token = await this.csrfToken();
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'X-CSRF-Token': token } : {},
      });
    } catch {
      // 네트워크 오류여도 로컬 세션은 비운다(아래 finally 대체).
    } finally {
      this.emit(null);
    }
  }

  /** SSO 모드에서는 로그인 폼을 쓰지 않는다(osLoginUrl 리다이렉트로 진입). */
  signInWithEmail(): Promise<AuthUser> {
    return Promise.reject(
      new AuthError('SSO 모드: 로그인은 OS 로그인 페이지 리다이렉트로 처리합니다.', 'SSO_REDIRECT'),
    );
  }

  /**
   * 인증 상태 변경 구독. 구독 즉시 현재 값을 1회 전달한다.
   * @param callback - user 또는 null 콜백
   * @returns 구독 해제 함수
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.current);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /** CSRF 토큰을 발급받는다(실패 시 null — 헤더 없이 진행하면 서버가 거부). */
  private async csrfToken(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      // 백엔드 계약(pullim-api CsrfResponseDto): { csrfToken }. (과거 `token` 은 오기 — 라이브 검증으로 확인)
      const body = (await res.json()) as { csrfToken?: string };
      return body.csrfToken ?? null;
    } catch {
      return null;
    }
  }

  /** 현재 사용자를 갱신하고 구독자에게 통지한다. */
  private emit(user: AuthUser | null): void {
    this.current = user;
    for (const listener of this.listeners) listener(user);
  }
}
