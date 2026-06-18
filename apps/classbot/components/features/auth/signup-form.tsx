'use client';

import { type FormEvent, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, GraduationCap, UserRound } from 'lucide-react';
import { homePathForRole } from '@pullim-classbot/auth';
import type { SelectableRole } from '@pullim-classbot/types';

import { AlertCard } from '@/components/classbot/alert-card';
import { AuthCard } from '@/components/features/auth/auth-card';
import { GatedSocialButtons } from '@/components/features/auth/gated-buttons';
import { useSignup } from '@/hooks/api/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { isSafeNextPath } from '@/lib/auth/safe-next';
import { isValidEmail, isValidPassword } from '@/lib/auth/validation';
import { RadioCard, RadioCardGroup } from '@/components/classbot/radio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLE_OPTIONS: { value: SelectableRole; label: string; hint: string; icon: typeof UserRound }[] = [
  { value: 'teacher', label: '교사', hint: '수업·과제를 만들어요', icon: GraduationCap },
  { value: 'student', label: '학생', hint: '수업에 참여해요', icon: UserRound },
];

/**
 * 회원가입 폼 — 이름/이메일/비밀번호 + 역할 선택(student/teacher).
 * 성공 시 가입 즉시 로그인 상태가 되며 역할별 홈으로 이동.
 */
export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<SelectableRole>('teacher');
  const [apiError, setApiError] = useState<string | null>(null);

  const signupMutation = useSignup();

  const loginHref = useMemo(() => {
    const next = searchParams.get('next') ?? '';
    return isSafeNextPath(next) ? `/login?next=${encodeURIComponent(next)}` : '/login';
  }, [searchParams]);

  const clientError = useMemo(() => {
    if (!name.trim()) return '이름을 입력해 주세요.';
    if (!isValidEmail(email)) return '올바른 이메일 형식이 아닙니다.';
    if (!isValidPassword(password))
      return '비밀번호는 8~64자이며 영문·숫자·특수문자를 각 1개 이상 포함해야 합니다.';
    if (password !== passwordConfirm) return '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
    return null;
  }, [name, email, password, passwordConfirm]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setApiError(null);
      if (clientError) {
        setApiError(clientError);
        return;
      }
      try {
        const result = await signupMutation.mutateAsync({
          name: name.trim(),
          email,
          password,
          passwordConfirm,
          role,
        });
        await refreshSession();
        const next = searchParams.get('next') ?? '';
        router.push(isSafeNextPath(next) ? next : homePathForRole(result.role));
      } catch (error) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          setApiError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } else {
          setApiError(error instanceof Error ? error.message : '회원가입에 실패했습니다.');
        }
      }
    },
    [clientError, signupMutation, name, email, password, passwordConfirm, role, refreshSession, router, searchParams],
  );

  return (
    <AuthCard
      title="풀림 클래스봇 회원가입"
      description="역할을 선택하고 계정을 만드세요."
      footer={
        <>
          이미 계정이 있으신가요?{' '}
          <Link href={loginHref} className="font-medium text-pullim-blue-600 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
        <RadioCardGroup label="역할" ariaLabel="역할 선택" cols={2}>
          {ROLE_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              active={role === opt.value}
              onSelect={() => { setRole(opt.value); setApiError(null); }}
              icon={opt.icon}
              title={opt.label}
              description={opt.hint}
            />
          ))}
        </RadioCardGroup>

        <div className="grid gap-1.5">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="김선생"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setApiError(null);
            }}
            required
          />
        </div>

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
            autoComplete="new-password"
            placeholder="영문·숫자·특수문자 포함 8자 이상"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setApiError(null);
            }}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 재입력"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              setApiError(null);
            }}
            required
          />
        </div>

        {apiError ? (
          <AlertCard tone="danger" icon={AlertCircle}>
            <span role="alert">{apiError}</span>
          </AlertCard>
        ) : null}

        <Button
          type="submit"
          variant="pullim"
          size="touch"
          className="w-full"
          disabled={signupMutation.isPending}
        >
          {signupMutation.isPending ? '가입 중…' : '회원가입'}
        </Button>
      </form>

      <GatedSocialButtons />
    </AuthCard>
  );
}
