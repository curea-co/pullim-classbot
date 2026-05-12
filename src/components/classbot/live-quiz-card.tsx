'use client';

import { useState, useEffect } from 'react';
import { Zap, Check, Clock } from 'lucide-react';
import { currentQuiz } from '@/lib/mock';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 학생 뷰 — 라이브 퀴즈 참여 카드.
 * 핸드오프 4.5 (즉석 퀴즈·폴).
 */
export function LiveQuizCard() {
  const q = currentQuiz;
  const [selected, setSelected] = useState<number | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [remain, setRemain] = useState(q.remainingSec);

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => {
      setRemain(r => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [submitted]);

  return (
    <section className="border-pullim-blue-200 bg-pullim-blue-50/50 rounded-2xl border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="bg-pullim-blue-600 flex h-7 w-7 items-center justify-center rounded-lg text-white">
          <Zap className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <div className="text-pullim-blue-700 text-[10px] font-bold tracking-wider uppercase">
            지금 즉석 퀴즈
          </div>
          <div className="text-pullim-slate-900 text-xs font-bold">
            {q.responded}/{q.total}명 응답 · {Math.round((q.responded / q.total) * 100)}%
          </div>
        </div>
        <div className="text-pullim-slate-700 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-mono font-bold">
          <Clock className="h-3 w-3" />
          {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}
        </div>
      </div>

      <p className="text-pullim-slate-900 mt-2 text-sm font-medium leading-relaxed">
        {q.question}
      </p>

      <ol role="radiogroup" aria-label="객관식 보기" className="mt-3 grid grid-cols-2 gap-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = submitted && i === q.answerIndex;
          const isWrong = submitted && isSelected && i !== q.answerIndex;
          const pct = q.distribution[i];
          return (
            <li key={i}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={submitted}
                onClick={() => setSelected(i)}
                className={cn(
                  'relative w-full overflow-hidden rounded-lg border-2 px-3 py-3 text-left text-sm font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                  isCorrect && 'border-pullim-blue-600 bg-pullim-blue-50 text-pullim-blue-700',
                  isWrong && 'border-pullim-danger bg-pullim-danger-bg text-pullim-danger',
                  !submitted && isSelected && 'border-pullim-blue-500 bg-pullim-blue-50',
                  !submitted && !isSelected && 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                )}
              >
                {submitted && (
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 -z-0 bg-pullim-blue-100/50"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center gap-2">
                  <span className="font-mono">{['①','②','③','④'][i]}</span>
                  <span>{opt}</span>
                  {submitted && (
                    <span className="ml-auto text-xs font-mono">{pct}%</span>
                  )}
                  {isCorrect && <Check className="ml-auto h-4 w-4" />}
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <Button
          type="button"
          size="lg"
          disabled={selected === undefined}
          onClick={() => setSubmitted(true)}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-3 w-full rounded-xl text-white"
        >
          제출하기
        </Button>
      ) : (
        <p className="text-pullim-slate-600 mt-3 text-center text-xs">
          {selected === q.answerIndex ? '🎉 정답이에요!' : '아쉽지만 다시 도전해봐요'}
          <span className="text-pullim-slate-400"> · 결과가 선생님께 자동 전송됨</span>
        </p>
      )}
    </section>
  );
}
