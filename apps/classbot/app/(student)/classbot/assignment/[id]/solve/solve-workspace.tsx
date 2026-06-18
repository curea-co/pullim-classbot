'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Send, Save, MessageCircle } from 'lucide-react';
import { BotHintPanel } from '@/components/classbot/bot-hint-panel';
import { ExamCountdown } from '@/components/classbot/exam-countdown';
import { type Assignment, type AssignmentQuestion } from '@/lib/mock';
import { useRosterMe } from '@/lib/current-user';
import { useAssignmentStore, computeMockScore } from '@/lib/store/assignments';
import { questionTypeMeta } from '@/lib/question-type';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Answers = Record<string, string>;

export function SolveWorkspace({
  assignment, questions, botName, initialStep,
}: {
  assignment: Assignment;
  questions: AssignmentQuestion[];
  botName: string;
  initialStep: number;
}) {
  const router = useRouter();
  const me = useRosterMe();
  const storageKey = `assignment-${assignment.id}`;
  const [step, setStep] = useState(initialStep);
  const [answers, setAnswers] = useState<Answers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showBotPanel, setShowBotPanel] = useState(false);

  // localStorage 복원
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      try {
        const data = JSON.parse(stored) as { answers: Answers; step: number };
        setAnswers(data.answers ?? {});
        if (data.step) setStep(prev => prev || data.step);
      } catch {
        // ignore parse errors
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 임시저장 (디바운스 효과: state 변경 시 5초 후 1회)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, step }));
      setSavedAt('방금 전');
    }, 800);
    return () => window.clearTimeout(id);
  }, [answers, step, storageKey]);

  const q = questions[step - 1];
  const isLast = step === questions.length;
  const isExam = assignment.mode === 'exam';
  const current = answers[q.id] ?? '';

  function setAnswer(value: string) {
    setAnswers(a => ({ ...a, [q.id]: value }));
  }

  function go(delta: number) {
    const next = step + delta;
    if (next < 1 || next > questions.length) return;
    setStep(next);
    setShowBotPanel(false);
  }

  function submit() {
    // 점수 mock 계산 + store 에 submission 기록 (교사 측 진행률 반영)
    // 명의 = 현재 사용자(해석기). per-student mock 키는 roster id.
    const scorePercent = computeMockScore(questions, answers);
    useAssignmentStore.getState().recordSubmission({
      assignmentId: assignment.id,
      studentId: me.id,
      answers,
      scorePercent,
    });

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    router.push(`/classbot/assignment/${assignment.id}/result`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {/* 컨텍스트 바 */}
      <div className="bg-pullim-slate-900 -mx-4 -mt-4 flex items-center gap-2 px-4 py-2.5 text-[10px] text-white sm:rounded-2xl sm:-mx-0 sm:-mt-0">
        <Link
          href={`/classbot/assignment/${assignment.id}`}
          className="text-pullim-slate-300 hover:text-white inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          나가기
        </Link>
        <span className="text-pullim-slate-500">·</span>
        <span className="text-pullim-slate-300 font-bold">{assignment.title}</span>
        <span className="text-pullim-slate-500">·</span>
        <span className="text-pullim-lemon font-mono font-bold">{step}/{questions.length}</span>
        <div className="ml-auto flex items-center gap-2">
          {savedAt && (
            <span className="text-pullim-slate-400 inline-flex items-center gap-0.5 font-mono">
              <Save className="h-2.5 w-2.5" />
              {savedAt} 저장
            </span>
          )}
          {isExam && <ExamCountdown />}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="bg-pullim-slate-200 h-1 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', isExam ? 'bg-pullim-danger' : 'bg-pullim-blue-500')}
          style={{ width: `${(step / questions.length) * 100}%` }}
        />
      </div>

      {/* 문제 */}
      <section className="bg-card rounded-2xl border p-4">
        <div className="flex items-center gap-1.5">
          <span className="bg-pullim-blue-100 text-pullim-blue-700 font-mono inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold">
            {q.order}
          </span>
          <div className="flex items-center gap-1">
            {(() => {
              const meta = questionTypeMeta[q.type as keyof typeof questionTypeMeta];
              const Icon = meta?.icon;
              return (
                <>
                  {Icon && <Icon className="h-3 w-3 text-pullim-slate-400" />}
                  <span className="text-pullim-slate-400 text-[11px] font-bold tracking-wider">
                    {meta?.label ?? q.type}
                  </span>
                </>
              );
            })()}
          </div>
        </div>
        <p className="text-pullim-slate-900 mt-2 text-base leading-relaxed font-medium">
          {q.prompt}
        </p>
      </section>

      {/* 답안 입력 */}
      <section className="bg-card rounded-2xl border p-4">
        <h3 className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">내 답안</h3>
        {q.type === 'mc' && q.options ? (
          <ul role="radiogroup" aria-label="객관식 선택지" className="mt-2 grid grid-cols-1 gap-2">
            {q.options.map((opt, i) => {
              const isSelected = current === String(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setAnswer(String(i))}
                    className={cn(
                      'w-full rounded-lg border-2 px-3 py-2.5 text-left text-sm font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                      isSelected
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                    )}
                  >
                    <span className="font-mono mr-2">{['①','②','③','④','⑤'][i]}</span>
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Textarea
            value={current}
            onChange={(e) => setAnswer(e.target.value)}
            rows={q.type === 'essay' ? 6 : 2}
            placeholder={q.type === 'short' ? '답을 한 줄로 적어주세요.' : '풀이 과정과 답을 자유롭게 적어주세요.'}
            aria-label="답안"
            className="mt-2 rounded-xl text-sm leading-relaxed"
          />
        )}
      </section>

      {/* 봇 패널 — 모바일은 토글, 데스크탑은 아래 노출 */}
      {showBotPanel || isExam ? (
        <BotHintPanel mode={assignment.mode} question={q} botName={botName} />
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowBotPanel(true)}
          className="border-pullim-blue-200 bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 hover:text-pullim-blue-700 w-full rounded-2xl border-2 border-dashed py-6 text-xs font-bold"
        >
          <MessageCircle />
          {botName}에게 힌트 받기
        </Button>
      )}

      {/* 하단 액션 */}
      <div className="bg-card sticky bottom-2 flex items-center gap-2 rounded-2xl border p-3 shadow-pullim-md">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => go(-1)}
          disabled={step === 1}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700"
        >
          <ArrowLeft />
          이전
        </Button>
        {!isLast ? (
          <Button
            type="button"
            variant="pullim"
            size="lg"
            onClick={() => go(1)}
            className="ml-auto"
          >
            다음
            <ArrowRight />
          </Button>
        ) : (
          <Button
            type="button"
            variant="pullim"
            size="lg"
            onClick={submit}
            className="ml-auto"
          >
            <Send />
            제출
          </Button>
        )}
      </div>
    </div>
  );
}
