'use client';

import { SectionHeading } from '@/components/shell/section-heading';
import { cn } from '@/lib/utils';
import { currentPersona } from '@/lib/mock';

const DAYS_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

// blue tint by intensity level 0–3 — palette-safe (no green/amber).
// 요일 글자가 칸 **안**에 들어가므로 배경과 글자색을 한 쌍으로 묶는다.
// 대비는 단계마다 WCAG AA(4.5:1) 이상 — 6.9 / 11.8 / 5.9 / 9.0.
// (강도 2 에 흰 글자는 3.2:1 로 미달이라 blue-900 을 쓴다.)
const HEAT_CLASS: Record<number, string> = {
  0: 'bg-pullim-blue-50 text-pullim-slate-600',
  1: 'bg-pullim-blue-200 text-pullim-blue-900',
  2: 'bg-pullim-blue-400 text-pullim-blue-900',
  3: 'bg-pullim-blue-700 text-white',
};

/**
 * 나의 성장 — 연속 학습·주 평균 시간 2단 통계 + 주간 히트맵.
 * @param streakDays - 연속 학습일. **밖에서 받는다** — 히어로의 스트릭 칩과 **같은 화면**에
 *   있어서, 한쪽만 실제 기록을 읽으면 두 숫자가 서로 어긋난다.
 *   주간 활동·시간은 아직 실제 소스가 없어 데모 페르소나 그대로다.
 */
export function GrowthPanel({ streakDays }: { streakDays: number }) {
  const { weeklyActivity, weeklyHours } = currentPersona;
  const activeDays = weeklyActivity.filter(v => v > 0).length;

  return (
    // 옆 칸의 [오늘 할 일]과 바닥선을 맞추려면 카드가 칸을 끝까지 채워야 한다.
    <section className="flex h-full flex-col">
      <SectionHeading title="나의 성장" />
      <div className="bg-card flex-1 rounded-xl border border-pullim-slate-100 p-4 shadow-pullim-xs">
        {/* 연속 학습일 + 주 평균 시간 — 한 줄 2단. 불꽃은 히어로의 스트릭 칩이 이미 쓴다 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-pullim-blue-700 font-mono text-3xl leading-none font-bold">
                {streakDays}
              </span>
              <span className="text-pullim-blue-700 text-sm font-bold">일</span>
            </div>
            <div className="text-pullim-slate-500 mt-1 text-xs font-semibold">연속 학습</div>
          </div>
          <div className="border-pullim-slate-100 border-l pl-3">
            <div className="flex items-baseline gap-1">
              <span className="text-pullim-blue-700 font-mono text-3xl leading-none font-bold">
                {weeklyHours}
              </span>
              <span className="text-pullim-blue-700 text-sm font-bold">시간</span>
            </div>
            <div className="text-pullim-slate-500 mt-1 text-xs font-semibold">주 평균 학습</div>
          </div>
        </div>

        <div className="border-pullim-slate-100 my-3.5 border-t" />

        {/* Weekly heatmap — 7칸이 패널 폭을 그대로 채운다 */}
        <div className="text-pullim-slate-500 mb-2 text-xs font-semibold">
          이번 주 {activeDays}/7일 학습
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weeklyActivity.map((intensity, i) => (
            <div
              key={i}
              className={cn(
                'text-2xs flex h-14 items-end justify-center rounded-md pb-1.5 font-semibold',
                HEAT_CLASS[intensity] ?? HEAT_CLASS[0],
              )}
              title={`${DAYS_KO[i]}: 강도 ${intensity}`}
            >
              {DAYS_KO[i]}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
