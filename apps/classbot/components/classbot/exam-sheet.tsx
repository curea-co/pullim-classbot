'use client';

import { useEffect, useState } from 'react';
import { type ExamQuestion } from '@/lib/mock/classbot-replay-exam';
import { cn } from '@/lib/utils';

const MARKS = ['①', '②', '③', '④', '⑤', '⑥', '⑦'];

/**
 * 시험지 렌더러 — ExamQuestion을 실제 모의고사 스타일로 렌더 + 채점.
 *
 * 의도적으로 serif(시험지 존). 앱 나머지 sans 유지. 토큰만(hex 없음),
 * 학생 라우트 palette-safe: 정답 강조 = blue, 오답 = danger (green/amber 미사용).
 * 순수 컴포넌트 — store/router 비의존. `onResult(correct)`만 통지.
 */
export function ExamSheet({
  question,
  onResult,
}: {
  question: ExamQuestion;
  onResult: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  // 문항이 바뀌면(다음 약점으로 교체) 선택·채점 상태를 초기화 — 이전 문항 오염 방지.
  // getReplayQuiz는 키별 동일 ref를 반환하므로 question 참조 비교로 안전.
  useEffect(() => {
    setSelected(null);
    setChecked(false);
  }, [question]);

  function handleSubmit() {
    if (selected === null || checked) return;
    setChecked(true);
    onResult(selected === question.answerIndex);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-pullim-slate-200 bg-card font-serif">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-pullim-slate-200 bg-pullim-slate-50 px-4 py-2 font-sans">
        <span className="text-xs font-bold tracking-wide text-pullim-slate-500">다시 풀기</span>
        <span className="text-xs text-pullim-slate-500">{question.subjectLabel}</span>
      </div>

      <div className="p-4">
        {/* 발문 */}
        <p className="mb-3 text-sm font-bold leading-relaxed text-pullim-slate-900">{question.stem}</p>

        {/* 지문 (국어/영어) */}
        {question.passage && (
          <div className="mb-4 space-y-2.5 rounded-lg border border-pullim-slate-200 bg-white p-4">
            {question.passage.paragraphs.map((para, i) => (
              <p key={i} className="text-sm leading-loose text-pullim-slate-800">
                {para}
              </p>
            ))}
          </div>
        )}

        {/* 〈보기〉 (수학/과학) */}
        {question.boxed && (
          <div className="mb-4 space-y-1 rounded-lg border border-pullim-slate-300 bg-pullim-slate-50 px-4 py-3 text-center">
            <div className="mb-1 text-2xs font-bold tracking-wider text-pullim-slate-500 font-sans">〈보기〉</div>
            {question.boxed.lines.map((line, i) => (
              <p key={i} className="text-sm text-pullim-slate-800">{line}</p>
            ))}
          </div>
        )}

        {/* 보기 ①~⑤ */}
        <ul className="space-y-1.5">
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            const isAnswer = i === question.answerIndex;
            const showCorrect = checked && isAnswer;
            const showWrong = checked && isSelected && !isAnswer;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={checked}
                  aria-pressed={isSelected}
                  onClick={() => !checked && setSelected(i)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50',
                    !checked && isSelected && 'border-pullim-blue-600 bg-pullim-blue-50 font-bold text-pullim-blue-700',
                    !checked && !isSelected && 'border-pullim-slate-200 text-pullim-slate-800 hover:bg-pullim-slate-50',
                    showCorrect && 'border-pullim-blue-600 bg-pullim-blue-50 font-bold text-pullim-blue-700',
                    showWrong && 'border-pullim-danger bg-pullim-danger/10 text-pullim-danger',
                    checked && !showCorrect && !showWrong && 'border-pullim-slate-200 text-pullim-slate-400',
                  )}
                >
                  <span className="shrink-0">{MARKS[i] ?? `${i + 1}`}</span>
                  <span className="flex-1">{opt}</span>
                  {showCorrect && <span className="text-2xs font-bold font-sans text-pullim-blue-600">정답</span>}
                  {showWrong && <span className="text-2xs font-bold font-sans text-pullim-danger">내 답</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* 제출 / 해설 */}
        {!checked ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-4 min-h-11 w-full rounded-lg bg-pullim-slate-900 px-4 text-sm font-bold text-white font-sans transition-colors hover:bg-pullim-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-slate-500/40"
          >
            제출
          </button>
        ) : (
          <div className="mt-4 rounded-lg border border-pullim-blue-100 bg-pullim-blue-50 p-3 font-sans">
            <p className="text-2xs font-bold uppercase tracking-wider text-pullim-blue-400">해설</p>
            <p className="mt-1 text-sm leading-relaxed text-pullim-slate-700">{question.explanation}</p>
          </div>
        )}
      </div>
    </section>
  );
}
