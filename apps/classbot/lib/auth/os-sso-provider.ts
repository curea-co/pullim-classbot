// ============================================================================
// OsSsoAuthProvider — 풀림 OS SSO 인증 Provider (쿠키 기반).
//
// 종전 ApiAuthProvider(classbot BE 이메일/비번 + Bearer)를 대체했고, 그쪽은 걷혔다.
// 이제 이 앱의 유일한 `IAuthProvider` 구현체다. 세션은 토큰을
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

import type { AppUserRole } from '@/lib/auth/app-user-role';
import { API_BASE, fetchOsCsrfToken } from '@/lib/auth/os-sso';

/** pullim-api `GET /me` 응답(필요 필드만). */
interface MeResponse {
  sub: string;
  email: string;
  /**
   * 사람 이름 — `AuthUser.name` 의 출처다. 이 응답은 `as MeResponse` 캐스팅이라 타입이
   * 런타임을 보증하지 않고, 같은 auth 프로필을 투영하는 반 명단 쪽은 이미 `string | null` 이다
   * (`lib/api/classbot-dto.ts` 의 `ClassMemberDto.displayName`). 비어 올 때 무엇으로 부를지는
   * `lib/current-user.ts` 의 `useCurrentUser()` 가 정한다.
   */
  displayName: string;
  /** 도메인 역할: student|parent|teacher|institution. */
  role: string;
  /** 글로벌 역할: admin|user. */
  globalRole: string;
}

/**
 * `/me` 가 사용자를 주지 못한 **이유** — 둘은 화면에서 다른 길로 간다.
 *  - `unauthenticated`: 서버가 **401 로 확정**했다 — 세션이 없다. RoleGuard 가 OS 로그인으로 보낸다.
 *  - `unavailable`: 서버에 **닿지 못했다**(네트워크·CORS·5xx·그 밖의 비200). 세션이 없는지 알 수 없다.
 *    이때 로그인으로 보내면 OS 는 세션이 있어 `next` 로 되돌리고, 다시 `/me` 가 실패해 사람이 끊을 수 없는
 *    왕복이 된다(리뷰 #350 — CORS 두 오리진이 아직 등록되지 않은 dev 배포가 그 자리). 스펙 05 § 3 의
 *    「401(비로그인) → OS 로그인」은 401 을 말하는 것이지 「모르겠다」를 말하는 것이 아니다.
 * `IAuthProvider` 계약(`packages/auth`)은 `getSession(): AuthUser | null` 이라 이 구분을 싣지 못한다 —
 * 계약을 넓히는 대신 구현체가 마지막 실패 이유를 들고 `auth-context` 가 읽는다.
 */
export type SessionFailure = 'unauthenticated' | 'unavailable';

/**
 * pullim-api 역할 → 이 앱의 역할(`AppUserRole`) 매핑.
 * globalRole=admin → admin, 도메인 role 은 teacher·parent·institution 을 **그대로**, 그 밖은 student.
 *
 * 종전에는 「그 외 전부 student」라서 학부모·기관이 학생 홈으로 들어와 학생으로 **위장**됐다.
 * 2026-09-16 계획 §10 결정 ⑥ 이 그 매핑을 걷었다 — 「mapRole 이 parent·institution 을 그대로 돌려주고,
 * RoleGuard 는 그 둘을 『클래스봇은 학생·교사용』 안내 한 장으로 보낸다」. 이 매핑은 **UI 라우팅에만**
 * 영향하며 권한 상승이 아니다 — 데이터 권한은 pullim-api 가 sub 와 「이 반의 operator 인가」로 판단한다.
 *
 * OS 의 도메인 역할은 넷(student·parent·teacher·institution)이고 가입 2단계에서 고른 뒤 바꿀 수 없다
 * (계획 §04 「OS 쪽에서 확인한 것」). 그 넷 밖의 값은 오지 않아야 하므로 student 로 접는다 —
 * 가장 좁은 화면이고, 자물쇠는 어차피 서버다.
 * @param role - `/me` 의 도메인 역할
 * @param globalRole - `/me` 의 글로벌 역할
 * @returns 이 앱이 쓰는 역할
 */
export function mapRole(role: string, globalRole: string): AppUserRole {
  if (globalRole === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  if (role === 'parent') return 'parent';
  if (role === 'institution') return 'institution';
  return 'student';
}

/** OS SSO 쿠키 세션 Provider. */
export class OsSsoAuthProvider implements IAuthProvider {
  private readonly listeners = new Set<(user: AuthUser | null) => void>();
  private current: AuthUser | null = null;
  private failure: SessionFailure | null = null;

  /**
   * 마지막 `getSession()`/`signOut()` 이 사용자를 주지 못한 이유. 200 을 받은 뒤에는 null.
   * `auth-context` 가 `getSession()` 이 끝난 직후 읽어 `sessionError` 로 노출한다.
   */
  get lastFailure(): SessionFailure | null {
    return this.failure;
  }

  /**
   * 현재 세션 사용자를 pullim-api `/me`(쿠키 동반)로 조회한다.
   * 200 → AuthUser · 401 → null(비로그인 확정) · 그 밖의 상태·네트워크 오류 → null(**닿지 못함**, 세션 유무
   * 미확정). 둘 다 null 이지만 `lastFailure` 가 갈라 준다 — 미확정을 비로그인으로 접지 않는다(fail-closed 는
   * 「화면을 열지 않는다」까지고, 「로그인으로 보낸다」까지는 아니다).
   */
  async getSession(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.status === 401) {
        this.failure = 'unauthenticated';
        this.emit(null);
        return null;
      }
      if (res.status !== 200) {
        this.failure = 'unavailable';
        this.emit(null);
        return null;
      }
      const me = (await res.json()) as MeResponse;
      // `name` 은 이제 **계약의 칸**이다(`packages/auth` 의 `AuthUser.name`, optional).
      // 종전에는 계약 밖 부가 필드라 `AuthUser & { name: string }` 으로 동봉했는데, 그러면
      // `auth-context` 의 `user: AuthUser | null` 이 그 자리에서 이름을 좁혀 버려 화면까지 닿지
      // 못했다 — 그래서 화면이 사람을 email 앞부분으로 불렀다.
      //
      // `me.displayName` 은 **그대로 싣는다.** 비었을 때 무엇으로 부를지는 여기서 정하지 않는다 —
      // 그 폴백은 `lib/current-user.ts` 의 `useCurrentUser()` 한 곳에 있다. provider 는 `/me` 가
      // 준 것을 비틀지 않고 옮기는 자리다.
      const user: AuthUser = {
        id: me.sub,
        email: me.email,
        // ⚠️ 이 앱의 **유일한** 역할 캐스팅 자리. `AuthUser.role` 은 공유 계약 `UserRole`
        // (student|teacher|admin)이고, 그 union 은 `packages/types` 라 이 앱 사정으로 넓히지 않는다
        // (계획 §10 결정 ⑥). 그래서 런타임 값은 parent·institution 일 수 있고, 읽는 쪽은
        // `AppUserRole` 로 받아 그 둘을 가른다(`components/features/auth/role-guard.tsx`).
        // 넓은 값을 좁은 타입에 담는 캐스팅이므로 여기 말고 다른 곳에서 반복하지 마라.
        role: mapRole(me.role, me.globalRole) as UserRole,
        name: me.displayName,
      };
      this.failure = null;
      this.emit(user);
      return user;
    } catch {
      this.failure = 'unavailable';
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
      // 로그아웃 뒤의 null 은 「비로그인」이다 — 닿지 못한 것이 아니라 스스로 나온 것.
      this.failure = 'unauthenticated';
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

  /** CSRF 토큰을 발급받는다 — os-sso 의 공용 헬퍼에 위임(로그아웃·classbot write 단일 발급 경로). */
  private csrfToken(): Promise<string | null> {
    return fetchOsCsrfToken();
  }

  /** 현재 사용자를 갱신하고 구독자에게 통지한다. */
  private emit(user: AuthUser | null): void {
    this.current = user;
    for (const listener of this.listeners) listener(user);
  }
}
