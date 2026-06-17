import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import BackLink from './back-link';
import { PageHeader } from '@/components/shell/page-header';

export interface TeacherPageShellProps {
  backHref: string;
  backLabel: string;
  header: React.ComponentProps<typeof PageHeader>;
  spacing?: 'space-y-4' | 'space-y-5';
  children: ReactNode;
}

export function TeacherPageShell({
  backHref,
  backLabel,
  header,
  spacing = 'space-y-4',
  children,
}: TeacherPageShellProps) {
  return (
    <div className={cn(spacing, 'py-4 lg:py-6')}>
      <BackLink href={backHref}>{backLabel}</BackLink>
      <PageHeader {...header} />
      {children}
    </div>
  );
}
