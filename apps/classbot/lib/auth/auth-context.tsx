'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { type AuthUser } from '@pullim-classbot/auth';

import { setDomainIdentitySnapshot } from '@/lib/api/identity-snapshot';
import { OsSsoAuthProvider } from '@/lib/auth/os-sso-provider';

// 인증 Provider 는 하나다 — 세션을 pullim-api `/me`(OS 쿠키)에서 파생한다.
// **여기서 직접 인스턴스화한다 — 패키지 쪽 싱글톤에 다시 맡기지 마라.** 싱글톤을 두고
// `setProvider` 로 갈아 끼우는 꼴은 워크스페이스 패키지 번들 경계에서 인스턴스가 갈릴 수
// 있고(스왑 미반영), 그러면 단일 진실이 깨진다. 종전 `authService` 가 그 꼴이었다.
//
// 종전에는 `OS_SSO_ENABLED` 플래그로 이 자리에서 자체 인증(ApiAuthProvider, JWT/tokenManager)과
// 갈랐다. 그 분기는 걷혔다 — 클래스봇은 인증을 갖지 않고 인가는 pullim-os·pullim-api 소관이다.
const provider = new OsSsoAuthProvider();

/**
 * `/me` 에 **닿지 못한** 상태 — `user === null` 인데 비로그인이 아니다(`OsSsoAuthProvider` `SessionFailure`).
 * 401 확정은 여기 들지 않는다(그건 그냥 `user: null`). RoleGuard 는 이 값이 있으면 로그인으로 보내지
 * 않고 「지금은 연결이 안 돼요」를 세운다 — 왕복을 막는 자리다.
 */
export type SessionError = 'unavailable';

interface AuthContextValue {
  /** 현재 로그인 사용자. 미로그인 시 null. */
  user: AuthUser | null;
  /** 초기 세션 복원이 끝났는지 여부. */
  isReady: boolean;
  /** 마지막 세션 복원이 서버에 닿지 못했는가. `user === null` 과 함께 읽는다. */
  sessionError: SessionError | null;
  /** 세션을 다시 읽어 user 를 갱신한다 (로그인/회원가입 직후 · 연결 실패 뒤 다시 시도). */
  refreshSession: () => Promise<void>;
  /** 로그아웃 후 세션을 비운다. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 인증 컨텍스트 Provider.
 * provider 의 상태 변경을 구독하고, 마운트 시 1회 세션을 복원한다.
 * (세션 사용자는 pullim-api `/me` 응답에서 파생 — OS access 쿠키가 신원이다.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionError, setSessionError] = useState<SessionError | null>(null);

  // `/me` 가 끝난 뒤 실패 이유를 provider 에서 읽는다 — 사용자는 구독(onAuthStateChange)으로 온다.
  const readSessionError = () =>
    setSessionError(provider.lastFailure === 'unavailable' ? 'unavailable' : null);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = provider.onAuthStateChange((next) => {
      // 도메인 fetch 신원 스냅샷 publish — 정본 서버는 OS access 쿠키에서 sub 를 파생하므로 FE 는
      // 요청 명의를 보내지 않는다. 이 스냅샷은 인박스/목록을 인증 사용자로 로컬 필터·재동기화하는
      // 캐시 키로만 소비된다(domain-fetch `currentSessionUserId`).
      setDomainIdentitySnapshot(next);
      setUser(next);
    });
    void provider.getSession().finally(() => {
      if (cancelled) return;
      readSessionError();
      setIsReady(true);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // provider 는 모듈 싱글톤이고 readSessionError 는 setState 만 감싼다 — 마운트 1회.
  }, []);

  const refreshSession = useCallback(async () => {
    await provider.getSession();
    readSessionError();
  }, []);

  const signOut = useCallback(async () => {
    await provider.signOut();
    setSessionError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isReady, sessionError, refreshSession, signOut }),
    [user, isReady, sessionError, refreshSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 인증 컨텍스트 훅. Provider 밖에서 호출하면 throw. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
