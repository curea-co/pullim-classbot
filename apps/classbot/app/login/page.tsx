import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/login-form';
import { AuthCardSkeleton } from '@/components/features/auth/auth-card-skeleton';
import { OsSsoRedirect } from '@/components/features/auth/os-sso-redirect';
import { OS_SSO_ENABLED } from '@/lib/auth/auth-mode';

export const metadata: Metadata = {
  title: '로그인',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<AuthCardSkeleton />}>
        {/* OS SSO 모드면 폼 대신 OS 로그인으로 리다이렉트, 아니면 기존 로그인 폼. */}
        {OS_SSO_ENABLED ? <OsSsoRedirect /> : <LoginForm />}
      </Suspense>
    </main>
  );
}
