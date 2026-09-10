'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { type Replay } from '@/lib/mock';
import { type WeakPoint } from '@/lib/mock/classbot-replay-recap';
import { getReplayQuiz, type ExamQuestion } from '@/lib/mock/classbot-replay-exam';
import { useReplayStore } from '@/lib/store/replay';
import { USE_REAL_REQUIZ_BE } from '@/lib/features';
import { useRequiz } from '@/hooks/api/replay/use-requiz';
import { ReplayRecap } from './replay-recap';
import { ReplayPlayer } from './replay-player';
import { ExamSheet } from './exam-sheet';

/**
 * 리플레이 상세 — 회고 카드 + (재도전 시) 시험지 패널 + 플레이어 합성. spec §6·§7.
 * 회고의 다시보기/다시풀기 → 플레이어 seek; 다시풀기 정답 → 약점 해결 표시(persist).
 *
 * **학습 모드 게이트가 여기 있었다.** 저장된 모드가 `self` 면 회고 대신 「교사 수업
 * 리플레이예요」 안내를 띄우고 `setMode('class')` 버튼을 줬다. 그 분기를 걷는다 —
 * 자기주도는 이제 모드가 아니라 장소(`/classbot/my-bots`)이고, **모드 상태를 읽어 화면을
 * 가르지 않는다**(`proc/spec/2026-06-23_classbot-dual-mode-design.md` 2026-09-09 개정 박스
 * ①·§⑤ 대체표의 §1 「통째로 폐기」).
 *
 * 걷어야 하는 이유가 하나 더 있다: 헤더 토글이 비노출인 채 그 게이트만 남아 있으면, 예전에
 * `self` 를 저장해 둔 학생은 **리플레이를 열 때마다 없는 개념의 안내**를 먼저 본다. 저장값은
 * 이제 아무 화면도 읽지 않으므로 그대로 남아도 무해하다 — 마이그레이션이 필요 없다.
 */
export function ReplayDetail({ replay }: { replay: Replay }) {
  const [seek, setSeek] = useState<{ atSec: number } | undefined>(undefined);
  const [active, setActive] = useState<{ key: string; question: ExamQuestion; degraded?: boolean } | null>(null);
  const resolveWeakPoint = useReplayStore(s => s.resolveWeakPoint);
  const requiz = useRequiz(replay.id);

  function handleSeek(atSec: number) {
    setSeek({ atSec }); // 새 객체 → 플레이어 seek effect 트리거(같은 지점 반복도 동작)
  }

  function fallbackMock(w: WeakPoint) {
    const question = getReplayQuiz(replay.id, w.atSec);
    if (!question) return;
    setSeek({ atSec: w.atSec });
    setActive({ key: w.key, question });
  }

  function handleReattempt(w: WeakPoint) {
    if (USE_REAL_REQUIZ_BE) {
      requiz.mutate(undefined, {
        onSuccess: (res) => {
          const q = res.questions[0];
          if (q) {
            setSeek({ atSec: w.atSec });
            setActive({ key: w.key, question: q, degraded: res.degraded });
          } else {
            fallbackMock(w);
          }
        },
        onError: () => fallbackMock(w),
      });
    } else {
      fallbackMock(w);
    }
  }

  function handleResult(correct: boolean) {
    if (correct && active) resolveWeakPoint(replay.id, active.key);
  }

  return (
    <div className="space-y-4">
      <ReplayRecap replay={replay} onSeek={handleSeek} onReattempt={handleReattempt} />

      {/* 플레이어 — 다시보기/다시풀기 시 약점 시점으로 seek */}
      <ReplayPlayer replay={replay} seekSignal={seek} />

      {/* 재응시 문항 생성 중 — 실 BE(LLM)는 ~30–60s 걸릴 수 있어 빈 화면 오해를 막는다(ADR-066 ⑥). */}
      {requiz.isPending && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-pullim-slate-200 bg-card p-4 text-sm text-pullim-slate-600"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-pullim-blue-500" aria-hidden="true" />
          <span>비슷한 문제를 만들고 있어요… 최대 1분 정도 걸릴 수 있어요.</span>
        </div>
      )}

      {/* 다시 풀기 시험지 — 플레이어 바로 아래에 인라인으로 붙여 'seek된 맥락 + 풀이'를 같이 본다 */}
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
          {/* degraded=true → BE 가 mock 폴백으로 흡수한 예시 문항. 경량 배지로만 구분(UX 유지). */}
          {active.degraded && (
            <p className="mb-2 inline-flex rounded-full bg-pullim-slate-100 px-2.5 py-0.5 text-2xs font-bold text-pullim-slate-500">
              연습용 예시 문제
            </p>
          )}
          {/* key=약점 → 문항 교체 시 ExamSheet 상태 초기화 */}
          <ExamSheet key={active.key} question={active.question} onResult={handleResult} />
        </section>
      )}
    </div>
  );
}

/** self 모드 게이트 — 리플레이는 교사 수업 콘텐츠라 class 모드에서만 본다. */
