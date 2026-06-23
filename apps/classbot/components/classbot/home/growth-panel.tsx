'use client';

import { Flame } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { currentPersona } from '@/lib/mock';

const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

// blue tint by intensity level 0–3 — palette-safe (no green/amber)
const HEAT_CLASS: Record<number, string> = {
  0: 'bg-pullim-blue-50',
  1: 'bg-pullim-blue-200',
  2: 'bg-pullim-blue-400',
  3: 'bg-pullim-blue-700',
};

export function GrowthPanel() {
  const { streakDays, weeklyActivity, weeklyHours } = currentPersona;
  const activeDays = weeklyActivity.filter(v => v > 0).length;

  return (
    <section>
      <SectionHeading title="나의 성장" />
      <div className="bg-card rounded-xl border border-pullim-slate-100 p-4 shadow-pullim-xs space-y-4">
        {/* Streak — large with flame */}
        <div className="flex items-baseline gap-2">
          <Flame className="text-pullim-lemon-ink h-5 w-5 shrink-0" aria-hidden />
          <span className="text-4xl font-bold text-pullim-blue-700 leading-none font-mono">
            {streakDays}
          </span>
          <span className="text-pullim-slate-500 text-sm font-semibold">일 연속 학습</span>
        </div>

        {/* Weekly heatmap */}
        <div>
          <div className="text-pullim-slate-500 mb-2 text-xs font-semibold">
            이번 주 {activeDays}/7일 학습
          </div>
          <div className="flex gap-1.5">
            {weeklyActivity.map((intensity, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'h-8 w-8 rounded-md transition-colors',
                    HEAT_CLASS[intensity] ?? 'bg-pullim-blue-50',
                  ].join(' ')}
                  title={`${DAYS_KO[i]}: 강도 ${intensity}`}
                />
                <span className="text-micro text-pullim-slate-400">{DAYS_KO[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly hours */}
        <div className="border-t border-pullim-slate-100 pt-3">
          <span className="text-pullim-slate-500 text-xs font-semibold">
            주 평균{' '}
            <span className="text-pullim-blue-700 text-lg font-bold">{weeklyHours}</span>
            시간 학습
          </span>
        </div>
      </div>
    </section>
  );
}
