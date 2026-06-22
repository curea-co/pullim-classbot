import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LiveBadgeProps {
  variant?: 'pill' | 'dot';
  size?: 'xs' | 'sm';
  children?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

export function LiveBadge({ variant = 'pill', size = 'xs', children, className, ...rest }: LiveBadgeProps) {
  const textSize = size === 'sm' ? 'text-2xs' : 'text-micro';
  if (variant === 'dot') {
    return (
      <span
        aria-label={rest['aria-label'] ?? '라이브 진행 중'}
        className={cn('bg-pullim-danger pullim-anim-live-pulse inline-block h-1.5 w-1.5 rounded-full', className)}
      />
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('bg-pullim-danger inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold tracking-wider text-white uppercase', textSize)}>
        <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" aria-hidden />
        LIVE
      </span>
      {children}
    </span>
  );
}
