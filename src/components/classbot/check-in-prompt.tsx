'use client';

import Link from 'next/link';
import { Heart, Clock, X } from 'lucide-react';

/**
 * 봇 채팅 진입 시 체크인 미완료 권유 모달.
 * spec 13 § 4.1 — Flow R1 부드러운 인터셉트.
 *
 * 원칙:
 * - 강제 차단 X — "나중에"로 닫을 수 있음
 * - 짧은 카피 ("30초")로 부담 줄임
 * - 닫으면 localStorage에 1일 flag 저장 (caller에서 처리)
 */
export function CheckInPrompt({ onSkip }: { onSkip: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-prompt-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-pullim-slate-900/40 backdrop-blur-sm sm:items-center"
    >
      <div className="bg-card relative w-full max-w-md rounded-t-3xl p-6 shadow-pullim-md sm:rounded-3xl">
        <div className="bg-pullim-slate-200 mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" aria-hidden />

        <button
          type="button"
          onClick={onSkip}
          aria-label="닫기"
          className="text-pullim-slate-400 hover:text-pullim-slate-700 absolute right-4 top-4"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-pullim-warn/15 text-pullim-warn mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Heart className="h-6 w-6" />
        </div>

        <h2 id="checkin-prompt-title" className="text-pullim-slate-900 mt-3 text-center text-base font-bold">
          오늘 어땠어?
        </h2>
        <p className="text-pullim-slate-500 mt-1 text-center text-xs leading-relaxed">
          하나만 짚고 가자.
          <br className="sm:hidden" />
          <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
          30초면 끝나.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="border-pullim-slate-200 text-pullim-slate-600 hover:bg-pullim-slate-50 rounded-2xl border py-3 text-xs font-bold"
          >
            나중에
          </button>
          <Link
            href="/classbot/wellness/check-in"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center justify-center gap-1 rounded-2xl py-3 text-xs font-bold text-white"
          >
            지금 체크인
          </Link>
        </div>
      </div>
    </div>
  );
}
