import { TrendingUp } from 'lucide-react';
import { gradingStats } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 변경률 누적 미터 — 20% 임계 초과 시 루브릭 재학습 제안 점등.
 * spec 11 § 5.1.
 */
export function OverrideDeltaMeter({ currentDelta }: { currentDelta: number }) {
  const cumulative = gradingStats.avgOverrideRate;
  const threshold = gradingStats.rubricLearningThreshold;
  const isOver = cumulative >= threshold;
  const pct = Math.min(100, (cumulative / threshold) * 100);

  return (
    <section
      className={cn(
        'rounded-2xl border p-4',
        isOver ? 'border-pullim-blue-300 bg-pullim-blue-50' : 'bg-card',
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <TrendingUp className={cn('h-4 w-4', isOver ? 'text-pullim-blue-700' : 'text-pullim-blue-600')} />
        <div className="flex-1">
          <h3 className="text-pullim-slate-900 text-sm font-bold">변경률 누적</h3>
          <p className="text-pullim-slate-500 text-[11px]">
            최근 30일 평균 — {threshold}% 넘으면 루브릭이 학생 답과 어긋난다는 신호예요.
          </p>
        </div>
        <div className="text-right">
          <div className={cn('font-mono text-lg font-bold', isOver ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
            {cumulative}%
          </div>
          <div className="text-pullim-slate-400 text-[9px]">/ 임계 {threshold}%</div>
        </div>
      </header>

      <div className="bg-pullim-slate-200 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full', isOver ? 'bg-pullim-blue-700' : 'bg-pullim-blue-500')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {currentDelta > 0 && (
        <p className="text-pullim-slate-500 mt-2 text-[11px]">
          이번 검수 변경률 <span className="font-mono font-bold">{currentDelta}%</span>
          {currentDelta >= threshold && <span className="text-pullim-blue-700 font-bold"> · 단독으로도 임계 초과</span>}
        </p>
      )}

      {isOver && (
        <button
          type="button"
          className="bg-pullim-blue-700 hover:bg-pullim-blue-800 mt-3 w-full rounded-lg py-1.5 text-[11px] font-bold text-white"
        >
          루브릭 재학습 제안 보기
        </button>
      )}
    </section>
  );
}
