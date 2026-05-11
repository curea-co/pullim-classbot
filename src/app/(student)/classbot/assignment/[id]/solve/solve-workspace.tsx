'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Send, Save, MessageCircle, Eye } from 'lucide-react';
import { BotHintPanel } from '@/components/classbot/bot-hint-panel';
import { ExamCountdown } from '@/components/classbot/exam-countdown';
import type { Assignment, AssignmentQuestion } from '@/lib/mock';
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
  const storageKey = `assignment-${assignment.id}`;
  const [step, setStep] = useState(initialStep);
  const [answers, setAnswers] = useState<Answers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

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

  // 시험 모드 외부 탭 카운트 (spec 12 § 5.4)
  useEffect(() => {
    if (assignment.mode !== 'exam' || typeof document === 'undefined') return;
    function onVisibility() {
      if (document.hidden) {
        setTabSwitchCount(c => {
          const next = c + 1;
          // eslint-disable-next-line no-console
          console.log('[EXAM TAB SWITCH MOCK]', { assignmentId: assignment.id, count: next });
          return next;
        });
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [assignment.mode, assignment.id]);

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
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    router.push(`/classbot/assignment/${assignment.id}/result`);
  }

  return (
    <div className="space-y-3">
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
          {isExam && tabSwitchCount > 0 && (
            <span
              className="bg-pullim-warn/20 text-pullim-lemon inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono font-bold"
              title="시험 도중 외부 탭 전환 기록 — 교사에게 자동 전송"
            >
              <Eye className="h-2.5 w-2.5" />
              {tabSwitchCount}
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
          <span className="text-pullim-slate-400 text-[9px] font-bold tracking-wider uppercase">{q.type}</span>
        </div>
        <p className="text-pullim-slate-900 mt-2 text-base leading-relaxed font-medium">
          {q.prompt}
        </p>
      </section>

      {/* 답안 입력 */}
      <section className="bg-card rounded-2xl border p-4">
        <h3 className="text-pullim-slate-400 text-[10px] font-bold tracking-wider uppercase">내 답안</h3>
        {q.type === 'mc' && q.options ? (
          <ul className="mt-2 grid grid-cols-1 gap-2">
            {q.options.map((opt, i) => {
              const isSelected = current === String(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setAnswer(String(i))}
                    className={cn(
                      'w-full rounded-lg border-2 px-3 py-2.5 text-left text-sm font-bold transition-all',
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
          <textarea
            value={current}
            onChange={(e) => setAnswer(e.target.value)}
            rows={q.type === 'essay' ? 6 : 2}
            placeholder={q.type === 'short' ? '답을 한 줄로 적어주세요.' : '풀이 과정과 답을 자유롭게 적어주세요.'}
            className="border-pullim-slate-200 focus:border-pullim-blue-500 mt-2 w-full rounded-xl border p-3 text-sm leading-relaxed outline-none"
          />
        )}
      </section>

      {/* 봇 패널 — 모바일은 토글, 데스크탑은 아래 노출 */}
      {showBotPanel || isExam ? (
        <BotHintPanel mode={assignment.mode} question={q} botName={botName} />
      ) : (
        <button
          type="button"
          onClick={() => setShowBotPanel(true)}
          className="border-pullim-blue-200 bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-3 text-xs font-bold"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {botName}에게 힌트 받기
        </button>
      )}

      {/* 하단 액션 */}
      <div className="bg-card sticky bottom-2 flex items-center gap-2 rounded-2xl border p-3 shadow-pullim-md">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={step === 1}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 disabled:opacity-40 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
        >
          <ArrowLeft className="h-3 w-3" />
          이전
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={() => go(1)}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 ml-auto inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-bold text-white"
          >
            다음
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 ml-auto inline-flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-bold text-white"
          >
            <Send className="h-3 w-3" />
            제출
          </button>
        )}
      </div>
    </div>
  );
}
