import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── 공유 타입 ───────────────────────────────────────────────────────────────

export interface FilterOption<V extends string = string> {
  value: V;
  label: string;
  count?: number;
}

// ── FilterPills (Link 버전) ──────────────────────────────────────────────────

export interface FilterPillsProps<V extends string = string> {
  options: readonly FilterOption<V>[];
  current: V;
  href: (value: V) => string;
  label?: string;
  className?: string;
}

export function FilterPills<V extends string = string>({
  options,
  current,
  href,
  label,
  className,
}: FilterPillsProps<V>) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-pullim-slate-400 w-10 shrink-0 text-micro font-bold tracking-wider uppercase">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isActive = current === o.value;
          return (
            <Link
              key={o.value}
              href={href(o.value)}
              className={cn(
                'rounded-full px-3 py-1 text-2xs font-bold transition-colors',
                isActive
                  ? 'bg-pullim-blue-600 text-white'
                  : 'bg-pullim-slate-100 text-pullim-slate-600 hover:bg-pullim-slate-200',
              )}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── FilterPillButtons (버튼 버전) ────────────────────────────────────────────

export interface FilterPillButtonsProps<V extends string = string> {
  options: readonly FilterOption<V>[];
  current: V;
  onSelect: (value: V) => void;
  shape?: 'pill' | 'tab';
  className?: string;
}

export function FilterPillButtons<V extends string = string>({
  options,
  current,
  onSelect,
  shape = 'pill',
  className,
}: FilterPillButtonsProps<V>) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const isActive = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center gap-1.5 font-bold transition-colors',
              shape === 'tab'
                ? 'rounded-lg px-3 py-1.5 text-xs'
                : 'rounded-full px-3 py-1 text-2xs',
              isActive
                ? 'bg-pullim-blue-600 text-white'
                : 'text-pullim-slate-600 hover:bg-pullim-slate-100',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-micro font-mono',
                  isActive ? 'bg-white/20' : 'bg-pullim-slate-100',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
