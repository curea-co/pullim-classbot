import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  // RBAC: 로그인 세션의 role 이 teacher 가 아니면 본인 홈으로 리다이렉트.
  // (비로그인 데모는 통과 — 데모 흐름 보존, 쓰기는 서버 route 가 별도 가드.)
  return (
    <RoleGuard requiredRole="teacher">
      <AppShell role="teacher">{children}</AppShell>
    </RoleGuard>
  );
}
