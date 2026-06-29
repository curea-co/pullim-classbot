'use client';

import { BookOpen, Lightbulb, ListChecks, Check } from 'lucide-react';
import { useLessonProgress, type LessonPhase } from '@/lib/store/lesson-progress';
import { cn } from '@/lib/utils';

/**
 * 레슨 진도 맵 — 4단 스텝퍼(개념→예제→퀴즈→정리)(A1).
 *
 * 색 외 단서 필수(WCAG 1.4.1): done=흰 Check 아이콘(도형), current=라벨 font-bold(타이포),
 * pending=스텝 아이콘. blue/slate 만 사용(녹·앰버 금지). 비클릭 표시 전용.
 */

type StepMeta = { phase: LessonPhase; label: string; Icon: typeof BookOpen };

const STEPS: StepMeta[] = [
  { phase: 'concept', label: '개념', Icon: BookOpen },
  { phase: 'example', label: '예제', Icon: Lightbulb },
  { phase: 'quiz', label: '퀴즈', Icon: ListChecks },
  { phase: 'summary', label: '정리', Icon: Check },
];

const STATE_KO: Record<'done' | 'current' | 'pending', string> = {
  done: '완료',
  current: '진행 중',
  pending: '예정',
};

export function LessonProgressMap({
  botId,
  userId,
  variant = 'rail',
}: {
  botId: string;
  userId: string;
  variant?: 'rail' | 'inline';
}) {
  const { visited, current } = useLessonProgress(userId, botId);

  return (
    <nav
      aria-label="레슨 진도"
      data-slot="lesson-progress-map"
      data-variant={variant}
      className="px-1 py-1"
    >
      <ol role="list" className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isVisited = visited.includes(step.phase);
          const isCurrent = step.phase === current;
          const state: 'done' | 'current' | 'pending' = isVisited
            ? isCurrent
              ? 'current'
              : 'done'
            : 'pending';
          // 연결선(이전 스텝까지 방문 완료면 blue, 아니면 slate)
          const prevVisited = i > 0 && visited.includes(STEPS[i - 1].phase);
          return (
            <li key={step.phase} className="flex min-w-0 items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'mx-1 h-px w-3 shrink-0 sm:w-5',
                    prevVisited && isVisited ? 'bg-pullim-blue-300' : 'bg-pullim-slate-200',
                  )}
                />
              )}
              <div
                className="flex min-w-0 items-center gap-1.5"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.label} — ${STATE_KO[state]}`}
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    state === 'done' && 'bg-pullim-blue-600 text-white',
                    state === 'current' &&
                      'ring-2 ring-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700',
                    state === 'pending' && 'bg-pullim-slate-100 text-pullim-slate-400',
                  )}
                >
                  {state === 'done' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <step.Icon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span
                  className={cn(
                    'truncate text-xs',
                    state === 'current'
                      ? 'text-pullim-blue-700 font-bold'
                      : state === 'done'
                        ? 'text-pullim-slate-700 font-semibold'
                        : 'text-pullim-slate-400 font-medium',
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
