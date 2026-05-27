'use client';

import { useState } from 'react';
import { Zap, FileQuestion, BarChart3, RadioTower, X, Plus } from 'lucide-react';
import { useQuizStore } from '@/lib/store/quiz';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * 교사 — 즉석 퀴즈/폴 생성 액션 + 진행 중 퀴즈 결과.
 * 핸드오프 4.5. v1 — 객관식 퀴즈 생성·발사 활성.
 */
export function QuizLauncher() {
  const q = useQuizStore(s => s.active);
  const launch = useQuizStore(s => s.launch);
  const [open, setOpen] = useState(false);
  const respondedPct = Math.round((q.responded / q.total) * 100);

  function handleLaunch(payload: { question: string; options: string[]; answerIndex: number; seconds: number }) {
    launch({
      question: payload.question,
      options: payload.options,
      answerIndex: payload.answerIndex,
      remainingSec: payload.seconds,
    });
    setOpen(false);
    toast.success('⚡ 퀴즈 발사 완료', {
      description: '학생 라이브 화면에 즉시 등장 — 응답 분포 실시간 갱신.',
      duration: 3000,
    });
  }

  return (
    <>
      <section className="bg-card rounded-2xl border p-4">
        <header className="mb-3 flex items-center gap-2">
          <Zap className="text-pullim-blue-600 h-4 w-4" />
          <h2 className="text-pullim-slate-900 text-sm font-bold flex-1">즉석 퀴즈</h2>
          <span className="text-pullim-slate-400 text-[10px] font-mono">{q.responded}/{q.total} 응답 ({respondedPct}%)</span>
        </header>

        <p className="text-pullim-slate-700 text-xs leading-snug font-medium">{q.question}</p>

        {/* 응답 분포 */}
        <ul className="mt-2 space-y-1">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answerIndex;
            return (
              <li key={i} className="text-[11px]">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className={isAnswer ? 'text-pullim-blue-700 font-bold' : 'text-pullim-slate-600'}>
                    {['①','②','③','④'][i]} {opt} {isAnswer && '✓'}
                  </span>
                  <span className="font-mono">{q.distribution[i]}%</span>
                </div>
                <div className="bg-pullim-slate-100 h-1.5 overflow-hidden rounded-full">
                  <div
                    className={isAnswer ? 'bg-pullim-blue-600 h-full rounded-full' : 'bg-pullim-blue-200 h-full rounded-full'}
                    style={{ width: `${q.distribution[i]}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold transition-colors"
          >
            <FileQuestion className="h-3.5 w-3.5" aria-hidden />
            새 퀴즈
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="준비 중 (v2)"
            className="bg-pullim-blue-50 text-pullim-blue-700 flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold opacity-60 cursor-not-allowed"
          >
            <RadioTower className="h-3.5 w-3.5" aria-hidden />
            폴 생성
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="준비 중 (v2)"
            className="bg-pullim-slate-100 text-pullim-slate-700 flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold opacity-60 cursor-not-allowed"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            상세 분포
          </button>
        </div>
      </section>

      {open && <QuizLaunchModal onClose={() => setOpen(false)} onLaunch={handleLaunch} />}
    </>
  );
}

function QuizLaunchModal({
  onClose,
  onLaunch,
}: {
  onClose: () => void;
  onLaunch: (payload: { question: string; options: string[]; answerIndex: number; seconds: number }) => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [seconds, setSeconds] = useState(60);

  const valid = question.trim().length > 0 && options.every(o => o.trim().length > 0);

  function setOption(i: number, v: string) {
    setOptions(prev => prev.map((p, idx) => idx === i ? v : p));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-launch-title"
    >
      <div className="bg-card w-full max-w-md rounded-2xl border shadow-pullim-lg">
        <header className="border-pullim-slate-100 flex items-center justify-between border-b p-4">
          <h2 id="quiz-launch-title" className="text-pullim-slate-900 inline-flex items-center gap-1.5 text-sm font-bold">
            <Zap className="text-pullim-blue-600 h-4 w-4" />
            새 즉석 퀴즈
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-pullim-slate-500 hover:text-pullim-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <div>
            <label className="text-pullim-slate-700 mb-1 block text-xs font-bold" htmlFor="qz-question">
              문제
            </label>
            <textarea
              id="qz-question"
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="예: f'(x) = 0이면 무조건 극값인가?"
              className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border p-2 text-xs outline-none"
            />
          </div>

          <div>
            <label className="text-pullim-slate-700 mb-1 block text-xs font-bold">선택지 (4지선다, 정답 라디오 선택)</label>
            <ul className="space-y-1.5">
              {options.map((opt, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="qz-answer"
                    checked={answerIndex === i}
                    onChange={() => setAnswerIndex(i)}
                    aria-label={`${i + 1}번 정답`}
                  />
                  <span className="text-pullim-slate-500 font-mono text-xs">{['①','②','③','④'][i]}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => setOption(i, e.target.value.slice(0, 60))}
                    placeholder={`선택지 ${i + 1}`}
                    className="border-pullim-slate-200 focus:border-pullim-blue-500 flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-pullim-slate-700 mb-1 block text-xs font-bold" htmlFor="qz-time">
              시간 제한 — {seconds}초
            </label>
            <input
              id="qz-time"
              type="range"
              min={15}
              max={180}
              step={15}
              value={seconds}
              onChange={e => setSeconds(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <footer className="border-pullim-slate-100 flex items-center justify-end gap-2 border-t p-3">
          <button
            type="button"
            onClick={onClose}
            className="text-pullim-slate-600 hover:bg-pullim-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onLaunch({ question, options, answerIndex, seconds })}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors',
              valid ? 'bg-pullim-blue-600 hover:bg-pullim-blue-700' : 'bg-pullim-slate-300 cursor-not-allowed',
            )}
          >
            <Plus className="h-3 w-3" />
            발사
          </button>
        </footer>
      </div>
    </div>
  );
}
