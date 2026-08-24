import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 알림 카드 톤 3종.
 * `warn`(앰버)은 [08 § 1.3] deprecated 라 `notice` 로 갈음했다 —
 * 「주의」는 색이 아니라 **아이콘 + 굵은 제목 + 외곽선**으로 말한다.
 */
export interface AlertCardProps {
  tone: 'danger' | 'notice' | 'info';
  icon?: LucideIcon;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

const toneMeta = {
  danger: {
    border: 'border-pullim-danger/30',
    bg: 'bg-pullim-danger-bg',
    titleColor: 'text-pullim-danger',
    iconColor: 'text-pullim-danger',
  },
  notice: {
    // 채우기 없이 또렷한 외곽선 — 면이 없어서 오히려 카드 흐름에서 떠오른다
    border: 'border-pullim-slate-400',
    bg: 'bg-transparent',
    titleColor: 'text-pullim-slate-900',
    iconColor: 'text-pullim-slate-700',
  },
  info: {
    border: 'border-pullim-blue-200',
    bg: 'bg-pullim-blue-50',
    titleColor: 'text-pullim-blue-600',
    iconColor: 'text-pullim-blue-600',
  },
} as const;

export function AlertCard({
  tone,
  icon: Icon,
  title,
  children,
  className,
}: AlertCardProps) {
  const meta = toneMeta[tone];

  return (
    <section
      className={cn(
        'rounded-2xl border p-5',
        meta.border,
        meta.bg,
        className
      )}
    >
      {(Icon || title) && (
        <header className="mb-2 flex items-center gap-2">
          {Icon && <Icon className={cn('h-4 w-4', meta.iconColor)} aria-hidden />}
          {title && (
            <h3 className={cn('text-sm font-bold', meta.titleColor)}>
              {title}
            </h3>
          )}
        </header>
      )}
      <div className="text-pullim-slate-700 text-xs leading-relaxed">
        {children}
      </div>
    </section>
  );
}
