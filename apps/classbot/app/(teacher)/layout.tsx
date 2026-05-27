import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <AppShell role="teacher">{children}</AppShell>;
}
