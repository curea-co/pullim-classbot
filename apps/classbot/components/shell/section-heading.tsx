import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({ title, description, action, className }: Props) {
  return (
    <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-pullim-slate-900 text-base leading-tight font-bold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-pullim-slate-500 mt-0.5 text-xs">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
