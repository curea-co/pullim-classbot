'use client';

import { useEffect, useRef } from 'react';
import { Lightbulb } from 'lucide-react';
import { useLessonActionStore } from '@/lib/store/lesson-action';
import {
  useMisconceptionStore,
  usePendingCoachTag,
  useMisconceptionCounts,
} from '@/lib/store/misconception';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { getBotLesson } from '@/lib/mock/classbot-lesson';
import { getDistractorMeta } from '@/lib/mock/classbot-distractor';

/**
 * 오개념 패턴 코칭 카드 — B6.
 *
 * 같은 함정 유형에 임계(2회) 도달하면 챗에 등장하는 격리 구독 컴포넌트.
 * `usePendingCoachTag` 구독을 **이 컴포넌트 안에만** 둬, 매 record 마다 chat-scroll
 * 전체가 리렌더되지 않도록 범위를 축소한다.
 *
 * **자동 바닥추적 한계 보정**: 이 카드는 record(오답) 후 turns/pending 변화 없이 등장하므로
 * 부모의 자동추적 effect(deps=[turns,pending])가 안 돈다. null→tag 전이 시 `onAppear()` 로
 * 부모에 알려 stickyRef 면 scrollToBottom('auto') 하게 한다.
 *
 * 색: blue 라이너 카드. **"이 유형 N번째" count 는 중립 slate(danger 빨강 미사용)** —
 * 코칭 카드의 격려 톤을 유지하고 색 의미 인플레이션을 막는다.
 */
export function MisconceptionCoaching({
  botId,
  userId,
  onAppear,
}: {
  botId: string;
  userId: string;
  onAppear?: () => void;
}) {
  const hydrated = useStoresHydrated(useMisconceptionStore);
  const pendingTagRaw = usePendingCoachTag(userId);
  const counts = useMisconceptionCounts(userId);
  const dispatchLesson = useLessonActionStore((s) => s.dispatch);

  // hydration 전에는 표시하지 않는다(SSR 일치 + 플래시 방지).
  const pendingTag = hydrated ? pendingTagRaw : null;
  const meta = getDistractorMeta(pendingTag ?? undefined);

  // null→tag 등장 시 1회 onAppear (부모 바닥추적). tag 가 바뀌어 재등장해도 알림.
  const prevTagRef = useRef<string | null>(null);
  useEffect(() => {
    if (pendingTag && prevTagRef.current !== pendingTag) {
      onAppear?.();
    }
    prevTagRef.current = pendingTag;
  }, [pendingTag, onAppear]);

  if (!pendingTag || !meta) return null;

  const count = counts[pendingTag] ?? 0;
  const lesson = getBotLesson(botId);
  const relatedConceptId = meta.relatedConceptId ?? lesson.quiz.relatedConceptId;

  function handleConcept() {
    if (relatedConceptId) dispatchLesson(botId, 'concept-detail', relatedConceptId);
    useMisconceptionStore.getState().markCoached(userId, pendingTag!);
  }

  function handleAck() {
    useMisconceptionStore.getState().markCoached(userId, pendingTag!);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-pullim-blue-50 border-l-pullim-blue-400 rounded-r-lg border-l-[3px] p-3"
    >
      <div className="text-pullim-blue-700 flex items-center gap-1.5 text-sm font-bold">
        <Lightbulb aria-hidden className="h-4 w-4 shrink-0" />
        오개념 패턴이 보여요
        {/* count — 중립 slate(danger 미사용). 색이 아니라 텍스트로 빈도 전달. */}
        <span className="text-pullim-slate-500 ml-auto text-xs font-semibold">
          이 유형 {count}번째
        </span>
      </div>
      <p className="text-pullim-slate-800 mt-1.5 text-[15px] leading-relaxed">{meta.coaching}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {relatedConceptId && (
          <button
            type="button"
            onClick={handleConcept}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            📘 개념 다시 보기
          </button>
        )}
        <button
          type="button"
          onClick={handleAck}
          className="bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200 focus-visible:ring-pullim-blue-400 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          확인했어요
        </button>
      </div>
    </div>
  );
}
