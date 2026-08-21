import Link from 'next/link';
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
  /**
   * 「그래서 뭘 하나」 — 숫자 하나에 다음 행동 하나를 붙인다.
   * 지표가 무엇이 일어났는지만 보여주고 무엇을 해야 할지는 안 알려준다는 교사 불만에 대한 답.
   */
  action?: { label: string; href: string };
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

export function KpiStat({ label, value, tone = 'default', icon: Icon, onDark = false, action }: KpiStatProps) {
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className={cn(
        'inline-flex items-center gap-1 text-micro font-semibold tracking-wider uppercase',
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
      {action && (
        <Link
          href={action.href}
          className={cn(
            'mt-0.5 inline-block text-micro font-bold',
            onDark ? 'text-white/80 hover:text-white' : 'text-pullim-blue-600 hover:text-pullim-blue-700',
          )}
        >
          {action.label}
          <span className="sr-only"> — {label}</span>
        </Link>
      )}
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
