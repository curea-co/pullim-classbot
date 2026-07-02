/**
 * 교사가 발사한 과제 store — E2E mock 시연의 핵심 인프라.
 * spec 14 § 5.5, § 10.2.
 *
 * 정책:
 * - localStorage persist — 새로고침 후에도 학생 화면에 보존
 * - mock 시드 + dispatched 합산은 lib/mock/classbot.ts의 getMyAssignments() 헬퍼에서
 * - 새 과제 id 패턴: `as_user_${Date.now()}` (시드 id와 충돌 회피)
 *
 * Ph7(`USE_REAL_CORE_BE`): 쓰기(dispatch/recordSubmission)는 스토어 선반영 후
 * BE 로 전송(낙관적 — 실패 시 콘솔 경고 + 로컬 유지), 읽기(useMergedAssignments 등)는
 * `GET /api/assignments?audience=student` 를 스토어 캐시로 동기화한다.
 * 플래그 OFF 면 기존 mock/localStorage 동작 100% 불변.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Assignment, type AssignmentQuestion,
  studentAssignments, getAssignmentById as getSeedAssignmentById,
  getQuestionsByAssignment, getQuestionsByIds,
} from '@/lib/mock';
import { USE_REAL_CORE_BE } from '@/lib/features';
import {
  domainFetch, getAuthUserSnapshot, studentRequestIdentity, teacherRequestIdentity,
  toDomainUserId, fromDomainUserId, type RequestIdentity,
} from '@/lib/api/domain-fetch';

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
  /** 오답 재발사(requiz) — 원 과제에서 오답률 높았던 문항 id 집합. 있으면 문항 해석이 이걸 그대로 쓴다. */
  requizQuestionIds?: string[];
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

      dispatch: (a) => {
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
        });
        // Ph7 — 낙관적 선반영 후 BE 전송 (실패 시 경고 + 로컬 유지, M2 단방향 신뢰)
        if (USE_REAL_CORE_BE) void dispatchToBackend(a);
      },

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
        // Ph7 — 낙관적 선반영 후 BE 전송 (실패 시 경고 + 로컬 유지)
        if (USE_REAL_CORE_BE) void submitToBackend(submission);
        return submission;
      },

      clearLastDispatched: () => set({ lastDispatched: null }),
    }),
    {
      name: 'pullim-assignments',
    },
  ),
);

/* ─────────────────────────────────────────────────────────────
 * Ph7 — BE 배선 (USE_REAL_CORE_BE ON 일 때만 동작)
 * ───────────────────────────────────────────────────────────── */

/**
 * BE 과제 한 행 — `AssignmentResponseDto`(FE AssignmentReadRow 상위집합) 소비형.
 * 시각 필드는 ISO-8601 문자열(spec §3), 라벨은 assignedAtLabel.
 */
interface BackendAssignmentRow {
  id: string;
  botId: string;
  studentId: string | null;
  title: string;
  scope: string;
  subject: string;
  grade: string;
  chapterFrom: string;
  chapterTo: string;
  achievementCodes: string[];
  questionCount: number;
  difficulty: Assignment['difficulty'];
  mode: Assignment['mode'];
  scopeOverride: Assignment['scopeOverride'] | null;
  source: Assignment['source'];
  assignedBy: string;
  assignedAtLabel: string;
  dueLabel: string;
  dDay: string;
  completedCount: number;
  recentAccuracy: number | null;
  state: Assignment['state'];
  reasonHint: string | null;
  solveHref: string;
  targetStudentIds?: string[] | null;
  dispatchedAt?: string | null;
  examTimeLimitMin?: number | null;
  requizQuestionIds?: string[] | null;
}

/**
 * BE 행 → 스토어 UserAssignment.
 * 학생 키 역변환(student_001→s1)은 **미인증 데모 읽기에서만** 적용한다 — 인증
 * 사용자 행의 raw user id 를 roster 키로 붕괴시키지 않는다 (Codex #196 R2 ②).
 */
function toUserAssignment(row: BackendAssignmentRow, mapToRosterKeys: boolean): UserAssignment {
  return {
    id: row.id,
    botId: row.botId,
    title: row.title,
    scope: row.scope,
    subject: row.subject,
    grade: row.grade,
    chapterFrom: row.chapterFrom,
    chapterTo: row.chapterTo,
    achievementCodes: row.achievementCodes ?? [],
    questionCount: row.questionCount,
    difficulty: row.difficulty,
    mode: row.mode,
    ...(row.scopeOverride != null ? { scopeOverride: row.scopeOverride } : {}),
    source: row.source,
    assignedBy: row.assignedBy,
    assignedAt: row.assignedAtLabel,
    dueLabel: row.dueLabel,
    dDay: row.dDay,
    completedCount: row.completedCount,
    ...(row.recentAccuracy != null ? { recentAccuracy: row.recentAccuracy } : {}),
    state: row.state,
    ...(row.reasonHint ? { reasonHint: row.reasonHint } : {}),
    solveHref: row.solveHref,
    dispatchStatus: 'sent',
    targetStudentIds: mapToRosterKeys
      ? (row.targetStudentIds ?? []).map(fromDomainUserId)
      : (row.targetStudentIds ?? []),
    ...(row.dispatchedAt ? { dispatchedAt: row.dispatchedAt } : {}),
    ...(row.examTimeLimitMin != null ? { examTimeLimitMin: row.examTimeLimitMin } : {}),
    ...(row.requizQuestionIds && row.requizQuestionIds.length > 0
      ? { requizQuestionIds: row.requizQuestionIds }
      : {}),
  };
}

/**
 * 교사 발사 → `POST /api/assignments` (dueLabel/dDay 직접 전달 경로).
 * 성공 시 로컬 낙관 항목을 서버 생성 행으로 재키잉해 — 이후 상세/제출/읽기 동기화가
 * BE 와 같은 id 를 쓰게 한다. 실패 시 콘솔 경고 + 로컬 유지 (graceful degrade).
 */
async function dispatchToBackend(a: UserAssignment): Promise<void> {
  const body = {
    botId: a.botId,
    title: a.title,
    scope: a.scope,
    chapterFrom: a.chapterFrom,
    chapterTo: a.chapterTo,
    achievementCodes: a.achievementCodes,
    questionCount: a.questionCount,
    difficulty: a.difficulty,
    mode: a.mode,
    targetStudentIds: a.targetStudentIds.map(toDomainUserId),
    dueLabel: a.dueLabel,
    dDay: a.dDay,
    ...(a.reasonHint ? { reasonHint: a.reasonHint } : {}),
    ...(a.examTimeLimitMin != null ? { examTimeLimitMin: a.examTimeLimitMin } : {}),
    ...(a.requizQuestionIds && a.requizQuestionIds.length > 0
      ? { requizQuestionIds: a.requizQuestionIds }
      : {}),
  };
  const identity = teacherRequestIdentity();
  try {
    const created = await domainFetch<BackendAssignmentRow>('/assignments', {
      method: 'POST',
      body,
      // 인증이면 Bearer 전용(데모 명의 미전달 — 오귀속 차단), 미인증만 데모 교사 키.
      demoUserId: identity.demoUserId,
    });
    useAssignmentStore.setState((s) => ({
      dispatched: s.dispatched.map((d) =>
        d.id === a.id ? { ...d, ...toUserAssignment(created, !identity.isAuthenticated) } : d,
      ),
    }));
  } catch (e) {
    console.warn('[assignments] BE 과제 발사 실패 — 로컬 유지:', e);
  }
}

/** 학생 제출 → `POST /api/assignments/:id/submissions`. 실패 시 경고 + 로컬 유지. */
async function submitToBackend(submission: Submission): Promise<void> {
  try {
    await domainFetch<unknown>(
      `/assignments/${encodeURIComponent(submission.assignmentId)}/submissions`,
      {
        method: 'POST',
        body: { answers: submission.answers, scorePercent: submission.scorePercent },
        // 인증이면 Bearer 신원(데모 명의 미전달), 미인증만 payload roster 키를 seed 변환.
        demoUserId: getAuthUserSnapshot() ? undefined : toDomainUserId(submission.studentId),
      },
    );
  } catch (e) {
    console.warn('[assignments] BE 제출 기록 실패 — 로컬 유지:', e);
  }
}

// 사용자당 1회 fetch 단일 비행 — 소비 훅이 여러 곳에 마운트돼도 중복 요청하지 않고,
// 로그아웃/재로그인·사용자 전환 시(resolved user id 변경) 재동기화한다 (Codex #196 R2 ③).
let backendAssignmentSync: {
  key: string;
  promise: Promise<UserAssignment[] | null>;
} | null = null;

/** 테스트 전용 — 단일 비행 캐시 리셋. */
export function resetBackendAssignmentSyncForTests(): void {
  backendAssignmentSync = null;
}

async function fetchBackendAssignments(
  identity: RequestIdentity,
): Promise<UserAssignment[] | null> {
  try {
    const res = await domainFetch<{ assignments: BackendAssignmentRow[] }>(
      '/assignments?audience=student',
      { demoUserId: identity.demoUserId },
    );
    return res.assignments.map((row) => toUserAssignment(row, !identity.isAuthenticated));
  } catch (e) {
    console.warn('[assignments] BE 과제 목록 동기화 실패 — 로컬 유지:', e);
    return null;
  }
}

/**
 * 플래그 ON 읽기 동기화 — `GET /api/assignments?audience=student` 를 dispatched
 * 캐시에 병합한다. 같은 id 는 BE 행이 진실, BE 에 없는 로컬 행은 유지(쓰기 실패분 보존).
 * 플래그 OFF 면 완전 no-op. 데모 read 폴백(assignment/page.tsx demoData)은 불변.
 */
function useBackendAssignmentSync(): void {
  useEffect(() => {
    if (!USE_REAL_CORE_BE) return;
    let cancelled = false;
    const identity = studentRequestIdentity();
    if (backendAssignmentSync?.key !== identity.userId) {
      backendAssignmentSync = {
        key: identity.userId,
        promise: fetchBackendAssignments(identity),
      };
    }
    void backendAssignmentSync.promise.then((rows) => {
      if (cancelled || !rows) return;
      useAssignmentStore.setState((s) => {
        const beIds = new Set(rows.map((r) => r.id));
        return { dispatched: [...s.dispatched.filter((d) => !beIds.has(d.id)), ...rows] };
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
}

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
  useBackendAssignmentSync(); // Ph7 — 플래그 OFF 면 no-op
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const filteredDispatched = studentId
    ? dispatched.filter((d) => d.targetStudentIds.length === 0 || d.targetStudentIds.includes(studentId))
    : dispatched;
  return [...filteredDispatched, ...studentAssignments];
}

/** id로 과제 lookup — 시드 + 발사 모두 검색 */
export function useAssignmentLookup(id: string): Assignment | undefined {
  useBackendAssignmentSync(); // Ph7 — 딥링크 진입에서도 BE 캐시 동기화
  const dispatched = useAssignmentStore((s) => s.dispatched);
  return dispatched.find((d) => d.id === id) ?? getSeedAssignmentById(id);
}

/**
 * 과제의 문항 풀 — 시드 문항이 있으면 그대로, 없으면 mode 기반 fallback.
 * 새 과제는 mock 시드를 빌려와 P0 시연을 보장.
 */
export function getQuestionsForAssignment(
  assignment: Assignment & { requizQuestionIds?: string[] },
): AssignmentQuestion[] {
  // 오답 재발사 과제 — 원 과제에서 틀린 바로 그 문항 집합을 보존 (generic 시드 대체 방지, Codex #186)
  if (assignment.requizQuestionIds && assignment.requizQuestionIds.length > 0) {
    const requizQs = getQuestionsByIds(assignment.requizQuestionIds);
    if (requizQs.length > 0) return requizQs;
  }
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
