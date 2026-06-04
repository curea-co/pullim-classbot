'use client';

import Link from 'next/link';
import { AlertCircle, Lock, RotateCw } from 'lucide-react';

/**
 * 읽기 4면(Phase 7 Stage 2) 공통 상태 카드 — 로그인 게이트 / 에러.
 * 데이터·로딩·빈 상태는 각 surface 가 자기 레이아웃으로 그린다.
 */

/** 비로그인 — 로그인월(D1). mock 을 보여주지 않고 로그인으로 유도한다. */
export function ReadLoginGate({ label = '내 정보' }: { label?: string }) {
  return (
    <section className="bg-pullim-slate-50 border-pullim-slate-200 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
      <span className="bg-pullim-slate-200 text-pullim-slate-500 flex h-10 w-10 items-center justify-center rounded-xl">
        <Lock className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-pullim-slate-900 text-sm font-bold">로그인이 필요해요</p>
      <p className="text-pullim-slate-500 text-[11px]">{label}를 보려면 먼저 로그인해 주세요.</p>
      <Link
        href="/login"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-1 inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-bold text-white transition-colors"
      >
        로그인하기
      </Link>
    </section>
  );
}

/** 읽기 실패 — 재시도 버튼. */
export function ReadErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <section className="bg-pullim-danger/5 border-pullim-danger/30 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
      <span className="bg-pullim-danger/10 text-pullim-danger flex h-10 w-10 items-center justify-center rounded-xl">
        <AlertCircle className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-pullim-slate-900 text-sm font-bold">불러오지 못했어요</p>
      <p className="text-pullim-slate-500 text-[11px]">잠시 후 다시 시도해 주세요.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border-pullim-slate-300 text-pullim-slate-700 hover:bg-pullim-slate-50 mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors"
        >
          <RotateCw className="h-3 w-3" />
          다시 시도
        </button>
      )}
    </section>
  );
}
