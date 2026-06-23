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
    iconColor: 'text-pullim-danger',
  },
  warn: {
    border: 'border-pullim-warn/30',
    bg: 'bg-pullim-warn-bg',
    titleColor: 'text-pullim-warn',
    iconColor: 'text-pullim-warn',
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
