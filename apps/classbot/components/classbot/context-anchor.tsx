'use client';

import { Compass } from 'lucide-react';
import type { LessonConcept } from '@/lib/mock/classbot-lesson';

/**
 * 컨텍스트 앵커 — "지금 보는 개념" 위치 표시 + 1탭 재진입(A6).
 *
 * scroll div 밖 비스크롤 헤더에 렌더되므로 sticky 불필요(컨테이너에 sticky 클래스 미부여).
 * concept 미지정(첫 진입)이면 렌더하지 않는다.
 * 색: blue/slate 만. 좌측 라이너는 botSigHex inline borderLeftColor(검증된 예외 패턴).
 */
export function ContextAnchor({
  concept,
  botSigHex,
  onJump,
}: {
  concept: LessonConcept | undefined;
  botSigHex: string;
  onJump: () => void;
}) {
  if (!concept) return null;
  return (
    <button
      type="button"
      onClick={onJump}
      aria-label={`지금 보는 개념: ${concept.title} — 다시 보기`}
      data-slot="context-anchor"
      style={{ borderLeftColor: botSigHex }}
      className="bg-card border-pullim-blue-200 focus-visible:ring-2 focus-visible:ring-pullim-blue-400 flex w-full min-h-[44px] items-center gap-2 rounded-xl border border-l-[3px] px-3 py-2 text-left outline-none"
    >
      <Compass aria-hidden className="text-pullim-blue-600 h-4 w-4 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-pullim-blue-700 text-2xs font-bold tracking-wide uppercase">
          지금 보는 개념
        </span>
        <span className="text-pullim-slate-900 truncate text-sm font-bold">{concept.title}</span>
      </span>
      <span className="text-pullim-blue-700 shrink-0 text-xs font-bold">이 개념으로 ↑</span>
    </button>
  );
}
