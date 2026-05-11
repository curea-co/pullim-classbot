import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AppShell role="student">{children}</AppShell>;
}
