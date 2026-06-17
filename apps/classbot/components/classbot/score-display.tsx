'use client';

import { cn } from '@/lib/utils';

export interface ScoreDisplayProps {
  score: number;
  max: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'fixed-accent' | 'threshold' | 'inverse';
  denomScale?: 'sm' | 'base';
  className?: string;
}

export function ScoreDisplay({
  score,
  max,
  size = 'md',
  tone = 'fixed-accent',
  denomScale,
  className,
}: ScoreDisplayProps) {
  const sizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const sizeClass = sizeMap[size];

  // Determine numerator color based on tone
  let numeratorClass = '';
  if (tone === 'fixed-accent') {
    numeratorClass = 'text-pullim-blue-600';
  } else if (tone === 'inverse') {
    numeratorClass = 'text-white';
  } else if (tone === 'threshold') {
    const pct = (score / max) * 100;
    numeratorClass = cn(
      pct >= 80
        ? 'text-pullim-blue-700'
        : pct >= 60
          ? 'text-pullim-blue-500'
          : 'text-pullim-slate-500',
    );
  }

  // Determine denom span size class
  let denomClass = '';
  if (denomScale) {
    denomClass = denomScale === 'sm' ? 'text-sm' : 'text-base';
  } else {
    denomClass = size === 'lg' ? 'text-sm' : size === 'xl' ? 'text-base' : '';
  }

  return (
    <div className={cn('font-mono font-bold', sizeClass, className)}>
      <span className={numeratorClass}>{score}</span>
      <span className={cn('text-pullim-slate-400', denomClass)}>/{max}</span>
    </div>
  );
}
