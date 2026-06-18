import { cn } from '@/lib/utils';

export interface ContextRailProps {
  children: React.ReactNode;
  rail?: React.ReactNode;
  railWidth?: 'sm' | 'md' | 'lg';
  stickyRail?: boolean;
  railGap?: 2 | 3 | 4;
  className?: string;
}

const RAIL_WIDTH_MAP: Record<NonNullable<ContextRailProps['railWidth']>, string> = {
  sm: 'lg:grid-cols-[1fr_280px]',
  md: 'lg:grid-cols-[1fr_320px]',
  lg: 'lg:grid-cols-[1fr_360px]',
};

export function ContextRail({
  children,
  rail,
  railWidth = 'md',
  stickyRail = false,
  railGap = 4,
  className,
}: ContextRailProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        rail && RAIL_WIDTH_MAP[railWidth],
        className,
      )}
    >
      <div className="min-w-0 space-y-4">{children}</div>
      {rail && (
        <aside
          className={cn(
            `space-y-${railGap}`,
            stickyRail && 'lg:sticky lg:top-20',
          )}
        >
          {rail}
        </aside>
      )}
    </div>
  );
}
