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

import { OsSsoAuthProvider } from '@/lib/auth/os-sso-provider';

// OS SSO 모드: 세션은 pullim-api `/me`(쿠키)에서 파생한다. authService 싱글톤 `setProvider` 스왑은
// 워크스페이스 패키지 번들 경계에서 인스턴스가 갈릴 수 있어(스왑 미반영), OS SSO Provider 를
// 모듈 단일 인스턴스로 **직접** 사용한다(단일 진실).
const ssoProvider = new OsSsoAuthProvider();

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
    const unsubscribe = ssoProvider.onAuthStateChange(setUser);
    void ssoProvider.getSession().finally(() => setIsReady(true));
    return unsubscribe;
  }, []);

  const refreshSession = useCallback(async () => {
    await ssoProvider.getSession();
  }, []);

  const signOut = useCallback(async () => {
    await ssoProvider.signOut();
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
