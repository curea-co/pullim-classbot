import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertCardProps {
  tone: 'danger' | 'warn' | 'info';
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
  },
  warn: {
    border: 'border-pullim-warn/30',
    bg: 'bg-pullim-warn-bg',
    titleColor: 'text-pullim-warn',
  },
  info: {
    border: 'border-pullim-blue-200',
    bg: 'bg-pullim-blue-50',
    titleColor: 'text-pullim-blue-600',
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
        'rounded-2xl border p-4',
        meta.border,
        meta.bg,
        className
      )}
    >
      {(Icon || title) && (
        <header className="mb-2 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" aria-hidden />}
          {title && (
            <h3 className={cn('text-sm font-bold', meta.titleColor)}>
              {title}
            </h3>
          )}
        </header>
      )}
      <div className="text-pullim-slate-700 text-[12px] leading-relaxed">
        {children}
      </div>
    </section>
  );
}
