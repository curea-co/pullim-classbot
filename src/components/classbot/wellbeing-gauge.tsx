import { Heart } from 'lucide-react';
import { getWellbeingTrend } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 웰빙 지수 게이지 + 7일 추세.
 * spec 13 § 5.1.
 */
export function WellbeingGauge({ studentId, compact }: { studentId: string; compact?: boolean }) {
  const trend = getWellbeingTrend(studentId);
  if (trend.length === 0) {
    return (
      <section className="bg-card rounded-2xl border p-4 text-center">
        <p className="text-pullim-slate-500 text-xs">웰빙 데이터가 아직 없어요.</p>
      </section>
    );
  }

  const today = trend[trend.length - 1];
  const score = today.score;
  const tone =
    score >= 80 ? { color: 'bg-pullim-blue-600', text: 'text-pullim-blue-700', label: '좋아요' }
    : score >= 60 ? { color: 'bg-pullim-blue-500', text: 'text-pullim-blue-600', label: '괜찮아요' }
    : score >= 40 ? { color: 'bg-pullim-blue-300', text: 'text-pullim-blue-500', label: '신경 써요' }
    : { color: 'bg-pullim-danger',   text: 'text-pullim-danger',   label: '곁에 있어요' };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Heart className={cn('h-3 w-3', tone.text)} />
        <span className={cn('font-mono text-sm font-bold', tone.text)}>{score}</span>
        <span className="text-pullim-slate-400 text-[10px]">/100</span>
      </div>
    );
  }

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <Heart className={cn('h-4 w-4', tone.text)} />
        <div className="flex-1">
          <h3 className="text-pullim-slate-900 text-sm font-bold">웰빙 지수</h3>
          <p className="text-pullim-slate-500 text-[10px]">5지표 가중 평균 · 0~100</p>
        </div>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold', tone.color, 'text-white')}>
          {tone.label}
        </span>
      </header>

      <div className="flex items-end gap-2">
        <div className={cn('font-mono text-4xl font-bold', tone.text)}>{score}</div>
        <div className="text-pullim-slate-400 mb-1.5 text-sm">/ 100</div>
      </div>

      {/* 7일 추세 */}
      <div className="mt-3">
        <div className="text-pullim-slate-400 mb-1 text-[10px] font-bold tracking-wider uppercase">최근 7일</div>
        <div className="flex h-12 items-end gap-1">
          {trend.map((t) => {
            const h = Math.max(8, (t.score / 100) * 48);
            const c =
              t.score >= 80 ? 'bg-pullim-blue-600'
              : t.score >= 60 ? 'bg-pullim-blue-500'
              : t.score >= 40 ? 'bg-pullim-blue-300'
              : 'bg-pullim-danger';
            return (
              <div
                key={t.daysAgo}
                className={cn('w-full rounded-sm', c)}
                style={{ height: `${h}px` }}
                title={`${t.daysAgo === 0 ? '오늘' : `${t.daysAgo}일 전`}: ${t.score}`}
              />
            );
          })}
        </div>
        <div className="text-pullim-slate-400 mt-1 flex justify-between text-[11px]">
          <span>7일 전</span>
          <span>오늘</span>
        </div>
      </div>

      {today.flag && (
        <div className="border-pullim-danger/30 bg-pullim-danger-bg mt-3 rounded-lg border p-2">
          <p className="text-pullim-danger text-[11px] font-bold">
            {today.flag === 'below-60-3days' ? '3일 연속 임계 미달 — 교사에게 알림 갔어요.' : '즉시 알림 — 선생님이 곧 연락해요.'}
          </p>
        </div>
      )}
    </section>
  );
}
