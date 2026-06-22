import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'accent' | 'alert' | 'success';

export interface KpiStatProps {
  label: string;
  value: string;
  tone?: KpiTone;
  icon?: LucideIcon;
  /** When true, renders labels and values with on-dark (navy) safe colours (AA-legible). */
  onDark?: boolean;
}

export interface KpiStatBarProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 6;
  className?: string;
  /** When true, forwards onDark to every KpiStat child automatically. */
  onDark?: boolean;
}

const toneValueClass: Record<KpiTone, string> = {
  default: 'text-pullim-slate-900',
  accent:  'text-pullim-blue-600',
  alert:   'text-pullim-danger',
  success: 'text-pullim-blue-500',
};

/** On-dark (navy) equivalents — white/lemon only, no green/amber. */
const toneValueClassDark: Record<KpiTone, string> = {
  default: 'text-white',
  accent:  'text-white',
  alert:   'text-pullim-lemon',
  success: 'text-white',
};

const colsClass: Record<2 | 3 | 4 | 6, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function KpiStat({ label, value, tone = 'default', icon: Icon, onDark = false }: KpiStatProps) {
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase',
        onDark ? 'text-white/70' : 'text-pullim-slate-500',
      )}>
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn(
        'mt-0.5 font-mono text-base font-bold',
        onDark ? toneValueClassDark[tone] : toneValueClass[tone],
      )}>
        {value}
      </div>
    </li>
  );
}

export function KpiStatBar({ children, cols = 6, className }: KpiStatBarProps) {
  return (
    <section className={cn('bg-card rounded-2xl border p-3', className)}>
      <ul className={cn('grid gap-3', colsClass[cols])}>
        {children}
      </ul>
    </section>
  );
}
