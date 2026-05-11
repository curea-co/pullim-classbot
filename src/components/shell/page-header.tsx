import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** 상단 작은 라벨 */
  eyebrow?: {
    icon?: LucideIcon;
    text: string;
    /** 색상 톤 — 기본 blue */
    tone?: 'blue' | 'warn' | 'danger' | 'success';
  };
  /** 페이지 제목 */
  title: ReactNode;
  /** 부제 — 작은 텍스트 */
  description?: ReactNode;
  /** 우측 액션 버튼·뱃지 */
  action?: ReactNode;
  className?: string;
};

const toneClass = {
  blue:    'text-pullim-blue-600',
  warn:    'text-pullim-warn',
  danger:  'text-pullim-danger',
  success: 'text-pullim-success',
} as const;

/**
 * 학생/교사 페이지의 표준 헤더.
 * - eyebrow (icon + text uppercase tracking-wider) — blue-600 기본
 * - H1 — text-2xl tracking-tight
 * - description — text-xs slate-500
 */
export function PageHeader({ eyebrow, title, description, action, className }: Props) {
  const Eb = eyebrow?.icon;
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p
            className={cn(
              'flex items-center gap-1 text-xs font-bold tracking-wider uppercase',
              toneClass[eyebrow.tone ?? 'blue'],
            )}
          >
            {Eb && <Eb className="h-3 w-3" />}
            {eyebrow.text}
          </p>
        )}
        <h1 className="text-pullim-slate-900 mt-0.5 text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-pullim-slate-500 mt-0.5 text-xs">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
