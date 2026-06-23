'use client';

import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip, type ChipProps } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import type { Assignment, ClassBot, StudentEnrollment } from '@/lib/mock';

type BotSlot = { bot: ClassBot; enrollment: StudentEnrollment };

function dDayChipTone(dDay: string): NonNullable<ChipProps['tone']> {
  if (dDay === '오늘') return 'danger';
  if (dDay === 'D-1') return 'info';
  return 'neutral';
}

export function TodoPanel({
  incompleteAssignments,
  liveBots,
}: {
  incompleteAssignments: Assignment[];
  liveBots: BotSlot[];
}) {
  const isEmpty = incompleteAssignments.length === 0 && liveBots.length === 0;

  return (
    <section>
      <SectionHeading title="오늘 할 일" />
      {isEmpty ? (
        <div className="border-pullim-slate-100 rounded-xl border border-dashed bg-pullim-slate-50 px-4 py-6 text-center">
          <p className="text-pullim-slate-500 text-sm font-semibold">다 따라잡았어요 🎉</p>
          <p className="text-pullim-slate-400 mt-1 text-xs">봇과 자유롭게 대화하며 한 발 더 나가볼까요?</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {/* LIVE bots first */}
          {liveBots.map(({ bot }) => (
            <li key={bot.id}>
              <Link
                href={`/classbot/live/${bot.id}`}
                className="group focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 bg-pullim-danger/5 border-pullim-danger/30 hover:bg-pullim-danger/10 flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors"
              >
                <Radio className="text-pullim-danger pullim-anim-live-pulse h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <span className="text-pullim-slate-900 text-sm font-bold">{bot.name}</span>
                  <span className="text-pullim-slate-500 ml-1 text-xs">라이브 진행 중</span>
                </div>
                <span className="bg-pullim-danger text-micro inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold text-white shrink-0">
                  <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
                  LIVE
                </span>
                <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-danger h-4 w-4 shrink-0 transition-colors" aria-hidden />
              </Link>
            </li>
          ))}

          {/* Incomplete assignments — urgent first (already sorted) */}
          {incompleteAssignments.map((a) => (
            <li key={a.id}>
              <Link
                href={a.solveHref ?? '/classbot/assignment'}
                className={cn(
                  'group focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors bg-card',
                  a.dDay === '오늘'
                    ? 'border-pullim-danger/30 hover:border-pullim-danger/50 hover:bg-pullim-danger/5'
                    : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/30',
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-pullim-slate-900 line-clamp-1 text-sm font-bold">
                    {a.title}
                  </span>
                </div>
                <Chip tone={dDayChipTone(a.dDay)}>
                  {a.dDay}
                </Chip>
                <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
