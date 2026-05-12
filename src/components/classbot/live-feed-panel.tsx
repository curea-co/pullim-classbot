'use client';

import { useState } from 'react';
import { Share2, Sparkles, EyeOff, MessageCircle } from 'lucide-react';
import { liveFeed, scopeMeta } from '@/lib/mock';
import { aiTierMeta } from '@/lib/tokens/tier';
import { cn } from '@/lib/utils';

/**
 * 교사 우측 패널 — 학생들이 봇에 물어본 것 실시간 피드.
 * 핸드오프 4.4 (학생이 봇에 "질문"할 때 교사 화면에 원문 표시 → "수업 전체 공유" 토글).
 */
export function LiveFeedPanel() {
  const [items, setItems] = useState(liveFeed);

  function toggleShared(id: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, shared: !i.shared } : i)));
  }

  return (
    <section className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border">
      <header className="border-pullim-slate-200 border-b p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-pullim-slate-900 text-sm font-bold">실시간 봇 질문 피드</h2>
          <span className="text-pullim-slate-400 text-[10px] font-mono">
            지난 10분 · {items.length}건
          </span>
        </div>
        <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
          학생 질문이 발생하는 즉시 표시 · “전체 공유”로 반에 노출 가능
        </p>
      </header>

      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map(q => {
          const scope = scopeMeta[q.scopeUsed];
          const tier = aiTierMeta[q.tier];
          return (
            <li key={q.id}>
              <article className={cn(
                'rounded-xl border p-3 transition-colors',
                q.shared ? 'bg-pullim-lemon/15 border-pullim-lemon-ink/30' : 'bg-pullim-slate-50',
              )}>
                <header className="mb-1.5 flex items-center gap-1.5 text-[10px]">
                  <span className="bg-pullim-blue-600 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                    {q.studentName[0]}
                  </span>
                  <span className="text-pullim-slate-700 font-semibold">{q.studentName}</span>
                  <span className="text-pullim-slate-400">·</span>
                  <span className="text-pullim-slate-500 font-mono">{q.agoMin === 0 ? '방금' : `${q.agoMin}분 전`}</span>
                  <span className="ml-auto inline-flex items-center gap-1">
                    <span
                      className="rounded-sm px-1 py-0.5 font-mono font-bold"
                      style={{ background: tier.bg, color: tier.color }}
                    >
                      {q.tier}
                    </span>
                    <span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-sm px-1 py-0.5 font-mono font-bold">
                      {scope.short}
                    </span>
                  </span>
                </header>

                <p className="text-pullim-slate-900 text-sm font-semibold">
                  {q.question}
                </p>
                <p className="text-pullim-slate-600 mt-1 line-clamp-2 flex items-start gap-1 text-[11px] leading-relaxed">
                  <MessageCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{q.botAnswerPreview}</span>
                </p>

                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleShared(q.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors',
                      q.shared
                        ? 'bg-pullim-lemon-ink text-pullim-lemon'
                        : 'bg-white border border-pullim-slate-200 text-pullim-slate-700 hover:border-pullim-blue-300',
                    )}
                  >
                    {q.shared ? <EyeOff className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                    {q.shared ? '공유 해제' : '전체 공유'}
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="준비 중 (v2)"
                    className="text-pullim-blue-600 rounded-full px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1 opacity-60 cursor-not-allowed"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden />
                    답 보강
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
