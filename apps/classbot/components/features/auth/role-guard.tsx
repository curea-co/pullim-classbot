'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { homePathForRole } from '@pullim-classbot/auth';
import type { UserRole } from '@pullim-classbot/types';

import { useAuth } from '@/lib/auth/auth-context';

interface RoleGuardProps {
  children: ReactNode;
  /** 이 서브트리에 진입 가능한 역할. */
  requiredRole: UserRole;
}

/**
 * 역할 가드 — RBAC 라우팅(plan Phase 3).
 *
 * classbot 핵심은 학생/교사 역할 분기다. 라우트 그룹(`(teacher)`/`(student)`)을
 * 세션 role 로 보호한다.
 *
 * 정책(데모 우선 + 실 RBAC 공존):
 *  - **로그인 세션이 있고 role 이 다르면** → 본인 역할 홈으로 리다이렉트(교사 화면에
 *    들어온 학생을 차단). 실제 RBAC 강제.
 *  - **비로그인(데모 폴백)** 이면 통과시킨다 — 데모 환경에서 로그인 없이도 두 역할
 *    화면을 둘러볼 수 있게(기존 데모 흐름 보존). 쓰기 가드는 서버 route 가 별도 강제.
 *
 * 세션 복원 전(isReady=false)에는 깜빡임을 막기 위해 children 을 그대로 둔다.
 */
export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
  const router = useRouter();
  const { user, isReady } = useAuth();

  const mismatched = isReady && user !== null && user.role !== requiredRole;

  useEffect(() => {
    if (mismatched && user) {
      router.replace(homePathForRole(user.role));
    }
  }, [mismatched, user, router]);

  // 역할 불일치 로그인 사용자는 리다이렉트 직전 빈 화면(콘텐츠 노출 방지).
  if (mismatched) return null;
  return <>{children}</>;
}
