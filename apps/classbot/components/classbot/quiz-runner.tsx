'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { type LoopQuestion } from '@/lib/mock/classbot-learning-content';
import { cn } from '@/lib/utils';

/**
 * QuizRunner — MC 퀴즈 러너 (연습 / 점검 공용)
 *
 * - 문항을 한 개씩 진행하며 채점·해설 reveal
 * - 전체 완료 후 onComplete(passed, correctCount) 호출
 * - Pure component — store/router 의존 없음
 */
export function QuizRunner({
  questions,
  onComplete,
  ctaLabel,
}: {
  questions: LoopQuestion[];
  onComplete: (passed: boolean, score: number) => void;
  ctaLabel?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Guard: empty questions
  if (questions.length === 0) {
    return (
      <p className="text-pullim-slate-500 text-center text-sm py-6 font-medium">
        문항을 준비 중이에요
      </p>
    );
  }

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isCorrect = checked && selectedIndex === question.correctIndex;

  function handleCheck() {
    if (selectedIndex === null || checked) return;
    setChecked(true);
    if (selectedIndex === question.correctIndex) {
      setCorrectCount(prev => prev + 1);
    }
  }

  function handleNext() {
    if (!checked) return;

    if (isLast) {
      // correctCount already reflects this question's result (updated in handleCheck)
      onComplete(correctCount === questions.length, correctCount);
      return;
    }

    setCurrentIndex(prev => prev + 1);
    setSelectedIndex(null);
    setChecked(false);
  }

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between">
        <span className="text-pullim-slate-500 text-micro font-mono font-bold">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="bg-pullim-slate-200 h-1 flex-1 mx-3 overflow-hidden rounded-full">
          <div
            className="bg-pullim-blue-500 h-full rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-pullim-slate-500 text-micro font-mono font-bold">
          {correctCount}정답
        </span>
      </div>

      {/* 문제 */}
      <section className="bg-card rounded-2xl border p-4">
        <p className="text-pullim-slate-900 text-base leading-relaxed font-medium">
          {question.prompt}
        </p>
      </section>

      {/* 선택지 */}
      <section className="bg-card rounded-2xl border p-4">
        <h3 className="text-pullim-slate-400 mb-2 text-micro font-bold tracking-wider uppercase">
          선택지
        </h3>
        <ul role="radiogroup" aria-label="객관식 선택지" className="grid grid-cols-1 gap-2">
          {question.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isCorrectOption = i === question.correctIndex;

            let optionClass = '';
            if (checked) {
              if (isCorrectOption) {
                // 정답 옵션: 항상 초록으로 표시
                optionClass = 'border-pullim-success bg-pullim-success-bg text-pullim-success';
              } else if (isSelected && !isCorrectOption) {
                // 틀린 선택: 빨간색으로 표시
                optionClass = 'border-pullim-danger bg-pullim-danger-bg text-pullim-danger';
              } else {
                optionClass = 'border-pullim-slate-200 bg-white text-pullim-slate-500 opacity-60';
              }
            } else {
              optionClass = isSelected
                ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                : 'border-pullim-slate-200 bg-white text-pullim-slate-700 hover:border-pullim-slate-400';
            }

            return (
              <li key={i}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={checked}
                  onClick={() => !checked && setSelectedIndex(i)}
                  className={cn(
                    'w-full min-h-[44px] rounded-lg border-2 px-3 py-2.5 text-left text-sm font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                    'disabled:cursor-default',
                    optionClass,
                  )}
                >
                  <span className="font-mono mr-2">{['①', '②', '③', '④', '⑤'][i]}</span>
                  {opt}
                  {checked && isCorrectOption && (
                    <CheckCircle2 className="inline ml-1.5 h-3.5 w-3.5 align-middle" aria-label="정답" />
                  )}
                  {checked && isSelected && !isCorrectOption && (
                    <XCircle className="inline ml-1.5 h-3.5 w-3.5 align-middle" aria-label="오답" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 해설 (채점 후 표시) — aria-live region은 항상 DOM에 존재해야 SR이 변경을 감지 */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {checked && (
          <section
            className={cn(
              'rounded-2xl border p-4',
              isCorrect
                ? 'border-pullim-success/30 bg-pullim-success-bg'
                : 'border-pullim-danger/30 bg-pullim-danger-bg',
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              {isCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-pullim-success shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-pullim-danger shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm font-bold',
                  isCorrect ? 'text-pullim-success' : 'text-pullim-danger',
                )}
              >
                {isCorrect ? '정답이에요!' : '아쉽지만 틀렸어요.'}
              </span>
            </div>
            <p className="text-pullim-slate-700 text-sm leading-relaxed">
              {question.explanation}
            </p>
          </section>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="flex gap-2">
        {!checked ? (
          <button
            type="button"
            disabled={selectedIndex === null}
            onClick={handleCheck}
            className={cn(
              'ml-auto min-h-[44px] rounded-xl px-6 py-2.5 text-sm font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
              selectedIndex !== null
                ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
                : 'bg-pullim-slate-200 text-pullim-slate-400 cursor-not-allowed',
            )}
          >
            확인
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="ml-auto min-h-[44px] rounded-xl bg-pullim-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-pullim-blue-700 transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50"
          >
            {isLast ? (ctaLabel ?? '완료') : '다음'}
          </button>
        )}
      </div>
    </div>
  );
}
