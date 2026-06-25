'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { type Replay } from '@/lib/mock';
import { type WeakPoint } from '@/lib/mock/classbot-replay-recap';
import { getReplayQuiz, type ExamQuestion } from '@/lib/mock/classbot-replay-exam';
import { useReplayStore } from '@/lib/store/replay';
import { ReplayRecap } from './replay-recap';
import { ReplayPlayer } from './replay-player';
import { ExamSheet } from './exam-sheet';

/**
 * 리플레이 상세 — 회고 카드 + (재도전 시) 시험지 패널 + 플레이어 합성. spec §6·§7.
 * 회고의 다시보기/다시풀기 → 플레이어 seek; 다시풀기 정답 → 약점 해결 표시(persist).
 */
export function ReplayDetail({ replay }: { replay: Replay }) {
  const [seek, setSeek] = useState<{ atSec: number } | undefined>(undefined);
  const [active, setActive] = useState<{ key: string; question: ExamQuestion } | null>(null);
  const resolveWeakPoint = useReplayStore(s => s.resolveWeakPoint);

  function handleSeek(atSec: number) {
    setSeek({ atSec }); // 새 객체 → 플레이어 seek effect 트리거(같은 지점 반복도 동작)
  }

  function handleReattempt(w: WeakPoint) {
    const question = getReplayQuiz(replay.id, w.atSec);
    if (!question) return;
    setSeek({ atSec: w.atSec });
    setActive({ key: w.key, question });
  }

  function handleResult(correct: boolean) {
    if (correct && active) resolveWeakPoint(replay.id, active.key);
  }

  return (
    <div className="space-y-4">
      <ReplayRecap replay={replay} onSeek={handleSeek} onReattempt={handleReattempt} />

      {active && (
        <section className="relative">
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="시험지 닫기"
            className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-pullim-slate-100 text-pullim-slate-500 hover:bg-pullim-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
          >
            <X className="h-4 w-4" />
          </button>
          {/* key=약점 → 문항 교체 시 ExamSheet 상태 초기화 */}
          <ExamSheet key={active.key} question={active.question} onResult={handleResult} />
        </section>
      )}

      <ReplayPlayer replay={replay} seekSignal={seek} />
    </div>
  );
}
