'use client';

import { useState } from 'react';
import { X, GraduationCap } from 'lucide-react';
import { type Replay } from '@/lib/mock';
import { type WeakPoint } from '@/lib/mock/classbot-replay-recap';
import { getReplayQuiz, type ExamQuestion } from '@/lib/mock/classbot-replay-exam';
import { useReplayStore } from '@/lib/store/replay';
import { useStudentMode } from '@/lib/store/student-mode';
import { ReplayRecap } from './replay-recap';
import { ReplayPlayer } from './replay-player';
import { ExamSheet } from './exam-sheet';

/**
 * 리플레이 상세 — 회고 카드 + (재도전 시) 시험지 패널 + 플레이어 합성. spec §6·§7.
 * 회고의 다시보기/다시풀기 → 플레이어 seek; 다시풀기 정답 → 약점 해결 표시(persist).
 */
export function ReplayDetail({ replay }: { replay: Replay }) {
  const { mode, setMode, hydrated } = useStudentMode();
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

  // 리플레이는 class 모드(교사 수업) 콘텐츠 — self 모드에선 후속 액션(교사봇 질문 등)이
  // 성립하지 않으므로 회고/플레이어 대신 모드 전환 게이트를 보여준다. hydration 전엔 스켈레톤.
  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-pullim-slate-100" aria-hidden="true" />;
  }
  if (mode === 'self') {
    return <ClassOnlyGate onSwitch={() => setMode('class')} />;
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

/** self 모드 게이트 — 리플레이는 교사 수업 콘텐츠라 class 모드에서만 본다. */
function ClassOnlyGate({ onSwitch }: { onSwitch: () => void }) {
  return (
    <section className="rounded-2xl border border-pullim-slate-200 bg-card p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pullim-blue-50">
        <GraduationCap className="h-6 w-6 text-pullim-blue-500" />
      </div>
      <h2 className="mt-3 text-base font-bold text-pullim-slate-900">교사 수업 리플레이예요</h2>
      <p className="mt-1 text-sm text-pullim-slate-500">이 회고는 교사 수업 모드에서 볼 수 있어요.</p>
      <button
        type="button"
        onClick={onSwitch}
        className="mt-4 min-h-11 rounded-xl bg-pullim-blue-600 px-4 text-sm font-bold text-white hover:bg-pullim-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
      >
        교사 수업 모드로 보기
      </button>
    </section>
  );
}
