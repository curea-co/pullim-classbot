import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignupForm } from '@/components/features/auth/signup-form';
import { AuthCardSkeleton } from '@/components/features/auth/auth-card-skeleton';

export const metadata: Metadata = {
  title: '회원가입',
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<AuthCardSkeleton />}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
