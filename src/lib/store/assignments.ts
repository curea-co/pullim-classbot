/**
 * 교사가 발사한 과제 store — E2E mock 시연의 핵심 인프라.
 * spec 14 § 5.5, § 10.2.
 *
 * 정책:
 * - localStorage persist — 새로고침 후에도 학생 화면에 보존
 * - mock 시드 + dispatched 합산은 lib/mock/classbot.ts의 getMyAssignments() 헬퍼에서
 * - 새 과제 id 패턴: `as_user_${Date.now()}` (시드 id와 충돌 회피)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Assignment, type AssignmentQuestion,
  studentAssignments, getAssignmentById as getSeedAssignmentById,
  getQuestionsByAssignment,
} from '@/lib/mock';

type DispatchStatus = 'draft' | 'sent' | 'scheduled' | 'withdrawn';

export type UserAssignment = Assignment & {
  /** 발사 상태 — Assignment.state(학생 시점)와 별개 */
  dispatchStatus: DispatchStatus;
  /** 대상 학생 id 배열 — 전체 발사면 빈 배열 (전체 enrolled 의미) */
  targetStudentIds: string[];
  /** 발사 시각 (ISO8601) */
  dispatchedAt?: string;
  /** 시험 모드 시간 제한 (분) */
  examTimeLimitMin?: number;
};

/** 학생 제출 기록 — 교사 진행률 / 점수 집계의 원천 */
export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  /** 제출 시각 (ISO8601) — 라이브 인디케이터 / 정렬 */
  submittedAt: string;
  /** 학생 답안 — { [questionId]: answer } */
  answers: Record<string, string>;
  /** 점수 0~100 (mock 추정) */
  scorePercent: number;
};

type AssignmentStore = {
  /** 발사된 과제 모음 (학생이 받음) */
  dispatched: UserAssignment[];
  /** 임시 저장 모음 (학생 미발송) */
  drafts: UserAssignment[];
  /** 학생 제출 기록 — 동일 assignmentId+studentId 는 upsert */
  submissions: Submission[];

  dispatch: (a: UserAssignment) => void;
  saveDraft: (a: UserAssignment) => void;
  recordSubmission: (s: Omit<Submission, 'id' | 'submittedAt'>) => Submission;
  /** 발사 직후 토스트 카피용 */
  lastDispatched: { count: number; botName: string; assignmentTitle: string } | null;
  clearLastDispatched: () => void;
};

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set) => ({
      dispatched: [],
      drafts: [],
      submissions: [],
      lastDispatched: null,

      dispatch: (a) =>
        set((s) => {
          const targetCount = a.targetStudentIds.length === 0 ? 18 : a.targetStudentIds.length;
          return {
            dispatched: [{ ...a, dispatchStatus: 'sent', dispatchedAt: new Date().toISOString() }, ...s.dispatched],
            drafts: s.drafts.filter((d) => d.id !== a.id),
            lastDispatched: {
              count: targetCount,
              botName: a.assignedBy,
              assignmentTitle: a.title,
            },
          };
        }),

      saveDraft: (a) =>
        set((s) => {
          const exists = s.drafts.find((d) => d.id === a.id);
          if (exists) {
            return { drafts: s.drafts.map((d) => (d.id === a.id ? { ...a, dispatchStatus: 'draft' } : d)) };
          }
          return { drafts: [...s.drafts, { ...a, dispatchStatus: 'draft' }] };
        }),

      recordSubmission: (payload) => {
        const submission: Submission = {
          ...payload,
          id: `sub_${Date.now()}`,
          submittedAt: new Date().toISOString(),
        };
        set((s) => {
          // upsert — 동일 assignment+student 는 갱신
          const filtered = s.submissions.filter(
            (sub) => !(sub.assignmentId === submission.assignmentId && sub.studentId === submission.studentId),
          );
          return { submissions: [submission, ...filtered] };
        });
        return submission;
      },

      clearLastDispatched: () => set({ lastDispatched: null }),
    }),
    {
      name: 'pullim-assignments',
    },
  ),
);

/** SSR 안전 hydration — 서버에서는 빈 배열, 클라이언트에서만 store 반영 */
export function useDispatchedAssignments(): UserAssignment[] {
  return useAssignmentStore((s) => s.dispatched);
}

/** 새 과제 id 생성 — 시드 id와 충돌 회피용 prefix `as_user_` */
export function nextAssignmentId(): string {
  return `as_user_${Date.now()}`;
}

/**
 * 학생이 보는 전체 과제 — 시드 + 발사된 새 과제 합산.
 * 발사 시각 역순으로 정렬되어 새 과제가 위로 옴.
 *
 * 학생 id 필터: targetStudentIds가 빈 배열이면 전체 enrolled,
 * 그렇지 않으면 해당 학생만 포함.
 */
export function useMergedAssignments(studentId?: string): Assignment[] {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const filteredDispatched = studentId
    ? dispatched.filter((d) => d.targetStudentIds.length === 0 || d.targetStudentIds.includes(studentId))
    : dispatched;
  return [...filteredDispatched, ...studentAssignments];
}

/** id로 과제 lookup — 시드 + 발사 모두 검색 */
export function useAssignmentLookup(id: string): Assignment | undefined {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  return dispatched.find((d) => d.id === id) ?? getSeedAssignmentById(id);
}

/**
 * 과제의 문항 풀 — 시드 문항이 있으면 그대로, 없으면 mode 기반 fallback.
 * 새 과제는 mock 시드를 빌려와 P0 시연을 보장.
 */
export function getQuestionsForAssignment(assignment: Assignment): AssignmentQuestion[] {
  const seedQs = getQuestionsByAssignment(assignment.id);
  if (seedQs.length > 0) return seedQs;
  // fallback by mode — 발사된 새 과제용
  if (assignment.mode === 'wrong-conquest') {
    return getQuestionsByAssignment('as_prescription').slice(0, assignment.questionCount);
  }
  if (assignment.mode === 'exam') {
    return getQuestionsByAssignment('as_exam_prep').slice(0, assignment.questionCount);
  }
  return getQuestionsByAssignment('as_today').slice(0, assignment.questionCount);
}

/* ─────────────────────────────────────────────────────────────
 * Submission helpers — 학생 제출 → 교사 진행률 / 점수 집계
 * ───────────────────────────────────────────────────────────── */

/**
 * 과제 진행률 — 시드의 정적 completedCount 와 store submissions 를 합산.
 * 동일 학생이 시드 카운트에 이미 포함됐다고 가정하지 않음 (단순 합산).
 * 데모용 — 실제로는 questionCount cap 적용.
 */
export function useAssignmentProgress(assignment: Assignment): {
  completedCount: number;
  submittedStudentCount: number;
  avgScore: number | null;
  latestSubmittedAt: string | null;
} {
  const submissions = useAssignmentStore((s) => s.submissions);
  return computeProgress(assignment, submissions);
}

/** 컴포넌트 밖(루프·서버)에서 쓰는 동일 로직 */
export function computeProgress(assignment: Assignment, submissions: Submission[]) {
  const mine = submissions.filter((s) => s.assignmentId === assignment.id);
  const submittedStudentCount = new Set(mine.map((s) => s.studentId)).size;
  const completedCount = Math.min(
    assignment.completedCount + submittedStudentCount,
    assignment.questionCount,
  );
  const avgScore =
    mine.length === 0 ? null : Math.round(mine.reduce((a, s) => a + s.scorePercent, 0) / mine.length);
  const latestSubmittedAt =
    mine.length === 0 ? null : mine.reduce((a, s) => (s.submittedAt > a ? s.submittedAt : a), mine[0].submittedAt);
  return { completedCount, submittedStudentCount, avgScore, latestSubmittedAt };
}

/**
 * 객관식 정답 비율 기반 mock 점수.
 * 단답/서술은 답안 길이 ≥ 3자면 정답 가중 (mock).
 */
export function computeMockScore(
  questions: AssignmentQuestion[],
  answers: Record<string, string>,
): number {
  if (questions.length === 0) return 0;
  let correct = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (!a) continue;
    if (q.type === 'mc' && q.answerIndex != null) {
      if (a === String(q.answerIndex)) correct += 1;
    } else if (q.type === 'short' || q.type === 'essay') {
      if (a.trim().length >= 3) correct += 0.7;
    }
  }
  return Math.round((correct / questions.length) * 100);
}

/** 특정 학생의 최신 submission */
export function useStudentSubmission(assignmentId: string, studentId: string): Submission | undefined {
  const submissions = useAssignmentStore((s) => s.submissions);
  return submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
}
