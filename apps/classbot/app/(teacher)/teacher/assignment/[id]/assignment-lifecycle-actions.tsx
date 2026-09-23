'use client';

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { LifecycleConfirmDialog } from '@/components/classbot/lifecycle-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAssignmentAuthoring,
  useRestoreAssignment,
  useUpdateAssignment,
  useWithdrawAssignment,
} from '@/hooks/api/assignment-dispatch';
import { statusOf } from '@/lib/api/classbot-client';
import type {
  AssignmentDetailDto,
  ClassMemberDto,
  DispatchAssignmentQuestionBody,
} from '@/lib/api/classbot-dto';

export function AssignmentLifecycleActions({
  assignment,
  members,
  submissionCount,
  submissionsReady,
}: {
  assignment: AssignmentDetailDto;
  members: ClassMemberDto[] | undefined;
  submissionCount: number;
  submissionsReady: boolean;
}) {
  const editRef = useRef<HTMLButtonElement>(null);
  const withdrawRef = useRef<HTMLButtonElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const withdraw = useWithdrawAssignment();
  const restore = useRestoreAssignment();
  const withdrawn = assignment.dispatchStatus === 'withdrawn';

  function handleRestore() {
    restore.mutate(assignment.id, {
      onSuccess: () => toast.success('과제를 다시 학생에게 열었어요.'),
      onError: () => toast.error('과제를 다시 열지 못했어요. 잠시 후 다시 시도해 주세요.'),
    });
  }

  if (withdrawn) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="touch" variant="outline" disabled={restore.isPending} onClick={handleRestore}>
          <RotateCcw aria-hidden />
          {restore.isPending ? '다시 여는 중…' : '다시 열기'}
        </Button>
        <p className="text-pullim-slate-500 text-xs">제출 기록은 그대로 보존돼요.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          ref={editRef}
          type="button"
          size="touch"
          variant="outline"
          disabled={!submissionsReady}
          onClick={() => setEditOpen(true)}
        >
          <Pencil aria-hidden /> 과제 수정
        </Button>
        <Button ref={withdrawRef} type="button" size="touch" variant="destructive" onClick={() => setWithdrawOpen(true)}>
          <Undo2 aria-hidden /> 과제 회수
        </Button>
      </div>
      {!submissionsReady && (
        <p className="text-pullim-slate-500 text-xs">제출 여부를 확인한 뒤 수정할 수 있어요.</p>
      )}

      <EditAssignmentDialog
        assignmentId={assignment.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        members={members}
        submissionCount={submissionCount}
        finalFocus={editRef}
      />

      <LifecycleConfirmDialog
        open={withdrawOpen}
        onOpenChange={(open) => {
          setWithdrawOpen(open);
          if (!open) setWithdrawError(null);
        }}
        title={`「${assignment.title}」을 회수할까요?`}
        description="학생의 새 제출은 막히지만 기존 제출과 채점 기록은 남아요. 나중에 다시 열 수 있어요."
        confirmLabel="회수하기"
        pendingLabel="회수하는 중…"
        isPending={withdraw.isPending}
        error={withdrawError}
        finalFocus={withdrawRef}
        onConfirm={() => {
          setWithdrawError(null);
          withdraw.mutate(assignment.id, {
            onSuccess: () => {
              setWithdrawOpen(false);
              toast.success('과제를 회수했어요.');
            },
            onError: () => setWithdrawError('과제를 회수하지 못했어요. 잠시 후 다시 시도해 주세요.'),
          });
        }}
      />
    </>
  );
}

function EditAssignmentDialog({
  assignmentId,
  open,
  onOpenChange,
  members,
  submissionCount,
  finalFocus,
}: {
  assignmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ClassMemberDto[] | undefined;
  submissionCount: number;
  finalFocus: RefObject<HTMLButtonElement | null>;
}) {
  const authoring = useAssignmentAuthoring(assignmentId);
  const update = useUpdateAssignment();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [dDay, setDDay] = useState('0');
  const [dueLabel, setDueLabel] = useState('');
  const [questions, setQuestions] = useState<DispatchAssignmentQuestionBody[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const contentLocked = submissionCount > 0;

  useEffect(() => {
    if (!open || !authoring.data) return;
    // 서버 편집 스냅샷이 도착하거나 판을 다시 열 때 draft를 그 스냅샷으로 재설정해야 한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(authoring.data.title);
    setDDay(String(authoring.data.dDay));
    setDueLabel(authoring.data.dueLabel);
    setQuestions(authoring.data.questions.map((question) => ({
      ...question,
      options: question.options ? [...question.options] : undefined,
    })));
    setTargetStudentIds([...(authoring.data.targetStudentIds ?? [])]);
    setError(null);
  }, [authoring.data, open]);

  function updateQuestion(index: number, patch: Partial<DispatchAssignmentQuestionBody>) {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextDueLabel = dueLabel.trim();
    const nextDDay = Number(dDay);
    if (!nextTitle || !nextDueLabel || !Number.isInteger(nextDDay)) {
      setError('과제명, 마감 안내, 정수 D-day를 확인해 주세요.');
      return;
    }
    const normalizedQuestions = questions.map((question) => ({
      ...question,
      prompt: question.prompt.trim(),
      ...(question.type === 'mc'
        ? { options: (question.options ?? []).map((option) => option.trim()).filter(Boolean) }
        : {}),
    }));
    if (!contentLocked && normalizedQuestions.some((question) => !question.prompt)) {
      setError('모든 문항의 질문을 입력해 주세요.');
      return;
    }
    if (!contentLocked && normalizedQuestions.some((question) => {
      if (question.type === 'essay') return false;
      if (question.type === 'mc') {
        return !question.options?.length
          || typeof question.answerKey !== 'number'
          || !Number.isInteger(question.answerKey)
          || question.answerKey < 0
          || question.answerKey >= question.options.length;
      }
      if (question.type === 'numeric') {
        return typeof question.answerKey !== 'number' || !Number.isFinite(question.answerKey);
      }
      return typeof question.answerKey !== 'string' || !question.answerKey.trim();
    })) {
      setError('객관식 보기와 정답, 단답형·수치형 정답을 확인해 주세요.');
      return;
    }

    setError(null);
    try {
      await update.mutateAsync({
        assignmentId,
        patch: {
          title: nextTitle,
          dDay: nextDDay,
          dueLabel: nextDueLabel,
          ...(!contentLocked ? { questions: normalizedQuestions, targetStudentIds } : {}),
        },
      });
      onOpenChange(false);
      toast.success('과제를 수정했어요.');
    } catch (caught) {
      setError(
        statusOf(caught) === 409
          ? '그 사이 제출이 생겼거나 과제가 바뀌었어요. 최신 내용을 다시 불러온 뒤 문항과 대상을 확인해 주세요.'
          : '과제를 수정하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.',
      );
      if (statusOf(caught) === 409) void authoring.refetch();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        initialFocus={titleRef}
        finalFocus={finalFocus}
      >
        <DialogHeader>
          <DialogTitle>과제 수정</DialogTitle>
          <DialogDescription>제출이 생기기 전에는 문항과 대상도 바꿀 수 있어요.</DialogDescription>
        </DialogHeader>

        {authoring.isPending ? (
          <p className="text-pullim-slate-500 py-8 text-center text-sm">편집 내용을 불러오는 중이에요…</p>
        ) : authoring.isError ? (
          <div role="alert" className="space-y-3 py-5 text-sm">
            <p className="text-pullim-danger">편집 내용을 불러오지 못했어요.</p>
            <Button type="button" variant="outline" onClick={() => void authoring.refetch()}>다시 시도</Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="assignment-title">과제명</Label>
                <Input ref={titleRef} id="assignment-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-dday">D-day</Label>
                <Input id="assignment-dday" type="number" step="1" value={dDay} onChange={(event) => setDDay(event.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-due-label">마감 안내</Label>
                <Input id="assignment-due-label" value={dueLabel} onChange={(event) => setDueLabel(event.target.value)} required />
              </div>
            </div>

            {contentLocked ? (
              <p className="bg-pullim-lemon-soft text-pullim-lemon-ink rounded-xl p-3 text-xs font-semibold">
                제출이 {submissionCount}건 있어 문항과 대상 학생은 잠겼어요. 과제명과 마감만 수정할 수 있어요.
              </p>
            ) : (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-bold">대상 학생</legend>
                  <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={targetStudentIds.length === 0}
                      onChange={() => setTargetStudentIds([])}
                    />
                    반 전체
                  </label>
                  {targetStudentIds.length > 0 || (members?.length ?? 0) > 0 ? (
                    <div className="grid gap-1 sm:grid-cols-2">
                      {(members ?? []).filter((member) => member.isActive).map((member) => (
                        <label key={member.memberId} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={targetStudentIds.includes(member.memberId)}
                            onChange={(event) => setTargetStudentIds((current) => event.target.checked
                              ? [...current, member.memberId]
                              : current.filter((id) => id !== member.memberId))}
                          />
                          {member.displayName || `이름 없음 ${member.memberId.slice(0, 8)}`}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-pullim-slate-500 text-xs">활성 학생 명단이 없어서 반 전체로만 수정할 수 있어요.</p>
                  )}
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-bold">문항</legend>
                  {questions.map((question, index) => (
                    <QuestionFields
                      key={`${question.order}-${index}`}
                      index={index}
                      question={question}
                      onChange={(patch) => updateQuestion(index, patch)}
                    />
                  ))}
                </fieldset>
              </>
            )}

            {error && <p role="alert" className="text-pullim-danger text-xs">{error}</p>}
            <DialogFooter>
              <DialogClose render={<Button type="button" size="touch" variant="outline" disabled={update.isPending} />}>취소</DialogClose>
              <Button type="submit" size="touch" variant="pullim" disabled={update.isPending}>
                {update.isPending ? '저장하는 중…' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuestionFields({
  question,
  index,
  onChange,
}: {
  question: DispatchAssignmentQuestionBody;
  index: number;
  onChange: (patch: Partial<DispatchAssignmentQuestionBody>) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="space-y-1.5">
        <Label htmlFor={`question-${index}`}>{index + 1}번 질문</Label>
        <Input id={`question-${index}`} value={question.prompt} onChange={(event) => onChange({ prompt: event.target.value })} />
      </div>
      {question.type === 'mc' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`options-${index}`}>보기 (한 줄에 하나)</Label>
            <textarea
              id={`options-${index}`}
              className="border-input bg-background min-h-24 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              value={(question.options ?? []).join('\n')}
              onChange={(event) => onChange({ options: event.target.value.split('\n') })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`answer-${index}`}>정답 번호</Label>
            <select
              id={`answer-${index}`}
              className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm"
              value={typeof question.answerKey === 'number' ? question.answerKey : 0}
              onChange={(event) => onChange({ answerKey: Number(event.target.value) })}
            >
              {(question.options ?? []).map((option, optionIndex) => (
                <option key={`${optionIndex}-${option}`} value={optionIndex}>{optionIndex + 1}번 · {option}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {(question.type === 'short' || question.type === 'numeric') && (
        <div className="space-y-1.5">
          <Label htmlFor={`answer-${index}`}>정답</Label>
          <Input
            id={`answer-${index}`}
            inputMode={question.type === 'numeric' ? 'decimal' : undefined}
            value={question.answerKey === undefined ? '' : String(question.answerKey)}
            onChange={(event) => onChange({
              answerKey: question.type === 'numeric'
                ? (event.target.value.trim() === '' ? undefined : Number(event.target.value))
                : event.target.value,
            })}
          />
        </div>
      )}
    </div>
  );
}
