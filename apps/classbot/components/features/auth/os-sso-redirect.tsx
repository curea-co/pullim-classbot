'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { osLoginUrl } from '@/lib/auth/os-sso';

/**
 * OS SSO 모드 전용 리다이렉트 가드.
 *
 * OS SSO 가 켜져 있으면 classbot 자체 로그인/회원가입 폼은 무의미하므로(인증 진입이 OS 로그인
 * 리다이렉트로 일원화됨), 폼 대신 이 컴포넌트를 렌더해 OS 로그인으로 즉시 보낸다.
 * 복귀 경로는 `?next=` 쿼리(없으면 `/classbot`)를 `osLoginUrl` 로 안전 검증해 부착한다.
 *
 * `useSearchParams` 를 쓰므로 호출부에서 `<Suspense>` 로 감싸야 한다.
 */
export function OsSsoRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = searchParams.get('next') ?? '/classbot';
    window.location.assign(osLoginUrl(next));
  }, [searchParams]);

  return null;
}
