import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';

export default function StudentLayout({ children }: { children: ReactNode }) {
  // RBAC: 로그인 세션의 role 이 student 가 아니면(예: 교사) 본인 홈으로 리다이렉트.
  // (비로그인 데모는 통과.)
  return (
    <RoleGuard requiredRole="student">
      <AppShell role="student">{children}</AppShell>
    </RoleGuard>
  );
}
