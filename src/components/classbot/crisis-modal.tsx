'use client';

import { useEffect } from 'react';
import { Heart, MessageCircle, Phone } from 'lucide-react';
import type { KeywordHit } from '@/lib/safety/keyword-gate';

/**
 * 키워드 게이트 인터셉트 — 학생 가시 부드러운 모달.
 * spec 13 § 4.4, 5.2, 8.2.
 *
 * 원칙:
 * - 진단 단어·점수 노출 금지 ("우울", "위기" 같은 라벨 X)
 * - 함께 있는 사람들이 있다는 메시지 우선
 * - "넘기기" 옵션도 제공 — 강제 차단이 또 다른 압박이 되지 않게
 */
export function CrisisModal({
  hit, studentName, onClose,
}: {
  hit: KeywordHit;
  studentName?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    // 백그라운드: 3자 알림은 caller에서 처리 (responsibility 분리)
    // 모달 단독 책임은 학생 UI만.
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-pullim-slate-900/60 backdrop-blur-sm sm:items-center"
    >
      <div className="bg-card relative w-full max-w-md rounded-t-3xl p-6 shadow-pullim-md sm:rounded-3xl">
        {/* 부드러운 grab bar (모바일) */}
        <div className="bg-pullim-slate-200 mx-auto mb-4 h-1 w-10 rounded-full sm:hidden" aria-hidden />

        <div className="bg-pullim-blue-100 text-pullim-blue-700 mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <Heart className="h-7 w-7" />
        </div>

        <h2 id="crisis-modal-title" className="text-pullim-slate-900 mt-4 text-center text-lg font-bold">
          {studentName ? `${studentName}, ` : ''}지금 마음이 무거워 보여
        </h2>
        <p className="text-pullim-slate-600 mt-2 text-center text-sm leading-relaxed">
          혼자 끌어안지 않아도 돼.
          <br />
          도와줄 사람이 곁에 있어.
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold text-white"
            onClick={onClose}
          >
            <MessageCircle className="h-4 w-4" />
            봇과 먼저 이야기해볼게
          </button>
          <a
            href="tel:1393"
            className="border-pullim-slate-200 text-pullim-slate-700 hover:bg-pullim-slate-50 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border py-3 text-sm font-bold"
          >
            <Phone className="h-4 w-4" />
            자살예방상담 1393 바로 걸기
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-pullim-slate-400 hover:text-pullim-slate-600 mt-4 inline-flex w-full justify-center text-xs"
        >
          나중에
        </button>

        <p className="text-pullim-slate-400 mt-4 text-center text-[10px] leading-relaxed">
          이 메시지는 선생님께도 부드럽게 전달됐어요. 곧 연락할 거예요.
        </p>
      </div>
    </div>
  );
}
