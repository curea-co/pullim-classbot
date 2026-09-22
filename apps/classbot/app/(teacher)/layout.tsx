import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  // 문은 풀림 OS 하나다(05 § 11.2 · 2026-09-16 계획 결정 ②): 비로그인은 OS 로그인으로,
  // 학생은 학생 홈으로, 학부모·기관은 안내 한 장으로. admin 은 교사 화면을 쓴다
  // (`packages/auth/src/routes.ts` — 운영자 화면 미도입). 데이터 자물쇠는 서버(pullim-api)다.
  return (
    <RoleGuard requiredRole="teacher">
      <AppShell role="teacher">{children}</AppShell>
    </RoleGuard>
  );
}
