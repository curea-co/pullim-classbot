'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnitProgress } from '@/lib/store/self-learning';
import { getUnitContent } from '@/lib/mock/classbot-learning-content';
import type { TutorUnit } from '@/lib/mock/classbot-official';

const STEPS = [
  { num: 1, label: '개념 학습', progressKey: 'concept' },
  { num: 2, label: '연습 퀴즈', progressKey: 'practice' },
  { num: 3, label: '점검',     progressKey: 'check' },
] as const;

export function LearningPath({ tutorId, unit }: { tutorId: string; unit: TutorUnit }) {
  const progress = useUnitProgress(tutorId, unit.id);
  const hasContent = getUnitContent(tutorId, unit.id) !== null;

  return (
    <nav
      aria-label={`${unit.title} 학습 경로`}
      className="flex items-center gap-0"
    >
      {STEPS.map((step, idx) => {
        const isLast = idx === STEPS.length - 1;
        const done: boolean = progress[step.progressKey];

        // 끝난 단계는 **체크 모양**으로, 지금 단계는 **테두리 원**으로 갈린다 — 초록 없이도 구분된다
        const badge = done ? (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pullim-blue-600"
            aria-hidden="true"
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </span>
        ) : (
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-2xs font-bold',
              idx === 0
                ? 'text-pullim-blue-700 ring-pullim-blue-500 bg-white ring-2 ring-inset'
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
              done
                // 끝난 단계는 물러난다 — 지금 할 단계만 굵게 남는다
                ? 'text-pullim-slate-600'
                : idx === 0
                  ? 'text-pullim-blue-700 font-bold'
                  : 'text-pullim-slate-400',
            )}
          >
            {step.label}
          </span>
        );

        const connector = !isLast ? (
          <span
            className="mx-1.5 h-px w-6 shrink-0 bg-pullim-slate-200"
            aria-hidden="true"
          />
        ) : null;

        return (
          <div key={step.num} className="flex items-center">
            {hasContent ? (
              <Link
                href={`/classbot/learn/${tutorId}/${unit.id}`}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-xl px-3',
                  done
                    ? 'bg-pullim-slate-50 hover:bg-pullim-slate-100'
                    : idx === 0
                      ? 'bg-pullim-blue-50 hover:bg-pullim-blue-100'
                      : 'bg-pullim-slate-50 hover:bg-pullim-slate-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
                  'transition-colors',
                )}
                aria-label={`${unit.title} — ${step.label}${done ? ' (완료)' : ''}`}
              >
                {badge}
                {labelEl}
              </Link>
            ) : (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                aria-label={`${unit.title} — ${step.label} (준비 중)`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pullim-slate-100 font-mono text-2xs font-bold text-pullim-slate-400"
                  aria-hidden="true"
                >
                  {step.num}
                </span>
                <span className="text-xs font-semibold leading-tight text-pullim-slate-400">
                  {step.label}
                  <span className="ml-1 text-2xs font-normal">준비 중</span>
                </span>
              </div>
            )}
            {connector}
          </div>
        );
      })}
    </nav>
  );
}
