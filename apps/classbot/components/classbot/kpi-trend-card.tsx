import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReportSummary } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Kpi = ReportSummary['kpis'][number];

/**
 * 8 KPI 카드 — 라벨 + 값 + 추세 아이콘.
 * spec 13 § 3.3.2.
 */
export function KpiTrendCard({ kpi }: { kpi: Kpi }) {
  const trendIcon =
    kpi.trend === 'up' ? <TrendingUp className="text-pullim-blue-600 h-3 w-3" />
    : kpi.trend === 'down' ? <TrendingDown className="text-pullim-danger h-3 w-3" />
    : kpi.trend === 'flat' ? <Minus className="text-pullim-slate-400 h-3 w-3" />
    : null;
  const valueClass =
    kpi.trend === 'down' ? 'text-pullim-danger'
    : kpi.trend === 'up' ? 'text-pullim-blue-600'
    : 'text-pullim-slate-900';
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg p-3">
      <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
        {kpi.label}
      </div>
      <div className={cn('mt-1 flex items-center gap-1.5 font-mono text-base font-bold', valueClass)}>
        <span>{kpi.value}</span>
        {trendIcon}
      </div>
    </li>
  );
}
