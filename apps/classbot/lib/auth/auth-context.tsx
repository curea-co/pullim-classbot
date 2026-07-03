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
import { authService, type AuthUser } from '@pullim-classbot/auth';

import { setDomainIdentitySnapshot } from '@/lib/api/identity-snapshot';
import { syncMeOnce } from '@/lib/api/me-sync';
import { OsSsoAuthProvider } from '@/lib/auth/os-sso-provider';
import { OS_SSO_ENABLED } from '@/lib/auth/auth-mode';

// 인증 Provider 선택은 OS_SSO_ENABLED 플래그로 결정한다(모듈 단일 인스턴스).
//  - flag OFF(기본): authService(ApiAuthProvider, JWT/tokenManager) — 기존 classbot 자체 인증 흐름.
//  - flag ON: OsSsoAuthProvider — 세션을 pullim-api `/me`(쿠키)에서 파생.
//    authService 싱글톤 `setProvider` 스왑은 워크스페이스 패키지 번들 경계에서 인스턴스가
//    갈릴 수 있어(스왑 미반영), OS SSO Provider 를 직접 인스턴스화해 쓴다(단일 진실).
const provider = OS_SSO_ENABLED ? new OsSsoAuthProvider() : authService;

interface AuthContextValue {
  /** 현재 로그인 사용자. 미로그인 시 null. */
  user: AuthUser | null;
  /** 초기 세션 복원이 끝났는지 여부. */
  isReady: boolean;
  /** 세션을 다시 읽어 user 를 갱신한다 (로그인/회원가입 직후). */
  refreshSession: () => Promise<void>;
  /** 로그아웃 후 세션을 비운다. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 인증 컨텍스트 Provider.
 * authService 의 상태 변경을 구독하고, 마운트 시 1회 세션을 복원한다.
 * (classbot BE 에는 /user/me 가 없어 세션 사용자는 access token claim 에서 파생.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = provider.onAuthStateChange((next) => {
      // 도메인 fetch 신원 스냅샷 publish — OS SSO 세션은 HttpOnly 쿠키라 domain-fetch 가
      // 토큰을 못 읽으므로, 여기서 publish 한 사용자로 x-user-id(raw sub) 명의를 파생한다.
      // (publish 는 인증 모드와 무관하게 항상 안전 — 소비는 OS_SSO_ENABLED 게이트.)
      setDomainIdentitySnapshot(next);
      // SSO 세션 확립 시 classbot BE 에 사용자 upsert — 사용자당 1회, 실패 비차단.
      // (USE_REAL_CORE_BE && OS_SSO_ENABLED 이중 게이트는 syncMeOnce 내부에서.)
      if (next) void syncMeOnce(next);
      setUser(next);
    });
    void provider.getSession().finally(() => setIsReady(true));
    return unsubscribe;
  }, []);

  const refreshSession = useCallback(async () => {
    await provider.getSession();
  }, []);

  const signOut = useCallback(async () => {
    await provider.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isReady, refreshSession, signOut }),
    [user, isReady, refreshSession, signOut],
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
