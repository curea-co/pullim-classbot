'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildYards, type YardNo } from './builder-types';

/**
 * 마당 셋을 오가는 자리.
 *
 * 넓은 화면(xl+)에서는 오른쪽 세로 목록, 좁은 화면에서는 위쪽 가로 띠로 **바뀐다**.
 * 둘을 같이 띄우지 않는다 — 같은 단계가 화면에 두 번 나오면 어느 쪽을 눌러야 하는지 물음이 생긴다.
 *
 * xl(1280px)을 가른 이유: 교사 셸의 왼쪽 레일을 빼고 나면 이 아래에서는 본문과 오른쪽 패널을
 * 나란히 둘 만한 너비가 안 나온다.
 */

type Props = {
  current: YardNo;
  onJump: (yard: YardNo) => void;
};

/** 끝까지 갈 필요가 없다는 말은 두 모양 모두에 붙인다 — 한쪽에만 있으면 화면 크기에 따라 안내가 사라진다. */
const skipHint = (
  <>
    끝까지 갈 필요는 없어요. 어느 마당에서든 <b>「이대로 만들기」</b>를 누르면 남은 항목은 기본값으로 들어가요.
  </>
);

function stepNumberClass(isActive: boolean, isDone: boolean): string {
  if (isActive) return 'bg-pullim-blue-600 text-white';
  if (isDone) return 'bg-pullim-blue-100 text-pullim-blue-700';
  return 'bg-pullim-slate-100 text-pullim-slate-600';
}

/** 좁은 화면(< xl) — 위쪽 가로 띠 */
export function YardStepBand({ current, onJump }: Props) {
  return (
    <nav aria-label="봇 빌더 단계" className="bg-card overflow-hidden rounded-2xl border xl:hidden">
      <ol className="divide-pullim-slate-100 grid grid-cols-3 divide-x">
        {buildYards.map((y) => {
          const isActive = y.group === current;
          const isDone = y.group < current;
          return (
            <li key={y.group}>
              <button
                type="button"
                onClick={() => onJump(y.group)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 px-2 py-2.5 text-center transition-colors',
                  isActive ? 'bg-pullim-blue-50' : 'hover:bg-pullim-slate-50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-micro font-bold',
                    stepNumberClass(isActive, isDone),
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : y.badge}
                </span>
                <span
                  className={cn(
                    'truncate text-2xs font-bold',
                    isActive ? 'text-pullim-blue-700' : isDone ? 'text-pullim-slate-700' : 'text-pullim-slate-500',
                  )}
                >
                  {y.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-pullim-slate-500 border-pullim-slate-100 border-t px-3 py-2 text-micro leading-relaxed">
        {skipHint}
      </p>
    </nav>
  );
}

/** 넓은 화면(xl+) — 오른쪽 세로 목록 */
export function YardStepRail({ current, onJump }: Props) {
  return (
    <section className="bg-card hidden rounded-2xl border p-4 xl:block">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-pullim-slate-900 text-sm font-bold tracking-tight">단계</h2>
        <p className="text-pullim-slate-500 text-2xs font-semibold">눌러서 오갈 수 있어요</p>
      </div>

      <ol aria-label="봇 빌더 단계" className="mt-2 space-y-0.5">
        {buildYards.map((y) => {
          const isActive = y.group === current;
          const isDone = y.group < current;
          return (
            <li key={y.group}>
              <button
                type="button"
                onClick={() => onJump(y.group)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                  isActive ? 'bg-pullim-blue-50' : 'hover:bg-pullim-slate-50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-micro font-bold',
                    stepNumberClass(isActive, isDone),
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : y.badge}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-xs font-bold', isActive ? 'text-pullim-blue-800' : 'text-pullim-slate-900')}>
                    {y.title}
                  </span>
                  <span className="text-pullim-slate-500 mt-0.5 block text-micro font-medium">{y.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="text-pullim-slate-500 mt-2.5 text-micro leading-relaxed">{skipHint}</p>
    </section>
  );
}
