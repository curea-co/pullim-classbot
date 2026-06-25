'use client';

import { Feather } from 'lucide-react';

/**
 * 가벼운 모드 넛지 — 저조 신호가 있는 날 홈 상단에 노출. spec §8.
 * 자동으로 학습을 바꾸지 않고, 학생이 '가볍게 가기'로 opt-in 하도록 제안.
 * palette-safe(blue/slate, amber/green 금지), 토큰만, 44px, focus-visible.
 */
export function LightDayNudge({ onEnable }: { onEnable: () => void }) {
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-pullim-blue-100 bg-pullim-blue-50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pullim-blue-100">
        <Feather className="h-5 w-5 text-pullim-blue-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-pullim-slate-900">오늘 컨디션이 무거워 보여요</p>
        <p className="text-xs text-pullim-slate-500">핵심 하나만 가볍게 가볼까요?</p>
      </div>
      <button
        type="button"
        onClick={onEnable}
        className="min-h-11 shrink-0 rounded-xl bg-pullim-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
      >
        가볍게 가기
      </button>
    </section>
  );
}
