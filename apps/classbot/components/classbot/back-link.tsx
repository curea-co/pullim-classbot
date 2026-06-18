'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BackLinkProps {
  href: string;
  children?: ReactNode;
  tone?: 'slate' | 'blue-hover' | 'dark';
  iconOnly?: boolean;
  'aria-label'?: string;
  className?: string;
}

export default function BackLink({
  href,
  children,
  tone = 'slate',
  iconOnly = false,
  'aria-label': ariaLabel,
  className,
}: BackLinkProps) {
  const baseClasses = 'inline-flex items-center gap-1 transition-colors';

  const toneClasses = {
    slate: 'text-pullim-slate-500 hover:text-pullim-slate-700',
    'blue-hover': 'hover:text-pullim-blue-600 font-semibold text-pullim-slate-500 hover:text-pullim-blue-600',
    dark: 'text-pullim-slate-300 hover:text-white',
  };

  const iconSize = iconOnly ? 'h-4 w-4' : 'h-3 w-3';

  if (iconOnly) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10',
          className,
        )}
      >
        <ArrowLeft className={iconSize} />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'text-xs',
        baseClasses,
        toneClasses[tone],
        className,
      )}
    >
      <ArrowLeft className={iconSize} />
      {children}
    </Link>
  );
}
