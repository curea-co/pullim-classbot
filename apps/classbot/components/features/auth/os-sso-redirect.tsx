'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { osLoginUrl, osSignupUrl } from '@/lib/auth/os-sso';

/**
 * OS SSO 모드 전용 리다이렉트 가드.
 *
 * OS SSO 가 켜져 있으면 classbot 자체 로그인/회원가입 폼은 무의미하므로(인증 진입이 OS 로그인
 * 리다이렉트로 일원화됨), 폼 대신 이 컴포넌트를 렌더해 OS 로그인으로 즉시 보낸다.
 * 복귀 경로는 `?next=` 쿼리를 `osLoginUrl` 로 안전 검증해 부착한다. next 가 없으면 역할 중립
 * 루트 `/`(학생 `/`→`/classbot`, 교사 `/teacher` 로 분기 — 역할별 랜딩은 앱 라우팅이 소관)를
 * 기본값으로 둔다. 특정 서비스 홈(`/classbot`)을 하드코딩하지 않아 교사 진입을 깨지 않는다.
 * (역할 인지 cross-app 복귀는 OS `REDIRECT_HOST_ALLOWLIST` 계약 확정 후 정교화 — 후속.)
 *
 * `useSearchParams` 를 쓰므로 호출부에서 `<Suspense>` 로 감싸야 한다.
 */
export function OsSsoRedirect({ mode = 'login' }: { mode?: 'login' | 'signup' }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = searchParams.get('next') ?? '/';
    // 로그인 진입은 OS 로그인, 회원가입 진입은 OS 회원가입으로 위임(가입 플로우 보존).
    window.location.assign(mode === 'signup' ? osSignupUrl(next) : osLoginUrl(next));
  }, [searchParams, mode]);

  return null;
}
