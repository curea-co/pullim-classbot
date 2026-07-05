/**
 * 교사가 발사한 과제 store — E2E mock 시연의 핵심 인프라.
 * spec 14 § 5.5, § 10.2.
 *
 * 정책:
 * - localStorage persist — 새로고침 후에도 학생 화면에 보존
 * - mock 시드 + dispatched 합산은 lib/mock/classbot.ts의 getMyAssignments() 헬퍼에서
 * - 새 과제 id 패턴: `as_user_${Date.now()}` (시드 id와 충돌 회피)
 *
 * `USE_REAL_CORE_BE`(정본 배선): 쓰기(dispatch/recordSubmission)는 스토어 선반영 후 pullim-api
 * 정본 라우트(OS 쿠키 + CSRF)로 전송(낙관적 — 실패 시 콘솔 경고 + 로컬 유지), 읽기(useMergedAssignments
 * 등)는 `GET /classbot/assignments?audience=student` 를 스토어 캐시로 동기화한다.
 * dispatch=`POST /classbot/classes/:classId/assignments`, submit=`POST /classbot/assignments/:id/submit`
 * (**`{ answers }` 만** — scorePercent 는 서버 권위 채점값). 플래그 OFF 면 기존 mock/localStorage 100% 불변.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Assignment, type AssignmentQuestion,
  studentAssignments, getAssignmentById as getSeedAssignmentById,
  getQuestionsByAssignment, getQuestionsByIds,
} from '@/lib/mock';
import { classBots } from '@/lib/mock/classbot';
import { USE_REAL_CORE_BE } from '@/lib/features';
import { domainFetch, useSyncUserId } from '@/lib/api/domain-fetch';

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
 * 정본 과제 요약 응답 — `AssignmentSummaryResponseDto`(문항·answerKey 미포함, bot==class → classId).
 * 시각 필드는 ISO-8601 문자열, dDay 는 정수.
 */
interface AssignmentSummaryResponse {
  id: string;
  classId: string;
  title: string;
  scope: string;
  subject: string;
  grade: string;
  mode: Assignment['mode'];
  questionCount: number;
  difficulty: Assignment['difficulty'];
  dueLabel: string;
  dDay: number;
  dispatchStatus: DispatchStatus;
  dispatchedAt: string | null;
  examTimeLimitMin: number | null;
  state: Assignment['state'];
  chapterFrom: string | null;
  chapterTo: string | null;
  achievementCodes: string[] | null;
}

/** 정본 제출 응답 — `SubmissionResponseDto`(서버 권위 채점값). */
interface SubmissionResponse {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  /** 🔒 서버가 answers↔answer_key 대조로 재계산한 점수(essay 포함 시 null=미채점). */
  scorePercent: number | null;
  gradedAt: string | null;
  submittedAt: string;
}

/** dDay 정수 → 학생 UI 라벨("D-1"·"오늘"). 서버는 정수, FE 표시는 문자열. */
function dDayLabel(dDay: number): string {
  return dDay <= 0 ? '오늘' : `D-${dDay}`;
}

/** "D-1"·"오늘" 라벨 → dDay 정수(서버 계약). 파싱 실패는 0. */
function parseDDay(label: string): number {
  const m = /(\d+)/.exec(label);
  return m ? Number(m[1]) : 0;
}

/**
 * 문항 → 서버 전용 채점 정답키. mc=정답 인덱스(number), short/numeric=정답값(string),
 * essay=미지정(자동채점 불가). 서버가 이 값으로 채점하므로 요청에만 싣고 학생 조회 응답엔 미노출.
 */
function answerKeyOf(q: AssignmentQuestion): number | string | undefined {
  if (q.type === 'mc') return q.answerIndex;
  if (q.type === 'short' || q.type === 'numeric') return q.answerKey;
  return undefined;
}

/**
 * 정본 요약 응답 → 스토어 UserAssignment. 서버가 소유하는 필드는 그대로, 봇 카탈로그·워크스페이스
 * 링크 등 **FE 표시 전용 필드**(assignedBy·source·solveHref)는 mock 카탈로그·파생으로 채운다
 * (봇 카탈로그·문항 본문 = mock 권위, M3 경계). targetStudentIds 는 요약 응답에 없다 — 접근 술어는
 * 서버가 집행하므로 표시상 반 전체(빈 배열)로 둔다.
 */
function toUserAssignment(row: AssignmentSummaryResponse): UserAssignment {
  const bot = classBots.find((b) => b.id === row.classId);
  return {
    id: row.id,
    botId: row.classId,
    title: row.title,
    scope: row.scope,
    subject: row.subject,
    grade: row.grade,
    chapterFrom: row.chapterFrom ?? '',
    chapterTo: row.chapterTo ?? '',
    achievementCodes: row.achievementCodes ?? [],
    questionCount: row.questionCount,
    difficulty: row.difficulty,
    mode: row.mode,
    source: 'teacher-assigned',
    assignedBy: bot?.name ?? '',
    assignedAt: row.dispatchedAt ?? '',
    dueLabel: row.dueLabel,
    dDay: dDayLabel(row.dDay),
    completedCount: 0,
    state: row.state,
    solveHref: `/classbot/assignment/${row.id}/solve?step=1`,
    dispatchStatus: row.dispatchStatus,
    targetStudentIds: [],
    ...(row.dispatchedAt ? { dispatchedAt: row.dispatchedAt } : {}),
    ...(row.examTimeLimitMin != null ? { examTimeLimitMin: row.examTimeLimitMin } : {}),
  };
}

/**
 * 교사 발사 → `POST /classbot/classes/:classId/assignments`(classId = bot==class 의 botId).
 * body 는 정본 `DispatchAssignmentDto` — 문항은 answerKey 를 동봉(서버 전용 채점 소스),
 * targetStudentIds 빈 배열 = 반 전체. 성공 시 낙관 항목을 서버 생성 행으로 재키잉한다. 실패 시 경고 + 로컬 유지.
 */
async function dispatchToBackend(a: UserAssignment): Promise<void> {
  const body = {
    title: a.title,
    scope: a.scope,
    subject: a.subject,
    grade: a.grade,
    mode: a.mode,
    questionCount: a.questionCount,
    difficulty: a.difficulty,
    dueLabel: a.dueLabel,
    dDay: parseDDay(a.dDay),
    state: a.state,
    chapterFrom: a.chapterFrom,
    chapterTo: a.chapterTo,
    achievementCodes: a.achievementCodes,
    examTimeLimitMin: a.examTimeLimitMin ?? null,
    // 빈 배열 = 반 전체(assignment_targets 0행). 서버가 각 id 를 :classId 멤버로 검증.
    targetStudentIds: a.targetStudentIds,
    questions: getQuestionsForAssignment(a).map((q, i) => {
      const key = answerKeyOf(q);
      return {
        order: q.order ?? i,
        type: q.type,
        prompt: q.prompt,
        ...(q.options ? { options: q.options } : {}),
        ...(key !== undefined ? { answerKey: key } : {}),
      };
    }),
  };
  try {
    const created = await domainFetch<AssignmentSummaryResponse>(
      `/classes/${encodeURIComponent(a.botId)}/assignments`,
      { method: 'POST', body },
    );
    useAssignmentStore.setState((s) => ({
      dispatched: s.dispatched.map((d) =>
        d.id === a.id ? { ...d, ...toUserAssignment(created) } : d,
      ),
    }));
  } catch (e) {
    console.warn('[assignments] BE 과제 발사 실패 — 로컬 유지:', e);
  }
}

/**
 * 학생 제출 → `POST /classbot/assignments/:id/submit`. **body 는 `{ answers }` 만** — 점수는 보내지
 * 않는다(서버가 answer_key 대조로 재계산). 응답의 서버 권위 scorePercent 로 로컬 제출 점수를 갱신한다.
 * 실패 시 경고 + 로컬 유지(낙관 mock 점수 보존).
 */
async function submitToBackend(submission: Submission): Promise<void> {
  try {
    const res = await domainFetch<SubmissionResponse>(
      `/assignments/${encodeURIComponent(submission.assignmentId)}/submit`,
      { method: 'POST', body: { answers: submission.answers } },
    );
    // 서버 권위 점수 소비(essay 미채점=null 은 낙관값 유지).
    if (typeof res.scorePercent === 'number') {
      const serverScore = res.scorePercent;
      useAssignmentStore.setState((s) => ({
        submissions: s.submissions.map((sub) =>
          sub.id === submission.id ? { ...sub, scorePercent: serverScore } : sub,
        ),
      }));
    }
  } catch (e) {
    console.warn('[assignments] BE 제출 기록 실패 — 로컬 유지:', e);
  }
}

// 사용자당 1회 fetch 단일 비행 — 소비 훅이 여러 곳에 마운트돼도 중복 요청하지 않고,
// 로그아웃/재로그인·사용자 전환 시(세션 사용자 변경) 재동기화한다.
let backendAssignmentSync: {
  key: string;
  promise: Promise<UserAssignment[] | null>;
} | null = null;

/** 테스트 전용 — 단일 비행 캐시 리셋. */
export function resetBackendAssignmentSyncForTests(): void {
  backendAssignmentSync = null;
}

async function fetchBackendAssignments(): Promise<UserAssignment[] | null> {
  try {
    // 정본 라우트는 bare array(`AssignmentSummaryResponseDto[]`)를 반환한다 — 래핑 객체 아님.
    const rows = await domainFetch<AssignmentSummaryResponse[]>('/assignments?audience=student');
    return rows.map(toUserAssignment);
  } catch (e) {
    console.warn('[assignments] BE 과제 목록 동기화 실패 — 로컬 유지:', e);
    return null;
  }
}

/**
 * 플래그 ON 읽기 동기화 — `GET /classbot/assignments?audience=student` 를 dispatched
 * 캐시에 병합한다. 같은 id 는 BE 행이 진실, BE 에 없는 로컬 행은 유지(쓰기 실패분 보존).
 * 플래그 OFF 면 완전 no-op.
 */
function useBackendAssignmentSync(): void {
  // 세션 사용자 변경(로그인/로그아웃)에 반응 — 같은 마운트에서도 effect 재실행.
  const syncUserId = useSyncUserId();
  useEffect(() => {
    if (!USE_REAL_CORE_BE) return;
    let cancelled = false;
    if (backendAssignmentSync?.key !== syncUserId) {
      backendAssignmentSync = {
        key: syncUserId,
        promise: fetchBackendAssignments(),
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
  }, [syncUserId]);
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
/*
 * ⚠ M2 경계 (Codex #196 R4 — 의도된 한계): 문항 **본문**은 여전히 mock 풀에서 해석한다 —
 * 문항 콘텐츠의 DB 영속·서버 해석은 M3(QGen 생성 경로) 소관(스키마 PR #192·BE PR #193 명시).
 * M2 의 BE 는 과제 메타(행)만 진실이고, 새 과제의 questions 는 빈 배열 + FE mock fallback.
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
