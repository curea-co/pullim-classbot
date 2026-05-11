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

type AssignmentStore = {
  /** 발사된 과제 모음 (학생이 받음) */
  dispatched: UserAssignment[];
  /** 임시 저장 모음 (학생 미발송) */
  drafts: UserAssignment[];

  dispatch: (a: UserAssignment) => void;
  saveDraft: (a: UserAssignment) => void;
  /** 발사 직후 토스트 카피용 */
  lastDispatched: { count: number; botName: string; assignmentTitle: string } | null;
  clearLastDispatched: () => void;
};

export const useAssignmentStore = create<AssignmentStore>()(
  persist(
    (set) => ({
      dispatched: [],
      drafts: [],
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
