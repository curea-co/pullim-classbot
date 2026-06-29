'use client';

import { useState } from 'react';
import type { LessonStep } from '@/lib/mock/classbot-lesson';
import { cn } from '@/lib/utils';

/**
 * 예제 점진 스캐폴딩 카드 — B3.
 *
 * 처음 단계(시범)는 봇이 채워 보여주고, 뒤 단계(`fadable:true`)는 점선 빈칸으로 두어
 * 학생이 "정답 확인하기"로 직접 한 칸씩 공개하며 풀게 한다(fading worked example).
 *
 * **스크롤 추적(regression-critical)**: reveal 로 chat-scroll 높이가 늘지만 turns/pending
 * 변화가 아니라 ChatPanel 자동추적 effect(deps=[turns,pending])가 안 돈다 → 공개 시
 * `onReveal()` 로 부모에 알려, 부모가 stickyRef.current 면 scrollToBottom('auto')를 호출한다.
 *
 * 색 규약: blue/slate 만 (green/amber 금지).
 */
export function InlineWorkedExample({
  title,
  steps,
  onReveal,
}: {
  title?: string;
  steps: LessonStep[];
  onReveal?: () => void;
}) {
  // 첫 fadable 직전까지 자동 공개. 첫 fadable 인덱스가 없으면 전부 공개.
  const firstFadableIdx = steps.findIndex(s => s.fadable);
  const initialRevealedUpTo = firstFadableIdx < 0 ? steps.length : firstFadableIdx;
  const [revealedUpTo, setRevealedUpTo] = useState(initialRevealedUpTo);

  // 가장 가까운 미공개 단계만 활성(나머지 뒤 단계는 '앞 단계 먼저' disabled).
  const activeIdx = revealedUpTo; // 다음에 공개될 인덱스
  const allRevealed = revealedUpTo >= steps.length;

  function revealNext() {
    setRevealedUpTo(n => Math.min(n + 1, steps.length));
    // 공개 후 높이 증가 → 부모가 sticky 면 바닥 추적.
    onReveal?.();
  }

  return (
    <div className="bg-card border-pullim-slate-200 rounded-xl border p-3">
      {title && <p className="text-pullim-slate-900 mb-2 text-base font-bold">{title}</p>}
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const isRevealed = i < revealedUpTo;
          const isActive = i === activeIdx;
          if (isRevealed || !s.fadable) {
            // 공개됐거나 비-fadable(시범) 단계 — 기존 ol 렌더.
            return (
              <li
                key={s.num}
                className={cn('flex gap-2.5', i >= initialRevealedUpTo && 'pullim-anim-message-mount')}
              >
                <span className="bg-pullim-blue-600 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {s.num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 text-[15px] font-bold">{s.label}</div>
                  <div className="text-pullim-slate-600 mt-0.5 text-[15px] leading-relaxed">{s.body}</div>
                  {s.formula && (
                    <code className="bg-pullim-slate-50 text-pullim-slate-700 mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-xs">
                      {s.formula}
                    </code>
                  )}
                </div>
              </li>
            );
          }
          // 미공개 fadable 단계 — 점선 빈칸.
          return (
            <li key={s.num} className="flex gap-2.5">
              <span className="bg-pullim-slate-200 text-pullim-slate-500 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {s.num}
              </span>
              <div
                className="border-pullim-slate-300 bg-pullim-slate-100 min-w-0 flex-1 rounded-lg border border-dashed p-2.5"
                aria-label={`${s.num}단계 — 아직 가려진 단계`}
              >
                <div className="text-pullim-slate-400 text-[15px] font-semibold">{s.label}</div>
                <p className="text-pullim-slate-400 mt-0.5 text-sm">직접 떠올려본 뒤 정답을 확인해봐.</p>
                {isActive ? (
                  <button
                    type="button"
                    onClick={revealNext}
                    aria-expanded={false}
                    className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400 mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
                  >
                    정답 확인하기
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="bg-pullim-slate-100 text-pullim-slate-400 mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold disabled:opacity-60"
                  >
                    앞 단계 먼저
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {allRevealed && firstFadableIdx >= 0 && (
        <p className="text-pullim-blue-700 mt-2.5 text-sm font-bold">
          🎯 스스로 끝까지 풀었어요 — 잘했어요!
        </p>
      )}
    </div>
  );
}
