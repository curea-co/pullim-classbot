'use client';

import { RotateCcw } from 'lucide-react';
import { useLessonActionStore } from '@/lib/store/lesson-action';
import { useProficiencyStore, useDueWeaknesses } from '@/lib/store/proficiency';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 복습할 약점 카드 — B1B2. 레일 상단(개념 리스트 위).
 *
 * due≤now 인 약점(퀴즈 오답 + 회고 약점)을 모아, '다시 풀기' 로 챗에 review 퀴즈를 주입한다.
 * 출처(source)는 색이 아니라 텍스트('퀴즈'/'회고')로 구분(WCAG 1.4.1).
 * due 가 없으면 미렌더, hydration 전에도 미렌더.
 */
export function WeaknessReviewCard({ botId, userId }: { botId: string; userId: string }) {
  const hydrated = useStoresHydrated(useProficiencyStore);
  const dueRaw = useDueWeaknesses(userId, botId);
  const dispatchLesson = useLessonActionStore((s) => s.dispatch);

  const due = hydrated ? dueRaw : [];
  if (due.length === 0) return null;

  return (
    <section className="border-pullim-blue-200 bg-card mb-3 rounded-2xl border p-3">
      <div className="text-pullim-blue-700 mb-2 flex items-center gap-1.5 text-sm font-bold">
        <RotateCcw aria-hidden className="h-4 w-4 shrink-0" />
        복습할 약점 {due.length}
      </div>
      <ul className="space-y-2">
        {due.map((w) => (
          <li
            key={w.key}
            className="border-pullim-slate-200 flex items-center gap-2 rounded-xl border p-2.5"
          >
            <span className="text-pullim-slate-800 min-w-0 flex-1 truncate text-[15px] font-bold">
              {w.label}
            </span>
            {/* 출처 칩 — 텍스트로 구분(색단독 아님). */}
            <span className="bg-pullim-slate-100 text-pullim-slate-600 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
              {w.source === 'quiz' ? '퀴즈' : '회고'}
            </span>
            <button
              type="button"
              onClick={() => dispatchLesson(botId, 'review', w.conceptId)}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 다시 풀기
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
