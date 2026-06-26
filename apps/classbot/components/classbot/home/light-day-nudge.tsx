'use client';

import { Feather } from 'lucide-react';

/**
 * 가벼운 모드 넛지 — 저조 신호가 있는 날 홈 상단에 노출. spec §8.
 * 학생 가시 카피는 권위 13 §8.2 의 승인 문구를 그대로 사용한다(문안 자체가 정책):
 * "이번 주 좀 무거웠지. 같이 가볍게 가보자." 자동으로 학습을 바꾸지 않고, '가볍게 가기'로 opt-in.
 * palette-safe(blue/slate, amber/green 금지), 토큰만, 44px, focus-visible.
 */
export function LightDayNudge({ onEnable }: { onEnable: () => void }) {
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-pullim-blue-100 bg-pullim-blue-50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pullim-blue-100">
        <Feather className="h-5 w-5 text-pullim-blue-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-pullim-slate-900">이번 주 좀 무거웠지</p>
        <p className="text-xs text-pullim-slate-500">같이 가볍게 가보자</p>
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
