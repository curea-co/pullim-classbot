'use client';

import { useState } from 'react';
import { ClipboardCheck, MessageCircle, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader,
} from '@/components/ui/sheet';
import { Chip } from '@/components/ui/chip';
import { classRoster, type Assignment } from '@/lib/mock';
import {
  useAssignmentStore, getQuestionsForAssignment, nextAssignmentId,
  type UserAssignment, type Submission,
} from '@/lib/store/assignments';
import { useInterventionStore } from '@/lib/store/interventions';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { formatDueLabel, computeDDay } from '@/lib/assignment-due';
import type { AssignmentQuestion } from '@/lib/mock';

/**
 * 제출 현황 시트 — 교사 개입 comment·requiz 쓰기 표면.
 * spec `proc/spec/2026-07-02_classbot-teacher-intervention-design.md` §4, plan PR-2.
 * 학생별 제출/미제출 + 제출자 코멘트 발신 + 오답률 높은 문항 복습 재발사.
 */

/** 이 비율 이상 오답인 문항이 복습 재발사 대상 */
const REQUIZ_WRONG_THRESHOLD = 0.4;

type AssignmentWithTargets = Assignment & { targetStudentIds?: string[] };

/** computeMockScore 규약과 동일한 오답 판정 — 무응답도 오답으로 본다. */
function isWrong(q: AssignmentQuestion, answers: Record<string, string>): boolean {
  const a = answers[q.id];
  if (!a) return true;
  if (q.type === 'mc' && q.answerIndex != null) return a !== String(q.answerIndex);
  return a.trim().length < 3;
}

/** 시트 내용부 — RTL 테스트 대상 (Sheet 래퍼와 분리, NotificationInbox 패턴). */
export function SubmissionStatusPanel({ assignment }: { assignment: AssignmentWithTargets }) {
  const submissions = useAssignmentStore((s) => s.submissions);
  const dispatch = useAssignmentStore((s) => s.dispatch);
  const send = useInterventionStore((s) => s.send);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [requizId, setRequizId] = useState<string | null>(null);

  const targetIds = assignment.targetStudentIds ?? [];
  // PR-1 리마인드와 동일 스코프 규약 — 빈 배열 = 전체(단일 교실 mock)
  const eligible =
    targetIds.length === 0 ? classRoster : classRoster.filter((r) => targetIds.includes(r.id));
  const eligibleIds = new Set(eligible.map((r) => r.id));
  // 비대상 학생 제출은 제외 — 발사 스코프 밖 제출이 섞이면 오답률·재발사 대상이 오염된다 (Codex #186 R2)
  const mine = submissions.filter(
    (s) => s.assignmentId === assignment.id && eligibleIds.has(s.studentId),
  );
  const byStudent = new Map<string, Submission>(mine.map((s) => [s.studentId, s]));
  // 시험 과제는 결과 피드백 비공개 정책 — 학생에게 절대 노출되지 않는 코멘트 발송 경로를 열지 않는다 (R2)
  const canComment = assignment.mode !== 'exam';

  // 문항별 오답률(제출자 기준) → 임계 이상 문항 + 그 문항을 틀린 제출자
  const questions = getQuestionsForAssignment(assignment);
  const wrongQuestions =
    mine.length === 0
      ? []
      : questions.filter(
          (q) => mine.filter((s) => isWrong(q, s.answers)).length / mine.length >= REQUIZ_WRONG_THRESHOLD,
        );
  const requizTargets = mine
    .filter((s) => wrongQuestions.some((q) => isWrong(q, s.answers)))
    .map((s) => s.studentId);

  const handleComment = (studentId: string) => {
    const message = draft.trim();
    if (!message) return;
    send({ type: 'comment', botId: assignment.botId, studentId, assignmentId: assignment.id, message });
    toast.success('코멘트를 보냈어요');
    setCommentFor(null);
    setDraft('');
  };

  const handleRequiz = () => {
    const id = nextAssignmentId();
    // 신선한 마감(+3일) — 원 과제의 지난 마감/시험 제한을 끌고 가지 않는다 (Codex #186 R3)
    const dueIso = new Date(Date.now() + 3 * 86400000).toISOString();
    const requiz: UserAssignment = {
      ...(assignment as Assignment),
      id,
      title: `복습: ${assignment.title}`,
      mode: 'wrong-conquest',
      questionCount: wrongQuestions.length,
      completedCount: 0,
      state: 'todo',
      assignedAt: '방금 발사',
      dueLabel: formatDueLabel(dueIso),
      dDay: computeDDay(dueIso),
      scopeOverride: undefined,
      solveHref: `/classbot/assignment/${id}/solve?step=1`,
      dispatchStatus: 'sent',
      targetStudentIds: requizTargets,
      examTimeLimitMin: undefined,
      // 오답 문항 집합 보존 — 학생이 원 과제에서 틀린 바로 그 문항을 받는다 (Codex #186)
      requizQuestionIds: wrongQuestions.map((q) => q.id),
    };
    dispatch(requiz);
    for (const studentId of requizTargets) {
      send({
        type: 'requiz',
        botId: assignment.botId,
        studentId,
        assignmentId: id,
        message: `'${requiz.title}' 과제가 도착했어요 — 많이 틀린 유형만 다시 풀어봐요.`,
      });
    }
    setRequizId(id);
    toast.success(`복습 과제를 ${requizTargets.length}명에게 재발사했어요`);
  };

  return (
    <div className="space-y-4">
      {/* 학생별 제출 현황 */}
      <ul className="space-y-1.5">
        {eligible.map((student) => {
          const submission = byStudent.get(student.id);
          return (
            <li key={student.id} className="bg-card rounded-xl border px-3 py-2">
              <div className="flex min-h-9 items-center gap-2">
                <span className="text-pullim-slate-900 min-w-0 flex-1 truncate text-sm font-semibold">
                  {student.name}
                </span>
                {submission ? (
                  <>
                    <Chip tone="info">{submission.scorePercent}%</Chip>
                    {canComment && (
                    <button
                      type="button"
                      onClick={() => {
                        setCommentFor(commentFor === student.id ? null : student.id);
                        setDraft('');
                      }}
                      className="text-pullim-blue-600 hover:bg-pullim-blue-50 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-2xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400"
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      코멘트
                    </button>
                    )}
                  </>
                ) : (
                  <Chip tone="neutral">미제출</Chip>
                )}
              </div>
              {commentFor === student.id && (
                <div className="mt-2 flex items-start gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="칭찬·격려 한마디 — 학생 결과 페이지와 알림에 표시돼요"
                    aria-label={`${student.name}에게 코멘트`}
                    className="border-pullim-slate-200 placeholder:text-pullim-slate-400 min-w-0 flex-1 rounded-lg border p-2 text-xs focus:border-pullim-blue-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleComment(student.id)}
                    disabled={draft.trim().length === 0}
                    className="bg-pullim-blue-600 hover:bg-pullim-blue-700 min-h-11 shrink-0 rounded-lg px-3 text-xs font-bold text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400"
                  >
                    보내기
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 오답 문항 재발사 — 제출이 있고 임계 이상 오답 문항이 있을 때만 */}
      {mine.length > 0 && wrongQuestions.length > 0 && (
        <div className="border-pullim-slate-200 rounded-xl border border-dashed p-3">
          <p className="text-pullim-slate-700 text-xs font-bold">
            오답률 높은 문항 {wrongQuestions.length}개
          </p>
          <ul className="text-pullim-slate-500 mt-1 space-y-0.5 text-2xs">
            {wrongQuestions.map((q) => (
              <li key={q.id} className="truncate">
                · {q.prompt}
              </li>
            ))}
          </ul>
          {requizId ? (
            <p className="text-pullim-slate-500 mt-2 inline-flex items-center gap-1 text-2xs font-bold">
              <Check className="h-3.5 w-3.5" aria-hidden />
              복습 과제 재발사 완료
            </p>
          ) : (
            <button
              type="button"
              onClick={handleRequiz}
              className="text-pullim-blue-600 border-pullim-blue-200 hover:bg-pullim-blue-50 mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              오답 문항 {wrongQuestions.length}개 재발사 ({requizTargets.length}명)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** 진행률 행 트리거 + 시트 래퍼. */
export function SubmissionStatusSheet({ assignment }: { assignment: AssignmentWithTargets }) {
  const hydrated = useStoresHydrated(useAssignmentStore, useInterventionStore);
  if (!hydrated) return null;

  return (
    <Sheet>
      <SheetTrigger className="text-pullim-slate-600 border-pullim-slate-200 hover:bg-pullim-slate-50 inline-flex min-h-11 items-center gap-1 rounded-lg border px-2.5 text-2xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400">
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
        제출 현황
      </SheetTrigger>
      <SheetContent side="right" className="w-96 overflow-y-auto p-4">
        <SheetHeader className="p-0 pb-3">
          <SheetTitle className="text-sm font-bold">
            제출 현황 — {assignment.title}
          </SheetTitle>
        </SheetHeader>
        <SubmissionStatusPanel assignment={assignment} />
      </SheetContent>
    </Sheet>
  );
}
