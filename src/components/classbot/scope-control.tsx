'use client';

import { useState } from 'react';
import { Shield, AlarmClock } from 'lucide-react';
import { type ScopeLevel, scopeMeta, myClassBot } from '@/lib/mock';
import { cn } from '@/lib/utils';

const levels: ScopeLevel[] = [1, 2, 3, 4, 5];

/**
 * 교사 전용 — Scope Guard 5단계 가로 셀렉터.
 * 핸드오프 4.2 (학생 UI엔 없는 교사 전용 컨트롤).
 * 변경 시 감사 로그 기록을 안내.
 */
export function ScopeControl() {
  const [scope, setScope] = useState<ScopeLevel>(myClassBot.scope);

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <Shield className="text-pullim-blue-600 h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-pullim-slate-900 text-sm font-bold">Scope Guard</h2>
          <p className="text-pullim-slate-500 text-[11px]">
            봇이 답할 수 있는 범위 · 변경 시 감사 로그에 기록
          </p>
        </div>
        <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold">
          현재 {scopeMeta[scope].short}
        </span>
      </header>

      <div role="radiogroup" aria-label="Scope Guard 단계" className="flex gap-1.5">
        {levels.map(l => {
          const m = scopeMeta[l];
          const active = l === scope;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScope(l)}
              className={cn(
                'flex-1 rounded-lg border-2 p-2 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                active
                  ? 'border-pullim-blue-500 bg-pullim-blue-50'
                  : 'border-pullim-slate-200 hover:border-pullim-slate-400',
              )}
            >
              <div className={cn(
                'font-mono text-xs font-bold',
                active ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
              )}>
                {m.short}
              </div>
              <div className={cn(
                'text-[11px] font-bold',
                active ? 'text-pullim-slate-900' : 'text-pullim-slate-700',
              )}>
                {m.label}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-pullim-slate-500 mt-2.5 text-[11px] leading-relaxed">
        <strong className="text-pullim-slate-700">{scopeMeta[scope].label}</strong> ·
        {' '}{scopeMeta[scope].allow}
      </p>

      <div className="bg-pullim-warn-bg text-pullim-warn mt-2.5 flex items-start gap-1.5 rounded-lg p-2 text-[10px] leading-snug">
        <AlarmClock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span><strong>자동 스위치</strong>: 18:00–19:00 자동 L4(단계 힌트), 19:00–22:00 L3(개념), 22:00 이후 L5(답)</span>
      </div>
    </section>
  );
}
