'use client';

import { Fragment } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildYards, type YardNo } from './builder-types';

/**
 * 마당 셋을 오가는 자리 — **화면 폭과 무관하게 콘텐츠 위쪽 한 자리**다.
 *
 * 종전엔 넓은 화면 오른쪽 세로 레일과 좁은 화면 위쪽 가로 띠로 갈라져 있었다.
 * 같은 단계가 화면 크기에 따라 다른 자리에 나오면 교사가 자리를 두 번 익혀야 한다.
 * 하나로 모으고, 사이에 「›」를 두어 1 → 2 → 3 으로 나아가는 것임을 보인다.
 */
export function YardSteps({
  current, onJump,
}: {
  current: YardNo;
  onJump: (yard: YardNo) => void;
}) {
  return (
    <nav aria-label="봇 빌더 단계" className="bg-card rounded-2xl border p-1.5">
      <ol className="flex items-center">
        {buildYards.map((y, i) => {
          const isActive = y.group === current;
          const isDone = y.group < current;
          return (
            <Fragment key={y.group}>
              {i > 0 && (
                <ChevronRight aria-hidden className="text-pullim-slate-300 h-3.5 w-3.5 shrink-0" />
              )}
              <li className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onJump(y.group)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 transition-colors',
                    isActive ? 'bg-pullim-blue-50' : 'hover:bg-pullim-slate-50',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-micro font-bold',
                      isActive
                        ? 'bg-pullim-blue-600 text-white'
                        : isDone
                          ? 'bg-pullim-blue-100 text-pullim-blue-700'
                          : 'bg-pullim-slate-100 text-pullim-slate-600',
                    )}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : y.badge}
                  </span>
                  <span
                    className={cn(
                      'truncate text-2xs font-bold',
                      isActive
                        ? 'text-pullim-blue-700'
                        : isDone
                          ? 'text-pullim-slate-700'
                          : 'text-pullim-slate-500',
                    )}
                  >
                    {y.title}
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
