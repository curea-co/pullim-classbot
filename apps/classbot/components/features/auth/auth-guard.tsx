'use client';

import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';
import { osLoginUrl } from '@/lib/auth/os-sso';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * 인증 가드 — OS SSO 모드.
 *
 * 세션 복원(`/me`)이 끝난 뒤 사용자가 없으면 OS 로그인으로 보낸다(`osLoginUrl(next)`).
 * HttpOnly 세션 쿠키는 JS 가 동기적으로 읽을 수 없으므로, 토큰 동기 확인 대신
 * AuthContext 의 비동기 세션 상태(`isReady`/`user`)에 기댄다.
 *
 * 최소 적용 원칙: layout 전면 적용이 아니라 보호가 필요한 서브트리만 감싼다.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !user && typeof window !== 'undefined') {
      const current = window.location.pathname + window.location.search;
      window.location.assign(osLoginUrl(current));
    }
  }, [isReady, user]);

  // 세션 복원 중이거나 미인증(리다이렉트 진행 중)이면 children 을 렌더하지 않는다.
  if (!isReady || !user) return null;
  return <>{children}</>;
}
