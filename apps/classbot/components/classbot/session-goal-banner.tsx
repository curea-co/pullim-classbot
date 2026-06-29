'use client';

import { Target } from 'lucide-react';
import type { ClassBot } from '@/lib/mock';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { useSessionProgress } from '@/lib/store/session-goal';
import { cn } from '@/lib/utils';

/**
 * 세션 목표 배너 — "오늘의 한 가지" + 진행 점 3개(B7).
 *
 * session-goal store 의 **유일 실시간 구독자**(summary 버블은 구독 안 함).
 * 진행 점은 aria-hidden(색단독·중복 announce 제거), 진척은 컨테이너 aria-label 텍스트로 전달.
 * 색: blue/slate 만. 비인터랙티브(focus 대상 없음).
 */
export function SessionGoalBanner({ bot, goalKey }: { bot: ClassBot; goalKey: string }) {
  const lesson = getBotLesson(bot.id);
  const progress = useSessionProgress(goalKey);
  const goal = lesson.sessionGoal ?? lesson.topic;
  const steps = [progress.concept, progress.example, progress.quiz];
  const doneCount = steps.filter(Boolean).length;

  return (
    <section
      data-slot="session-goal"
      aria-label={`개념/예제/퀴즈 완료 ${doneCount}/3`}
      className="bg-card border-pullim-blue-200 flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2"
    >
      <span
        aria-hidden
        className="bg-pullim-blue-600 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
      >
        <Target className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-pullim-blue-500 text-2xs font-bold tracking-wide uppercase">
          오늘의 한 가지
        </div>
        <div className="text-pullim-slate-900 truncate text-sm font-bold">{goal}</div>
      </div>
      <div aria-hidden className="flex shrink-0 items-center gap-1">
        {steps.map((done, i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full',
              done ? 'bg-pullim-blue-600' : 'bg-pullim-slate-200',
            )}
          />
        ))}
      </div>
    </section>
  );
}
