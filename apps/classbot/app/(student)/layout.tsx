import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { RoleGuard } from '@/components/features/auth/role-guard';

export default function StudentLayout({ children }: { children: ReactNode }) {
  // 문은 풀림 OS 하나다(05 § 11.2 · 2026-09-16 계획 결정 ②): 비로그인은 OS 로그인으로,
  // 교사는 교사 홈으로, 학부모·기관은 안내 한 장으로. 공개 경로(소개)만 그대로 연다 —
  // 목록은 `lib/auth/public-paths.ts`. 데이터 자물쇠는 서버(pullim-api)다.
  return (
    <RoleGuard requiredRole="student">
      <AppShell role="student">{children}</AppShell>
    </RoleGuard>
  );
}
