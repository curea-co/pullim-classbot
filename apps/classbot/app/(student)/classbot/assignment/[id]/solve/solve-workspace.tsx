'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, MessageCircle } from 'lucide-react';
import { BotHintPanel } from '@/components/classbot/bot-hint-panel';
import { EmptyState } from '@/components/classbot/empty-state';
import { ExamCountdown } from '@/components/classbot/exam-countdown';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
import type { AssignmentQuestion } from '@/lib/mock';
import { useSubmissionResultStore } from '@/lib/store/submission-result';
import { questionTypeMeta } from '@/lib/question-type';
import { useSubmitAssignment } from '../../use-assignment-submit';
import { toSubmitPayload } from '../../submit-payload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Answers = Record<string, string>;

/**
 * 풀이 워크스페이스 — 답은 **컴포넌트 안에만** 있고, 제출은 정본 `POST /assignments/:id/submit` 로 간다
 * (2026-09-16 계획 §06 R9 · FE PR 6).
 *
 * 종전에는 쓰는 중인 답을 `localStorage['assignment-<id>']` 에 임시저장했고, 제출하면 브라우저가 점수를 매겨
 * (`computeMockScore`) `pullim-assignments` persist 에 썼다. 둘 다 걷었다 — 제출의 정본은 서버이고, 점수도 서버가
 * 센다(서술형이 있으면 미채점 null). 쓰는 중인 답을 저장하지 않게 된 것은 상세 화면의 안내(「중간에 나가면 쓴 답은
 * 남지 않아요」)가 말한다.
 *
 * 답의 모양: 화면은 전부 문자열로 든다. 보낼 때의 변환은 `../../submit-payload.ts` 가 한다 — 객관식은 인덱스(number),
 * 수치는 교사 정답키와 **같은 파서**로 number(`"33,400"` → `33400`). 서버 대조가 문자열 같음이라 그 정규화가 정오를 가른다.
 */
export function SolveWorkspace({
  assignment, questions, botName, initialStep,
}: {
  assignment: AssignmentReadRow;
  questions: AssignmentQuestion[];
  botName: string;
  initialStep: number;
}) {
  const router = useRouter();
  const submit = useSubmitAssignment();
  const record = useSubmissionResultStore((s) => s.record);
  const [step, setStep] = useState(initialStep);
  const [answers, setAnswers] = useState<Answers>({});
  const [showBotPanel, setShowBotPanel] = useState(false);

  // Guard: zero-question assignment
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl py-16">
        <EmptyState
          title="문항을 준비 중이에요"
          description="선생님이 아직 문항을 넣지 않았어요. 잠시 후 다시 확인해 주세요."
          action={{ href: `/classbot/assignment/${assignment.id}`, label: '과제', ariaLabel: '과제로 돌아가기' }}
        />
      </div>
    );
  }

  // Clamp step into [1, questions.length] so stale ?step= deep links can't index out of range
  const safeStep = Math.min(Math.max(step, 1), questions.length);
  const q = questions[safeStep - 1];
  const isLast = safeStep === questions.length;
  const isExam = assignment.mode === 'exam';
  const current = answers[q.id] ?? '';

  function setAnswer(value: string) {
    setAnswers(a => ({ ...a, [q.id]: value }));
  }

  function go(delta: number) {
    const next = safeStep + delta;
    if (next < 1 || next > questions.length) return;
    setStep(next);
    setShowBotPanel(false);
  }

  async function handleSubmit() {
    if (submit.isPending) return;
    const payload = toSubmitPayload(questions, answers);
    try {
      const { submission } = await submit.mutateAsync({ assignmentId: assignment.id, answers: payload });
      // 결과 화면·과제 대화가 읽는다 — 저장하지 않는 스토어라 새로고침하면 비고, 결과 화면이 그때를 말한다.
      record(assignment.id, { submission, answers: payload });
      router.push(`/classbot/assignment/${assignment.id}/result`);
    } catch (error) {
      toast.error('답을 보내지 못했어요', {
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      });
    }
  }

  return (
    <div className="max-w-2xl space-y-3">
      {/* 컨텍스트 바 */}
      <div className="bg-pullim-slate-900 -mx-4 -mt-4 flex items-center gap-2 px-4 py-2.5 text-2xs text-white sm:rounded-2xl sm:-mx-0 sm:-mt-0">
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
        <span className="font-mono font-bold text-white">{safeStep}/{questions.length}</span>
        <div className="ml-auto flex items-center gap-2">
          {isExam && <ExamCountdown />}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="bg-pullim-slate-200 h-1 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', isExam ? 'bg-pullim-danger' : 'bg-pullim-blue-500')}
          style={{ width: `${(safeStep / questions.length) * 100}%` }}
        />
      </div>

      {/* 문제 */}
      <section className="bg-card rounded-2xl border p-4">
        <div className="flex items-center gap-1.5">
          <span className="bg-pullim-blue-100 text-pullim-blue-700 font-mono inline-flex h-6 w-6 items-center justify-center rounded-full text-micro font-bold">
            {q.order}
          </span>
          <div className="flex items-center gap-1">
            {(() => {
              const meta = questionTypeMeta[q.type];
              const Icon = meta.icon;
              return (
                <>
                  <Icon className="h-3 w-3 text-pullim-slate-400" />
                  <span className="text-pullim-slate-400 text-2xs font-bold tracking-wider">
                    {meta.label}
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
        <h3 className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">내 답안</h3>
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
            placeholder={q.type === 'short' || q.type === 'numeric' ? '답을 한 줄로 적어주세요.' : '풀이 과정과 답을 자유롭게 적어주세요.'}
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

      {/* 과제 대화 진입 — 힌트로 안 풀리면 이 과제에 매인 대화로.
          시험 모드는 봇이 잠기므로 내보내지 않는다. */}
      {!isExam && (
        <Link
          href={`/classbot/assignment/${assignment.id}/chat`}
          aria-label={`${botName}과 이 과제 대화하기`}
          className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-xs font-bold"
        >
          <MessageCircle className="h-3 w-3" />
          대화
        </Link>
      )}

      {/* 하단 액션 */}
      <div className="bg-card sticky bottom-2 flex items-center gap-2 rounded-2xl border p-3 shadow-pullim-md">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => go(-1)}
          disabled={safeStep === 1}
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
            onClick={() => void handleSubmit()}
            disabled={submit.isPending}
            data-testid="solve-submit"
            className="ml-auto"
          >
            <Send />
            {submit.isPending ? '보내는 중…' : '제출'}
          </Button>
        )}
      </div>
    </div>
  );
}
