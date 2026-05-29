import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/login-form';

export const metadata: Metadata = {
  title: '로그인',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
