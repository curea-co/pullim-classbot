'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { homePathForRole } from '@pullim-classbot/auth';
import { tokenManager } from '@pullim-classbot/api-client/token-manager';

import { AuthCard } from '@/components/features/auth/auth-card';
import { GatedSocialButtons } from '@/components/features/auth/gated-buttons';
import { useLogin } from '@/hooks/api/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { isSafeNextPath } from '@/lib/auth/safe-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * 로그인 폼 — 이메일/비밀번호 → 토큰 저장 → 역할별 홈 redirect.
 * 본체 pullim LoginForm 패턴을 classbot shadcn 으로 재작성.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const loginMutation = useLogin();

  const signupHref = useMemo(() => {
    const next = searchParams.get('next') ?? '';
    return isSafeNextPath(next) ? `/signup?next=${encodeURIComponent(next)}` : '/signup';
  }, [searchParams]);

  // 이미 로그인 상태면 next(또는 역할 홈)로 즉시 이동.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) return;
    const next = searchParams.get('next') ?? '';
    if (isSafeNextPath(next)) router.replace(next);
  }, [router, searchParams]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setApiError(null);
      try {
        await loginMutation.mutateAsync({ email, password });
        await refreshSession();

        const next = searchParams.get('next') ?? '';
        const accessToken = tokenManager.getAccessToken();
        // 역할별 홈 결정: access claim 의 role 로 분기.
        const { decodeAccessToken } = await import('@pullim-classbot/api-client/jwt');
        const role = accessToken ? decodeAccessToken(accessToken)?.role : undefined;
        const fallback = role ? homePathForRole(role) : '/classbot';
        router.push(isSafeNextPath(next) ? next : fallback);
      } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          setApiError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } else {
          setApiError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
        }
      }
    },
    [email, password, loginMutation, refreshSession, router, searchParams],
  );

  return (
    <AuthCard
      title="풀림 클래스봇 로그인"
      description="이메일과 비밀번호로 로그인하세요."
      footer={
        <>
          아직 계정이 없으신가요?{' '}
          <Link href={signupHref} className="font-medium text-pullim-blue-600 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="teacher@pullim.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setApiError(null);
            }}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setApiError(null);
            }}
            required
          />
        </div>

        {apiError ? (
          <p role="alert" className="text-sm text-destructive">
            {apiError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="pullim"
          size="touch"
          className="w-full"
          disabled={loginMutation.isPending || !email || !password}
        >
          {loginMutation.isPending ? '로그인 중…' : '로그인'}
        </Button>
      </form>

      <GatedSocialButtons />
    </AuthCard>
  );
}
