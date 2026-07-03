'use client';

import { Feather } from 'lucide-react';

/**
 * Light Day 해제 안전망 — [평소대로 보기]가 있는 표면(TodoPanel light·오늘의 한 가지)이
 * 렌더되지 않는 화면(클래스 0개 홈, 튜터 0개 self 홈)에서도 같은 날 원복 계약(spec §3/§8)을
 * 지키기 위한 최소 스트립 (Codex #182 R3). palette-safe(blue/slate), 44px, focus-visible.
 */
export function LightDayExitStrip({ onExit }: { onExit: () => void }) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-xl border border-pullim-blue-100 bg-pullim-blue-50 px-3 py-2">
      <p className="text-pullim-slate-600 inline-flex min-w-0 items-center gap-1.5 text-xs">
        <Feather className="text-pullim-blue-600 h-3.5 w-3.5 shrink-0" aria-hidden />
        오늘은 가볍게 가는 중이에요.
      </p>
      <button
        type="button"
        onClick={onExit}
        className="text-pullim-blue-600 hover:text-pullim-blue-700 min-h-11 shrink-0 rounded-lg px-2 text-xs font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
      >
        평소대로 보기
      </button>
    </section>
  );
}
