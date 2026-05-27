'use client';

import { useState } from 'react';
import { Lock, Sparkles, MessageCircle, Lightbulb } from 'lucide-react';
import type { AssignmentMode, AssignmentQuestion } from '@/lib/mock';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 풀이 워크스페이스 봇 패널 — 모드별로 거동이 다르다.
 * - practice (L4): 5단계 힌트, 정답 직답 차단
 * - exam (L1): 봇 패널 자체 잠금
 * - wrong-conquest (L5): 즉시 정답·해설·반례
 * spec 12 § 3.3.3, § 5.1.
 */
export function BotHintPanel({
  mode, question, botName,
}: {
  mode: AssignmentMode;
  question: AssignmentQuestion;
  botName: string;
}) {
  if (mode === 'exam') return <ExamLocked />;
  if (mode === 'wrong-conquest') return <WrongConquestPanel question={question} botName={botName} />;
  return <PracticeHints question={question} botName={botName} />;
}

function ExamLocked() {
  return (
    <section className="bg-pullim-slate-900 text-pullim-slate-200 flex flex-col items-center justify-center rounded-2xl p-6 text-center">
      <Lock className="text-pullim-lemon mb-2 h-8 w-8" />
      <h3 className="text-sm font-bold text-white">봇이 잠긴 시간이에요</h3>
      <p className="mt-1 text-[11px] leading-relaxed">
        지금은 도와줄 수 없어요.<br />끝나고 다시 와주세요.
      </p>
      {/* 한글 라벨 우선 + 코드 괄호 ([07 § 5.3]) */}
      <div className="bg-pullim-slate-800 mt-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold">
        <span className="text-pullim-lemon">시험 모드</span>
        <span className="text-pullim-slate-400 font-mono text-[9px]">(L1)</span>
      </div>
    </section>
  );
}

function PracticeHints({ question, botName }: { question: AssignmentQuestion; botName: string }) {
  const [revealed, setRevealed] = useState(0);
  const hints = question.hints ?? [];
  const labels = ['방향', '핵심', '단서', '거의 정답', '해설'];

  return (
    <section className="bg-card flex flex-col rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="bg-pullim-blue-100 text-pullim-blue-700 flex h-7 w-7 items-center justify-center rounded-full text-xs">
          <Lightbulb className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <h3 className="text-pullim-slate-900 text-xs font-bold">{botName}</h3>
          <p className="text-pullim-slate-500 text-[10px]">단계별 힌트만 줄 수 있어요 <span className="font-mono text-[9px] text-pullim-slate-400">(L4)</span></p>
        </div>
      </header>

      {hints.length === 0 ? (
        <p className="text-pullim-slate-500 py-6 text-center text-[11px]">
          이 문항은 힌트 없이 풀어봐요.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {hints.slice(0, revealed).map((h, i) => (
              <li key={i} className="bg-pullim-blue-50 rounded-lg p-2.5">
                <div className="text-pullim-blue-700 mb-1 inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold tracking-wider uppercase">
                  {i + 1}단계 · {labels[i]}
                </div>
                <p className="text-pullim-slate-700 text-[11px] leading-relaxed">{h}</p>
              </li>
            ))}
          </ul>

          {revealed < hints.length && (
            <Button
              type="button"
              variant={revealed === 0 ? 'pullim' : 'secondary'}
              onClick={() => setRevealed(r => r + 1)}
              className={cn(
                'mt-3 w-full',
                revealed !== 0 && 'bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700',
              )}
            >
              {revealed === 0
                ? '한 줄만 알려줄게요'
                : revealed === hints.length - 1
                  ? '마지막 — 해설 보기'
                  : `다음 단계 (${revealed + 1}/${hints.length})`}
            </Button>
          )}

          {revealed === hints.length && (
            <p className="text-pullim-slate-400 mt-3 text-center text-[10px]">
              다 본 다음에 다시 처음부터 풀어봐요.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function WrongConquestPanel({ question, botName }: { question: AssignmentQuestion; botName: string }) {
  return (
    <section className="bg-card border-pullim-blue-200 rounded-2xl border p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="bg-pullim-blue-700 flex h-7 w-7 items-center justify-center rounded-full text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1">
          <h3 className="text-pullim-slate-900 text-xs font-bold">{botName}</h3>
          <p className="text-pullim-slate-500 text-[10px]">이번엔 잡아내봐요 <span className="font-mono text-[9px] text-pullim-slate-400">(L5)</span></p>
        </div>
      </header>

      {question.modelAnswer ? (
        <div className="bg-pullim-blue-50 rounded-lg p-3">
          <div className="text-pullim-blue-700 text-[10px] font-bold tracking-wider uppercase">기준 응답</div>
          <p className="text-pullim-slate-700 mt-1 text-[11px] leading-relaxed">{question.modelAnswer}</p>
        </div>
      ) : (
        <p className="text-pullim-slate-500 py-6 text-center text-[11px]">
          이 문항은 해설 준비 중이에요.
        </p>
      )}

      <Button
        type="button"
        disabled
        aria-disabled="true"
        title="준비 중 (v2 — 추가 대화)"
        className="bg-pullim-slate-900 hover:bg-pullim-slate-800 mt-3 w-full text-white opacity-60 cursor-not-allowed"
      >
        <MessageCircle />
        봇에게 더 물어보기 (v2)
      </Button>
    </section>
  );
}
