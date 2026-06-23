'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TutorUnit } from '@/lib/mock/classbot-official';

const STEPS = [
  { num: 1, label: '개념 학습' },
  { num: 2, label: '연습 퀴즈' },
  { num: 3, label: '점검' },
] as const;

export function LearningPath({ tutorId, unit }: { tutorId: string; unit: TutorUnit }) {
  return (
    <nav
      aria-label={`${unit.title} 학습 경로`}
      className="flex items-center gap-0"
    >
      {STEPS.map((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === STEPS.length - 1;

        const badge = (
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-2xs font-bold',
              isFirst
                ? 'bg-pullim-blue-600 text-white'
                : 'bg-pullim-slate-100 text-pullim-slate-400',
            )}
            aria-hidden="true"
          >
            {step.num}
          </span>
        );

        const labelEl = (
          <span
            className={cn(
              'text-xs font-semibold leading-tight',
              isFirst ? 'text-pullim-blue-700' : 'text-pullim-slate-400',
            )}
          >
            {step.label}
          </span>
        );

        const hintEl = !isFirst ? (
          <span className="text-micro text-pullim-slate-400">준비 중</span>
        ) : null;

        const connector = !isLast ? (
          <span
            className="mx-1.5 h-px w-6 shrink-0 bg-pullim-slate-200"
            aria-hidden="true"
          />
        ) : null;

        if (isFirst) {
          return (
            <div key={step.num} className="flex items-center">
              <Link
                href={`/classbot/chat?bot=${tutorId}`}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-xl px-3',
                  'bg-pullim-blue-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
                  'transition-colors hover:bg-pullim-blue-100',
                )}
                aria-label={`${unit.title} — ${step.label}`}
              >
                {badge}
                {labelEl}
              </Link>
              {connector}
            </div>
          );
        }

        return (
          <div key={step.num} className="flex items-center">
            <div
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-xl px-3',
                'bg-pullim-slate-50',
              )}
              aria-label={`${step.label} — 준비 중`}
            >
              {badge}
              <div className="flex flex-col gap-0.5">
                {labelEl}
                {hintEl}
              </div>
            </div>
            {connector}
          </div>
        );
      })}
    </nav>
  );
}
