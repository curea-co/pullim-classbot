'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  alwaysOnSafety, summaryRows, yardGroups,
  type BotDraft, type BuilderView, type YardNo,
} from './builder-types';

/**
 * 「채워진 것」 — 학생 화면 미리보기가 없는 이 화면의 유일한 길잡이.
 *
 * 아홉 줄을 마당별로 묶어 **항목 이름 : 값** 만 보여준다.
 * 배지도, 줄마다 붙던 「고치기」도, 몇 가지를 직접 정했는지 세는 숫자도 없다 —
 * 오갈 자리는 위쪽 「단계」 하나로 모았고, 값은 줄이 그대로 보여준다.
 * 값이 바뀐 줄은 짧게 파랗게 번진다 — 미리보기가 없으니 여기서라도 변화를 알아채야 한다.
 *
 * 안전 세 가지는 아홉 줄 밖 고정 줄이다. 교사가 정할 것이 없어 목록에 섞지 않는다.
 */

type Props = {
  draft: BotDraft;
  view: BuilderView;
  /** 지금 보고 있는 마당 — 묶음 머리의 「지금」 표시 */
  yard: YardNo;
  /** 만든 뒤 화면은 이미 카드 안이라 테두리를 걷어낸다 */
  className?: string;
};

/** 값이 방금 바뀐 자리 — 들어올 때는 바로 파랗게, 나갈 때만 천천히 사그라든다. */
function justFlash(on: boolean): string {
  return on ? 'bg-pullim-blue-100' : 'bg-transparent transition-colors duration-1000';
}

export function FilledSummary({ draft, view, yard, className }: Props) {
  const rows = summaryRows(draft, view);
  const just = useJustChanged(rows.map((r) => `${r.field}:${r.value}`));

  return (
    <section className={cn('bg-card rounded-2xl border p-4', className)}>
      <h2 className="text-pullim-slate-900 mb-1 text-sm font-bold tracking-tight">채워진 것</h2>

      {yardGroups.map((g) => {
        const mine = rows.filter((r) => r.group === g.group);
        if (mine.length === 0) return null;
        const now = view === 'done' ? g.group === 4 : g.group === yard;

        return (
          <div key={g.group}>
            <div className="border-pullim-slate-100 mt-3 flex items-center gap-1.5 border-b pb-1.5">
              <span
                aria-hidden
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full text-micro font-bold',
                  now ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-600',
                )}
              >
                {g.badge}
              </span>
              <span className={cn('text-2xs font-bold', now ? 'text-pullim-blue-700' : 'text-pullim-slate-600')}>
                {g.title}
              </span>
              {now && (
                <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-1.5 py-0.5 text-micro font-bold">
                  지금
                </span>
              )}
            </div>

            {mine.map((r) => (
              <div
                key={r.field}
                data-testid={`summary-row-${r.field}`}
                className={cn(
                  'border-pullim-slate-100 flex items-baseline gap-2 rounded-lg border-b px-1.5 py-2 last:border-b-0',
                  justFlash(just.has(r.field)),
                )}
              >
                <span className="text-pullim-slate-500 w-14 shrink-0 text-2xs font-bold">{r.label}</span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-xs leading-snug font-semibold',
                    r.placeholder ? 'text-pullim-slate-400 font-medium' : 'text-pullim-slate-900',
                  )}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <p className="bg-pullim-blue-50 text-pullim-blue-800 mt-3 flex items-start gap-2 rounded-xl p-3 text-micro leading-relaxed">
        <ShieldCheck className="text-pullim-blue-600 mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <b>{alwaysOnSafety.join(' · ')}</b>은 모든 봇에 늘 켜져 있어요. 여기서 끌 수 없어요.
        </span>
      </p>
    </section>
  );
}

/**
 * 방금 바뀐 줄 집어내기.
 * 첫 그리기에는 아무것도 번지지 않는다 — 화면에 들어서자마자 아홉 줄이 다 번지면 아무 뜻이 없다.
 */
function useJustChanged(signatures: string[]): Set<string> {
  const key = signatures.join('|');
  const prev = useRef<string[] | null>(null);
  const [just, setJust] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = key.split('|');
    const before = prev.current;
    prev.current = next;
    if (!before || before.length !== next.length) return;

    const changed = next
      .filter((s, i) => s !== before[i])
      .map((s) => s.split(':')[0]);
    if (changed.length === 0) return;

    setJust(new Set(changed));
    const timer = setTimeout(() => setJust(new Set()), 1100);
    return () => clearTimeout(timer);
  }, [key]);

  return just;
}
