import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** @default 'neutral' */
  tone?: 'neutral' | 'danger' | 'plain';
  /**
   * 빈 상태의 단 하나뿐인 나가는 길.
   * `label` 은 **보이는 글자**라 단어로 줄인다([07 § 6.6](../../../../proc/spec/07-branding.md)).
   * 줄이며 잃은 뜻은 `ariaLabel` 에 남긴다 — 낭독기에는 「받은 과제」가 아니라
   * 「받은 과제로 가기」로 읽혀야 어디로 가는 길인지 안다 (§ 6.6.2(3)).
   */
  action?:
    | { href: string; label: string; ariaLabel?: string }
    | { onClick: () => void; label: string; ariaLabel?: string };
  /** @default 'lg' */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 빈 상태 세로 여백.
 * 카드(p-5) 안에 들어가는 일이 많아 예전 py-10(40px)은 카드째 빈 상자로 보였다.
 * 카드 패딩 20px 과 같은 눈금 위에 올려 lg=28 / md=24 / sm=20 으로 낮춘다.
 */
const sizePadding = {
  lg: 'py-7',
  md: 'py-6',
  sm: 'py-5',
} as const;

const chipSize = {
  lg: 'h-10 w-10',
  md: 'h-8 w-8',
  sm: 'h-7 w-7',
} as const;

const iconSize = {
  lg: 'h-5 w-5',
  md: 'h-4 w-4',
  sm: 'h-3.5 w-3.5',
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  action,
  size = 'lg',
  className,
}: EmptyStateProps) {
  const isPlain = tone === 'plain';

  const wrapperClass = cn(
    'flex flex-col items-center gap-2 text-center px-5',
    sizePadding[size],
    !isPlain && 'rounded-2xl border border-dashed',
    tone === 'neutral' && 'bg-pullim-slate-50 border-pullim-slate-200',
    tone === 'danger' && 'bg-pullim-danger/5 border-pullim-danger/30',
    className,
  );

  const chipClass = cn(
    'flex items-center justify-center rounded-xl',
    chipSize[size],
    tone === 'neutral' && 'bg-pullim-slate-100 text-pullim-slate-500',
    tone === 'danger' && 'bg-pullim-danger/10 text-pullim-danger',
  );

  const actionClass =
    'bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-1.5 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold text-white transition-colors';

  // Determine action element
  let actionEl: ReactNode = null;
  if (action) {
    if ('href' in action) {
      actionEl = (
        <Link href={action.href} aria-label={action.ariaLabel} className={actionClass}>
          {action.label}
        </Link>
      );
    } else {
      actionEl = (
        <button type="button" onClick={action.onClick} aria-label={action.ariaLabel} className={actionClass}>
          {action.label}
        </button>
      );
    }
  }

  if (isPlain) {
    return (
      <div className={wrapperClass}>
        <p className="text-pullim-slate-500 text-sm font-bold">{title}</p>
        {description && (
          <p className="text-pullim-slate-500 text-2xs">{description}</p>
        )}
        {actionEl}
      </div>
    );
  }

  return (
    <section className={wrapperClass}>
      {Icon && (
        <span className={chipClass}>
          <Icon className={iconSize[size]} aria-hidden />
        </span>
      )}
      <p className="text-pullim-slate-900 text-sm font-bold">{title}</p>
      {description && (
        <p className="text-pullim-slate-500 text-2xs">{description}</p>
      )}
      {actionEl}
    </section>
  );
}
