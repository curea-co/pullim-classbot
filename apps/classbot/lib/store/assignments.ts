/**
 * 교사가 낸 과제 store — E2E mock 시연의 핵심 인프라.
 * spec 14 § 5.5, § 10.2.
 *
 * 정책:
 * - localStorage persist — 새로고침 후에도 학생 화면에 보존
 * - mock 시드 + dispatched 합산은 lib/mock/classbot.ts의 getMyAssignments() 헬퍼에서
 * - 새 과제 id 패턴: `as_user_${Date.now()}` (시드 id와 충돌 회피)
 *
 * **로컬 전용 캐시다 — 은퇴 대상(2026-09-16 계획 §10 결정 ① · PR 6).** 종전에는 `USE_REAL_CORE_BE`
 * 플래그가 켜지면 이 스토어가 pullim-api 정본과 동기화했다(dispatch·submit·목록 병합). 그 플래그는
 * 계획 PR 4 에서 걷었고, 배포에서 켜진 적 없던 그 레인도 함께 걷었다 — 정본 읽기는 이제 react-query
 * 훅이 한다(`app/(student)/classbot/assignment/use-assignment-reads.ts` · `hooks/api/assignment-dispatch.ts`).
 * 문항까지 실어 내는 발사·풀이·제출·결과의 서버 전환과 이 persist 의 은퇴는 PR 6 다
 * (계획 §07 학생·받은 과제 줄 「걷는 것: pullim-assignments persist · useMergedAssignments」).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Assignment, type AssignmentQuestion,
  studentAssignments, getAssignmentById as getSeedAssignmentById,
  getQuestionsByAssignment, getQuestionsByIds, gradingModeOf,
} from '@/lib/mock';

type DispatchStatus = 'draft' | 'sent' | 'scheduled' | 'withdrawn';

export type UserAssignment = Assignment & {
  /** 내기 상태 — Assignment.state(학생 시점)와 별개 */
  dispatchStatus: DispatchStatus;
  /** 대상 학생 id 배열 — 전원에게 내면 빈 배열 (전체 enrolled 의미) */
  targetStudentIds: string[];
  /** 교사가 낸 시각 (ISO8601) */
  dispatchedAt?: string;
  /** 회수한 시각 (ISO8601) — `dispatchStatus: 'withdrawn'` 과 짝 (`proc/spec/14 § 6`) */
  withdrawnAt?: string;
  /**
   * 마감 **시각**(ISO8601). `dueLabel`·`dDay` 는 **낼 때 굳은 문자열**이라 시간이 지나도
   * 안 움직인다 — 「D-7 로 낸 과제」는 닷새 뒤에도 `dDay: 'D-7'` 이다. 그 라벨로 마감을
   * 견주면 두 방향으로 틀린다(연장을 거절하고, 당기기를 통과시킨다). 그래서 견줄 값은
   * 따로 남긴다. 옛 행에는 없으므로(`undefined`) 읽는 쪽이 그 경우를 답해야 한다.
   *
   * ⚠️ **이 값은 아직 브라우저에만 산다.** `assignments` 테이블에는 `due_at` 컬럼이 없어서
   * (`lib/db/schema.ts` — `due_label`·`d_day` 뿐) BE 동기화로 온 행에는 늘 비어 있다.
   * 그래서 다른 기기에서는 「마감 지났나」가 `state === 'overdue'` 로만 답해지는데 그 값을
   * 쓰는 곳이 서버에 없다 — 즉 **동기화된 행은 영영 진행 중**으로 읽힌다. 컬럼을 더하는 것이
   * 제 자리 고침이고 별건이다(`proc/spec/14 § 6` 이 `results_released_at` 과 같이 적어 둘 것).
   */
  dueAt?: string;
  /** 시험 모드 시간 제한 (분) */
  examTimeLimitMin?: number;
  /** 오답 다시 내기(requiz) — 원 과제에서 오답률 높았던 문항 id 집합. 있으면 문항 해석이 이걸 그대로 쓴다. */
  requizQuestionIds?: string[];
  /**
   * 교사가 출제 화면에서 직접 작성한 문항(유형·발문·배점·정답·루브릭).
   * persist 대상 — 저장소는 그대로 localStorage 다. 비어 있으면 mock 시드/RAG 자동 추출로 해석한다.
   */
  questions?: AssignmentQuestion[];
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
  /** 교사가 낸 과제 모음 (학생이 받음) */
  dispatched: UserAssignment[];
  /** 임시 저장 모음 (학생 미발송) */
  drafts: UserAssignment[];
  /** 학생 제출 기록 — 동일 assignmentId+studentId 는 upsert */
  submissions: Submission[];

  dispatch: (a: UserAssignment) => void;
  saveDraft: (a: UserAssignment) => void;
  /**
   * 낸 과제의 일부 칸을 고친다 (`proc/spec/14 § 3.3.5`).
   *
   * **무엇을 잠글지는 여기서 정하지 않는다** — 수정 화면이 정한다(§ 5.7 잠금 행렬).
   * store 에 행렬을 넣으면 초안 편집까지 같은 규칙에 걸리는데, 초안은 아무도 못 받았으므로
   * 잠글 칸이 없다. 다만 **신원과 상태는 patch 로 못 바꾼다** — 그 둘은 고치기가 아니라
   * 다른 일(내기·회수)이라 각자의 액션이 있다.
   */
  updateDispatched: (id: string, patch: Partial<UserAssignment>) => void;
  /**
   * 회수 — 학생 목록에서 내린다. 제출·채점은 남는다(§ 5.3).
   *
   * ⚠️ **정본 경로는 아직 없다.** 이 셋(`withdraw`·`restore`·`updateDispatched`)은 서버로 보내지
   * 않는다 — pullim-api 에 고치기·회수 문이 없어서다. 그 문과 함께 PR 6 이 옮긴다
   * (`proc/spec/14 § 10.2`). 그때까지 회수는 이 기기의 로컬 사본에서만 사라진다.
   */
  withdraw: (id: string) => void;
  /** 회수 되돌리기 — 마감 전에만 화면이 연다(§ 3.3.6). */
  restore: (id: string) => void;
  recordSubmission: (s: Omit<Submission, 'id' | 'submittedAt'>) => Submission;
  /** 과제를 낸 직후 토스트 카피용 */
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
      },

      saveDraft: (a) =>
        set((s) => {
          const exists = s.drafts.find((d) => d.id === a.id);
          if (exists) {
            return { drafts: s.drafts.map((d) => (d.id === a.id ? { ...a, dispatchStatus: 'draft' } : d)) };
          }
          return { drafts: [...s.drafts, { ...a, dispatchStatus: 'draft' }] };
        }),

      updateDispatched: (id, patch) =>
        set((s) => {
          // 신원(`id`)·내기 상태(`dispatchStatus`)·회수 시각은 고치기의 대상이 아니다.
          // 뽑아서 버린다 — 화면이 실수로 넘겨도 조용히 무시되게.
          const { id: _id, dispatchStatus: _st, withdrawnAt: _wd, ...safe } = patch;
          void _id; void _st; void _wd;
          return {
            dispatched: s.dispatched.map((a) => (a.id === id ? { ...a, ...safe } : a)),
            drafts: s.drafts.map((a) => (a.id === id ? { ...a, ...safe } : a)),
          };
        }),

      withdraw: (id) =>
        set((s) => ({
          // 제출(`submissions`)은 건드리지 않는다 — 회수가 곧 증거 인멸이 되지 않게(§ 5.3).
          dispatched: s.dispatched.map((a) =>
            a.id === id
              ? { ...a, dispatchStatus: 'withdrawn' as const, withdrawnAt: new Date().toISOString() }
              : a,
          ),
        })),

      restore: (id) =>
        set((s) => ({
          dispatched: s.dispatched.map((a) =>
            a.id === id ? { ...a, dispatchStatus: 'sent' as const, withdrawnAt: undefined } : a,
          ),
        })),

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
 * 학생이 보는 전체 과제 — 시드 + 교사가 새로 낸 과제 합산.
 * 교사가 낸 시각 역순으로 정렬되어 새 과제가 위로 옴.
 *
 * 학생 id 필터: targetStudentIds가 빈 배열이면 전체 enrolled,
 * 그렇지 않으면 해당 학생만 포함.
 */
export function useMergedAssignments(studentId?: string): Assignment[] {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const visible = dispatched.filter(isStudentVisible);
  const filteredDispatched = studentId
    ? visible.filter((d) => d.targetStudentIds.length === 0 || d.targetStudentIds.includes(studentId))
    : visible;
  return [...filteredDispatched, ...studentAssignments];
}

/**
 * 학생에게 보여도 되는 과제인가 — **회수와 초안을 여기 한 곳에서 거른다.**
 *
 * 회수(`withdrawn`)는 교사 쪽 상태 변경만으로 끝나지 않는다. 확인 모달이 학생에게
 * 「받은 과제에서 사라져요」라고 약속하므로, 그 약속을 지키는 자리가 **학생이 읽는 선택자**다.
 * 종전에는 `dispatchStatus` 를 아무도 안 봐서 회수한 과제가 학생 목록에 그대로 남고
 * 풀이·제출까지 됐다 — 회수가 이름만 있고 아무 일도 안 한 셈이었다.
 *
 * 예약(`scheduled`)도 같이 거른다. 아직 낼 시각이 안 됐다는 뜻이라 학생이 볼 것이 아니다.
 * 지금 이 값을 만드는 FE 경로는 없지만 BE 동기화(`toUserAssignment`)가 그대로 실어 온다.
 *
 * 실 BE 경로는 서버가 이미 같은 판정을 한다(`app/api/_lib/assignment-visibility.ts`) —
 * 이 함수는 **mock·localStorage 경로**의 같은 문장이다. 둘이 갈리면 데모에서만 새는
 * 구멍이 생기므로 뜻을 같게 둔다.
 */
export function isStudentVisible(a: UserAssignment): boolean {
  // 초안은 `s.drafts` 에 살아서 오늘은 여기 안 온다. 그래도 거른다 — `toUserAssignment` 가
  // 서버 행의 `dispatchStatus` 를 그대로 `dispatched` 에 복사하므로, 서버가 초안을 돌려주는
  // 날 이 함수가 「거른다」고 읽히면서 실제로는 안 거르는 상태가 된다.
  return (
    a.dispatchStatus !== 'withdrawn' &&
    a.dispatchStatus !== 'scheduled' &&
    a.dispatchStatus !== 'draft'
  );
}

/** id로 과제 lookup — 시드 + 교사가 낸 과제 모두 검색 */
export function useAssignmentLookup(id: string): Assignment | undefined {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  // 목록에서 감추면서 딥링크는 열어 두면 회수가 반만 된다 — 풀이·제출이 그대로 가능하다.
  return dispatched.find((d) => d.id === id && isStudentVisible(d)) ?? getSeedAssignmentById(id);
}

/** mode 별 시드 과제 — 문항이 없는 과제를 시연 가능한 상태로 만드는 마지막 폴백. */
const SEED_ASSIGNMENT_BY_MODE: Record<Assignment['mode'], string> = {
  practice: 'as_today',
  exam: 'as_exam_prep',
  'wrong-conquest': 'as_prescription',
};

/**
 * 과제의 문항 풀 — 해석 우선순위:
 *   ① 오답 다시 내기 문항 → ② 교사가 출제 때 직접 작성한 문항 → ③ 같은 id 의 시드 문항 → ④ mode 시드 폴백.
 *
 * ④ 는 남겨 둔다: (a) 교사가 발문을 비워 두면 "단원 RAG 자동 추출" 규약이고(출제 폼이
 * 전부 작성됐을 때만 ② 를 싣는다), (b) 정본에서 온 과제는 `readRowToAssignment` 를 지나며 문항이
 * 비어 있고(서버 상세의 `questions` 를 풀이 화면이 쓰는 것은 PR 6), (c) 이 변경 전 localStorage 에
 * 남아 있는 과제도 문항을 갖고 있지 않다. 셋 다 ④ 가 없으면 풀이 화면이 빈 화면이 된다.
 */
/*
 * ⚠ M2 경계 (Codex #196 R4 — 의도된 한계): 서버에서 되받는 과제의 문항 **본문**은 여전히
 * mock 풀에서 해석한다 — 문항 콘텐츠의 DB 영속·서버 해석은 M3(QGen 생성 경로) 소관
 * (스키마 PR #192·BE PR #193 명시). M2 의 BE 는 과제 메타(행)만 진실이다.
 */
export function getQuestionsForAssignment(
  assignment: Assignment & { requizQuestionIds?: string[]; questions?: AssignmentQuestion[] },
): AssignmentQuestion[] {
  // 오답 다시 내기 과제 — 원 과제에서 틀린 바로 그 문항 집합을 보존 (generic 시드 대체 방지, Codex #186)
  if (assignment.requizQuestionIds && assignment.requizQuestionIds.length > 0) {
    const requizQs = getQuestionsByIds(assignment.requizQuestionIds);
    if (requizQs.length > 0) return requizQs;
  }
  // 교사가 출제 화면에서 직접 넣은 문항이 진실
  if (assignment.questions && assignment.questions.length > 0) {
    return [...assignment.questions].sort((a, b) => a.order - b.order);
  }
  const seedQs = getQuestionsByAssignment(assignment.id);
  if (seedQs.length > 0) return seedQs;
  return getQuestionsByAssignment(SEED_ASSIGNMENT_BY_MODE[assignment.mode]).slice(
    0,
    assignment.questionCount,
  );
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

/** 문항 배점 — 배점 없이 저장된 옛 데이터는 균등 배분(1점)으로 폴백. */
function pointsOf(q: AssignmentQuestion): number {
  return typeof q.points === 'number' && Number.isFinite(q.points) && q.points > 0 ? q.points : 1;
}

/** 단답 대조용 정규화 — 공백·대소문자 차이는 무시한다("0, 2" ≡ "0,2"). */
function normalizeAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

/** 수치 대조 — "33,400"·"2.0" 같은 표기 차이를 흡수하고, 숫자로 못 읽으면 문자열 대조로 폴백. */
function numericEquals(answer: string, key: string): boolean {
  const a = Number(answer.replace(/[,\s]/g, ''));
  const k = Number(key.replace(/[,\s]/g, ''));
  if (Number.isFinite(a) && Number.isFinite(k)) return Math.abs(a - k) < 1e-9;
  return normalizeAnswer(answer) === normalizeAnswer(key);
}

/**
 * 자동 채점 정오 판정 — `gradingModeOf` 가 'auto' 인 문항만 대상.
 * 반환 `null` = 자동 채점 대상 아님(서술형 = 교사 채점, 또는 정답키가 비어 판정 불가).
 * 정답키가 없는 문항을 무조건 오답으로 매기지 않기 위해 오답(false)과 구분한다.
 */
export function isQuestionCorrect(
  q: AssignmentQuestion,
  answer: string | undefined,
): boolean | null {
  if (gradingModeOf(q) === 'teacher') return null;
  if (q.type === 'mc') {
    if (q.answerIndex == null) return null;
    return (answer ?? '') === String(q.answerIndex);
  }
  const key = q.answerKey?.trim();
  if (!key) return null;
  if (answer == null || answer.trim() === '') return false;
  return q.type === 'numeric'
    ? numericEquals(answer, key)
    : normalizeAnswer(answer) === normalizeAnswer(key);
}

/**
 * 자동 채점 점수(0~100) — **문항 배점 가중**.
 * 분모는 자동 채점이 가능한 문항의 배점 합이다. 서술형(교사 채점)과 정답키 없는 문항은
 * 분자·분모 모두에서 빠진다 — 사람이 매길 점수를 mock 이 미리 깎지 않기 위해서다.
 * 자동 채점할 문항이 하나도 없으면 0(=미채점).
 */
export function computeMockScore(
  questions: AssignmentQuestion[],
  answers: Record<string, string>,
): number {
  let earned = 0;
  let total = 0;
  for (const q of questions) {
    const verdict = isQuestionCorrect(q, answers[q.id]);
    if (verdict === null) continue;
    const points = pointsOf(q);
    total += points;
    if (verdict) earned += points;
  }
  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

/** 특정 학생의 최신 submission */
export function useStudentSubmission(assignmentId: string, studentId: string): Submission | undefined {
  const submissions = useAssignmentStore((s) => s.submissions);
  return submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
}
