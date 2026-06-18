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
 * 8단계 위저드 진행 표시.
 * 모바일(< sm): 단계 N/8 + 현재 레이블 + 8-세그먼트 슬림 트랙.
 * 데스크탑(sm+): 완전한 레이블 그리드.
 */
export function StepIndicator({ steps, current, onJump }: Props) {
  const currentStep = steps.find(s => s.num === current);
  const total = steps.length;

  return (
    <nav aria-label="봇 빌더 진행" className="bg-card overflow-hidden rounded-2xl border">
      {/* ── 모바일 컴팩트 뷰 (< sm) ── */}
      <div className="sm:hidden px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-pullim-slate-500 font-mono font-bold">
            단계 {current} / {total}
          </span>
          <span className="text-pullim-blue-700 font-bold">
            {currentStep?.label}
          </span>
        </div>
        {/* 8-세그먼트 슬림 트랙 */}
        <div className="flex gap-1" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={`${current}단계 / ${total}단계 진행`}>
          {steps.map(s => (
            <button
              key={s.num}
              type="button"
              onClick={() => onJump(s.num)}
              aria-label={`${s.num}단계 ${s.label}으로 이동`}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s.num < current
                  ? 'bg-pullim-blue-400'
                  : s.num === current
                  ? 'bg-pullim-blue-600'
                  : 'bg-pullim-slate-200',
              )}
            />
          ))}
        </div>
      </div>

      {/* ── 데스크탑 전체 그리드 (sm+) ── */}
      <ol className="hidden sm:grid grid-cols-8 divide-pullim-slate-100 divide-x">
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
                    isDone && 'bg-pullim-blue-400 text-white',
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
