'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';

interface AuthGuardProps {
  children: ReactNode;
  /** 미인증 시 보낼 경로 (기본 /login). */
  redirectTo?: string;
}

function subscribe(callback: () => void): () => void {
  return tokenManager.onTokenChange(callback);
}

function getHasToken(): boolean {
  return !!tokenManager.getRefreshToken();
}

function getHasTokenServer(): boolean {
  return false;
}

/**
 * 인증 가드 — 본체 pullim AuthGuard 패턴.
 *
 * 최소 적용 원칙: 기존 흐름을 깨지 않도록 layout 에 전면 적용하지 않는다.
 * 보호가 필요한 페이지/서브트리에서만 children 을 감싼다.
 * 미인증이면 `?next=` 를 붙여 로그인으로 보낸다.
 */
export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const router = useRouter();
  const hasToken = useSyncExternalStore(subscribe, getHasToken, getHasTokenServer);

  useEffect(() => {
    if (!hasToken && typeof window !== 'undefined') {
      const current = window.location.pathname + window.location.search;
      router.replace(`${redirectTo}?next=${encodeURIComponent(current)}`);
    }
  }, [hasToken, redirectTo, router]);

  if (!hasToken) return null;
  return <>{children}</>;
}
