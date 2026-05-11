import { Zap, FileQuestion, BarChart3, RadioTower } from 'lucide-react';
import { currentQuiz } from '@/lib/mock';

/**
 * 교사 — 즉석 퀴즈/폴 생성 액션 + 진행 중 퀴즈 결과.
 * 핸드오프 4.5.
 */
export function QuizLauncher() {
  const q = currentQuiz;
  const respondedPct = Math.round((q.responded / q.total) * 100);

  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <Zap className="text-pullim-warn h-4 w-4" />
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
                <span className={isAnswer ? 'text-pullim-success font-bold' : 'text-pullim-slate-600'}>
                  {['①','②','③','④'][i]} {opt} {isAnswer && '✓'}
                </span>
                <span className="font-mono">{q.distribution[i]}%</span>
              </div>
              <div className="bg-pullim-slate-100 h-1.5 overflow-hidden rounded-full">
                <div
                  className={isAnswer ? 'bg-pullim-success h-full rounded-full' : 'bg-pullim-blue-300 h-full rounded-full'}
                  style={{ width: `${q.distribution[i]}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* 액션 */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
        <button className="bg-pullim-warn-bg text-pullim-warn flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold">
          <FileQuestion className="h-3.5 w-3.5" />
          새 퀴즈
        </button>
        <button className="bg-pullim-blue-50 text-pullim-blue-700 flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold">
          <RadioTower className="h-3.5 w-3.5" />
          폴 생성
        </button>
        <button className="bg-pullim-slate-100 text-pullim-slate-700 flex flex-col items-center gap-0.5 rounded-lg py-2 font-bold">
          <BarChart3 className="h-3.5 w-3.5" />
          상세 분포
        </button>
      </div>
    </section>
  );
}
