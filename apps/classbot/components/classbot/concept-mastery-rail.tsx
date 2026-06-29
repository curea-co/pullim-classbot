'use client';

import { useProficiencyStore, useMasteryPct, type ConceptStat } from '@/lib/store/proficiency';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 개념 숙련도 막대 — B1B2.
 *
 * ChatStudyInline '핵심 개념' 항목마다 정답률(숙련도) 막대를 붙인다.
 * **self-learning UnitProgress(학습 단계) 와 시각·라벨 구분** — 이 막대는 '정답률'로 라벨링
 * (레일에 두 진척이 공존하므로 혼동 방지).
 *
 * a11y: progressbar 에 aria-valuenow/min/max + aria-label("{개념명} 정답 N/M") 명시.
 * 색단독 금지 — "정답 N/M" 캡션을 함께 노출. 미응시(시도 0)는 slate-400 "아직 안 풀어봄".
 * 색: 채움 blue-600 / track slate-100(green/amber 금지).
 */
export function ConceptMasteryBar({
  conceptId,
  conceptTitle,
  botId,
  userId,
}: {
  conceptId: string;
  conceptTitle: string;
  botId: string;
  userId: string;
}) {
  const hydrated = useStoresHydrated(useProficiencyStore);
  const statRaw = useProficiencyStore((s) => s.byUser[userId]?.concepts[`${botId}:${conceptId}`]);
  const stat: ConceptStat | undefined = hydrated ? statRaw : undefined;
  const pct = useMasteryPct(stat);

  const total = stat ? stat.correct + stat.wrong : 0;
  const correct = stat?.correct ?? 0;
  const attempted = pct !== null;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-pullim-slate-500 text-2xs font-bold tracking-wide uppercase">정답률</span>
        <span className="text-pullim-slate-500 text-2xs font-semibold">
          {attempted ? `정답 ${correct}/${total}` : '아직 안 풀어봄'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={correct}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={attempted ? `${conceptTitle} 정답 ${correct}/${total}` : `${conceptTitle} 미응시`}
        className="bg-pullim-slate-100 h-1.5 w-full overflow-hidden rounded-full"
      >
        <span
          className="bg-pullim-blue-600 block h-full rounded-full transition-[width]"
          style={{ width: attempted ? `${(pct ?? 0) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );
}
