'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Step = {
  num: number;
  label: string;
  icon: LucideIcon;
};

type Props = {
  steps: Step[];
  current: number;
  onJump: (n: number) => void;
};

/**
 * 8단계 위저드 진행 표시 — 데스크탑 가로, 모바일 세로 압축.
 * 완료 단계는 체크, 현재 단계는 강조, 미완 단계는 흐림.
 */
export function StepIndicator({ steps, current, onJump }: Props) {
  return (
    <nav aria-label="봇 빌더 진행" className="bg-card overflow-hidden rounded-2xl border">
      <ol className="grid grid-cols-4 sm:grid-cols-8 divide-pullim-slate-100 divide-x">
        {steps.map(s => {
          const isActive = s.num === current;
          const isDone = s.num < current;
          const Icon = s.icon;
          return (
            <li key={s.num}>
              <button
                type="button"
                onClick={() => onJump(s.num)}
                className={cn(
                  'group flex w-full flex-col items-center gap-1 px-2 py-3 text-center transition-colors',
                  isActive && 'bg-pullim-blue-50',
                  !isActive && 'hover:bg-pullim-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-bold transition-colors',
                    isDone && 'bg-pullim-success text-white',
                    isActive && 'bg-pullim-blue-600 text-white',
                    !isDone && !isActive && 'bg-pullim-slate-100 text-pullim-slate-500',
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[10px] font-bold leading-tight',
                    isActive ? 'text-pullim-blue-700' : isDone ? 'text-pullim-slate-700' : 'text-pullim-slate-400',
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
