'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Radio } from 'lucide-react';
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
  light = false,
  onExitLight,
}: {
  incompleteAssignments: Assignment[];
  liveBots: BotSlot[];
  /** 가벼운 모드(Light Day) — 핵심 1개만 + 나머지 접기 + [평소대로 보기]. 데이터 불변, 렌더만. spec §4·§8 */
  light?: boolean;
  /** light 모드에서 [평소대로 보기] 클릭 → 가벼운 모드 해제 */
  onExitLight?: () => void;
}) {
  // light 모드 접힘 상태 — 펼치면 전체 목록(데이터는 원래 그대로).
  const [expanded, setExpanded] = useState(false);
  // light 해제 시 접힘 초기화 — 같은 세션에서 재진입해도 "핵심 1개 + 나머지 접기"로 시작 (Codex #182).
  useEffect(() => {
    if (!light) setExpanded(false);
  }, [light]);
  const isEmpty = incompleteAssignments.length === 0 && liveBots.length === 0;

  // light & 접힘: 라이브는 시간 민감이라 1개는 노출하되 멀티 라이브는 접고(패널이 가벼워야 함, R3),
  // 핵심 1개 = 가장 급한 incomplete 과제(이미 urgent-first 정렬, spec §8 — 라이브가 있어도 숨기지 않음, R1).
  const collapse = light && !expanded && !isEmpty;
  const visibleLiveBots = collapse ? liveBots.slice(0, 1) : liveBots;
  const visibleAssignments = collapse ? incompleteAssignments.slice(0, 1) : incompleteAssignments;
  const restCount =
    liveBots.length - visibleLiveBots.length +
    incompleteAssignments.length - visibleAssignments.length;

  return (
    <section>
      <SectionHeading title="오늘 할 일" />
      {light && !isEmpty && (
        <p className="text-pullim-slate-500 -mt-1 mb-2 text-xs">
          오늘은 이것 하나만 해도 충분해요.
        </p>
      )}
      {isEmpty ? (
        <div className="border-pullim-slate-100 rounded-xl border border-dashed bg-pullim-slate-50 px-4 py-6 text-center">
          <p className="text-pullim-slate-500 text-sm font-semibold">다 따라잡았어요 🎉</p>
          <p className="text-pullim-slate-400 mt-1 text-xs">봇과 자유롭게 대화하며 한 발 더 나가볼까요?</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {/* LIVE bots first — light 접힘에서도 1개는 노출(시간 민감), 멀티는 접힘 */}
          {visibleLiveBots.map(({ bot }) => (
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
          {visibleAssignments.map((a) => (
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

      {/* light 모드 푸터 — 나머지 접힘 안내 + 평소대로 복귀 (렌더만 바꾸고 데이터 불변).
          빈 상태에서도 [평소대로 보기]는 유지 — 없으면 low 신호+빈 할 일 조합에서 같은 날
          Light Day 를 해제할 방법이 없다 (Codex #182 R2). */}
      {light && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {restCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
            >
              나머지 {restCount}개 · 펼치기
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : (
            <span aria-hidden />
          )}
          <button
            type="button"
            onClick={onExitLight}
            className="text-pullim-blue-600 hover:text-pullim-blue-700 min-h-11 rounded-lg px-2 text-xs font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
          >
            평소대로 보기
          </button>
        </div>
      )}
    </section>
  );
}
