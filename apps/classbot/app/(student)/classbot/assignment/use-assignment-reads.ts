'use client';

/**
 * 학생 과제 읽기 — 목록과 상세가 같이 쓰는 한 벌. 정본은 pullim-api 다.
 *
 * `GET /classbot/assignments?audience=student` · `GET /classbot/assignments/:id`(문항 포함) —
 * 2026-09-16 계획 §06 R7·R8 · §09 PR 4. 서버의 술어는 「현재 멤버 AND (타겟 없음 OR 본인 타겟)」
 * (pullim-api authz.md §1.5)이라 반 전체에 쏜 과제도 여기로 온다. 남의 과제는 404 다.
 *
 * 종전에는 같은 오리진 `/api/assignments*` 를 개발용 신원 쿠키로 쳤고, 401 이면 화면이 데모 스토어로
 * 갈아탔다. 이제 신원은 OS 세션(`useAuth`)이고 401 은 로그인으로 간다(`lib/api/classbot-client.ts`).
 * `isUnauthenticated` 는 그 리다이렉트가 도는 사이 화면이 오류 카드 대신 로그인 안내를 그리게 남겨 둔 값이다.
 * 데모 폴백(`useMergedAssignments`·`useAssignmentLookup`·`pullim-assignments` persist)은 PR 6 에서 걷었다 —
 * 목록·상세·풀이·결과·대화 **다섯 화면이 이 파일 하나만** 읽는다.
 *
 * queryKey 접두사는 `['student-read', …]` 그대로 둔다 — `useJoinByCode()`·`useSubmitAssignment()`·
 * `useDispatchAssignment()` 가 그 접두사로 무효화하므로, 새 반·새 제출·새 과제가 목록에 바로 따라 들어온다.
 *
 * 화면은 종전 행 모양(`AssignmentReadRow`)을 그대로 읽는다 — 서버 DTO 를 그 모양으로 옮기는 것이
 * 아래 `toAssignmentReadRow` 다. 서버에 **없는 칸**은 이렇게 채운다(줄마다 이유):
 *  - `botId` ← `classId` — bot == class(ADR-063). 화면의 봇 조인 키가 그대로 선다.
 *  - `studentId: null` — 서버는 대상 표(`assignment_targets`)를 학생 응답에 싣지 않는다. 술어는 서버가 집행.
 *  - `completedCount: 0` · `recentAccuracy: null` — 학생 본인의 제출을 되읽는 문이 정본에 없다(`/submissions` 는
 *    operator 전용). 제출 직후의 점수는 `lib/store/submission-result.ts` 가 세션 안에서만 든다.
 *  - `assignedBy: ''` — 교사 표시명이 응답에 없다(계획 §10 해소 5 · pullim-api PR 2 members 조인). 모르는 것을
 *    지어내지 않는다 — 화면이 반 봇 이름을 먼저 쓰고, 그것도 없을 때의 「선생님」은 화면의 폴백이다
 *    (`assignment/page.tsx`).
 *  - `source: 'teacher-assigned'` · `reasonHint: null` · `scopeOverride: null` — 정본에 그 개념이 없다.
 *  - `dDay` 는 서버가 **낼 때 굳힌 정수**다(`due_at` 컬럼이 없어 다시 세지 않는다). `dispatchedAt` 부터 지난 날수를 빼
 *    지금 기준으로 다시 센 뒤(`remainingDDay`) 라벨로 만든다(`lib/assignment-labels.ts` — `parseDDay` 가 읽는 형태).
 *  - `mode`·`difficulty`·`state` 는 서버가 string 으로 열어 둔 칸이다 — 교사가 낼 때 이 앱의 union 값을
 *    보내므로 그대로 좁히고, 낯선 값은 가장 보수적인 쪽(연습·중·todo)으로 접는다.
 *
 * 문항은 `toStudentQuestion` 이 옮긴다 — 정본 문항에는 **배점·정답·힌트·기준 응답이 없다**(🔒 answerKey 는 서버
 * 전용, 나머지는 칸 자체가 없다). 풀이·대화 화면이 읽는 `AssignmentQuestion` 모양으로 맞추되 그 칸들은 비운다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import type {
  AssignmentReadRow,
  AssignmentsReadResponse,
} from '@/hooks/api/read/types';
import {
  classbotRead,
  isNotFound,
  isUnauthorized,
  retryUnlessClientError,
} from '@/lib/api/classbot-client';
import type {
  AssignmentDetailDto,
  AssignmentQuestionDto,
  AssignmentSummaryDto,
} from '@/lib/api/classbot-dto';
import { remainingDDay } from '@/lib/assignment-due';
import { dDayLabel, dispatchedAtLabel } from '@/lib/assignment-labels';
import { useAuth } from '@/lib/auth/auth-context';
import type { AssignmentQuestion, QuestionType } from '@/lib/mock';

// 라벨 둘은 `lib/assignment-labels.ts` 로 옮겼다(교사 화면도 읽는다) — 호출부·테스트 경로 유지용 재수출.
export { dDayLabel, dispatchedAtLabel };

/** 상세 한 건 — 목록 행에 문항이 붙는다. 🔒 answerKey 없음. */
export type VisibleAssignmentRow = AssignmentReadRow & {
  questions: AssignmentQuestionDto[];
};

const MODES = ['practice', 'exam', 'wrong-conquest'] as const satisfies readonly AssignmentReadRow['mode'][];
const DIFFICULTIES = ['하', '중', '상'] as const satisfies readonly AssignmentReadRow['difficulty'][];
const STATES = ['todo', 'in-progress', 'submitted', 'overdue'] as const satisfies readonly AssignmentReadRow['state'][];
const QUESTION_TYPES = ['mc', 'short', 'essay', 'numeric'] as const satisfies readonly QuestionType[];

/** 서버가 string 으로 준 값을 화면 union 으로 좁힌다 — 목록에 없으면 폴백. 캐스팅 없이 `find` 로. */
function narrow<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((v) => v === raw) ?? fallback;
}

/**
 * 정본 문항 → 풀이·대화 화면이 읽는 `AssignmentQuestion`.
 *
 * `order` 는 정렬한 자리(1부터)로 다시 매긴다 — 서버 값은 0부터고 화면은 「n번」으로 부른다. `options` 는 blob 이라
 * 문자열만 남긴다(교사가 이 앱에서 낸 값은 문자열 배열이다). **`points: 0` 은 「모른다」다** — 정본에 배점 칸이
 * 없고, 학생 화면은 배점을 그리지 않는다. 힌트·기준 응답·정답도 없다 — 힌트 패널은 「힌트 없이 풀어봐요」로 선다.
 * @param dto - 정본 문항
 * @param assignmentId - 소속 과제
 * @param order - 정렬한 자리(1-based)
 */
export function toStudentQuestion(
  dto: AssignmentQuestionDto,
  assignmentId: string,
  order: number,
): AssignmentQuestion {
  const type = narrow(dto.type, QUESTION_TYPES, 'short');
  const options = Array.isArray(dto.options)
    ? dto.options.filter((o): o is string => typeof o === 'string')
    : [];
  return {
    id: dto.id,
    assignmentId,
    order,
    type,
    prompt: dto.prompt,
    points: 0,
    ...(type === 'mc' && options.length > 0 ? { options } : {}),
  };
}

/**
 * 상세 한 건의 문항 전부 — 서버 순서(`order`)로 정렬해 1번부터 매긴다.
 * @param row - `useVisibleAssignment` 가 준 행
 */
export function studentQuestionsOf(row: VisibleAssignmentRow): AssignmentQuestion[] {
  return [...row.questions]
    .sort((a, b) => a.order - b.order)
    .map((q, i) => toStudentQuestion(q, row.id, i + 1));
}

/**
 * 정본 요약 DTO → 화면 행. 서버에 없는 칸의 채움 규칙은 파일 머리주석.
 * @param dto - `AssignmentSummaryResponseDto` 한 행
 * @param now - 기준 시각(D-day 를 지금 기준으로 다시 세는 데 쓴다 · 테스트 주입용)
 * @returns 목록 카드·상세가 읽는 행
 */
export function toAssignmentReadRow(dto: AssignmentSummaryDto, now: number = Date.now()): AssignmentReadRow {
  return {
    id: dto.id,
    botId: dto.classId,
    studentId: null,
    title: dto.title,
    scope: dto.scope,
    subject: dto.subject,
    grade: dto.grade,
    chapterFrom: dto.chapterFrom ?? '',
    chapterTo: dto.chapterTo ?? '',
    achievementCodes: dto.achievementCodes ?? [],
    questionCount: dto.questionCount,
    difficulty: narrow(dto.difficulty, DIFFICULTIES, '중'),
    mode: narrow(dto.mode, MODES, 'practice'),
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '',
    assignedAtLabel: dispatchedAtLabel(dto.dispatchedAt),
    dueLabel: dto.dueLabel,
    dDay: dDayLabel(remainingDDay(dto.dDay, dto.dispatchedAt, now)),
    completedCount: 0,
    recentAccuracy: null,
    state: narrow(dto.state, STATES, 'todo'),
    reasonHint: null,
    solveHref: `/classbot/assignment/${dto.id}/solve?step=1`,
  };
}

/**
 * 정본 상세 DTO → 화면 행 + 문항.
 * @param dto - `AssignmentDetailResponseDto`
 * @param now - 기준 시각(테스트 주입용)
 * @returns 상세가 읽는 행
 */
export function toVisibleAssignmentRow(dto: AssignmentDetailDto, now: number = Date.now()): VisibleAssignmentRow {
  return { ...toAssignmentReadRow(dto, now), questions: dto.questions };
}

/** 목록 읽기 결과 — 인증 게이트가 반영된 모양(`StudentReadResult` 와 같은 계약). */
export interface VisibleAssignmentsResult {
  data: AssignmentsReadResponse | undefined;
  isLoading: boolean;
  /** 401 — 로그인으로 가는 중이다. 호출부는 오류 카드 대신 게이트를 그린다. */
  isUnauthenticated: boolean;
  isError: boolean;
  refetch: UseQueryResult<AssignmentsReadResponse>['refetch'];
}

/**
 * `GET /classbot/assignments?audience=student` — 내가 볼 수 있는 과제 전부.
 *
 * 세션 복원 전과 비로그인(리다이렉트 중)에는 묻지 않는다 — 그동안은 `isLoading` 이다.
 * 빈 상태를 먼저 그리고 나중에 목록이 나타나는 깜빡임을 막는다.
 * @returns 과제 목록과 상태
 */
export function useVisibleAssignments(): VisibleAssignmentsResult {
  const { user, isReady } = useAuth();
  const query = useQuery<AssignmentsReadResponse, ApiError>({
    queryKey: ['student-read', 'assignments', user?.id ?? null],
    queryFn: async () => {
      const rows = await classbotRead<AssignmentSummaryDto[]>('/assignments?audience=student');
      // `.map(toAssignmentReadRow)` 로 넘기면 안 된다 — 두 번째 인자 `now` 자리에 배열 인덱스(0,1,…)가 들어가
      // 모든 행의 D-day 가 1970 년 기준으로 세어진다(테스트가 「D-20715」로 잡았다). 한 번 잰 `now` 를 명시해 넘긴다.
      const now = Date.now();
      return { assignments: rows.map((row) => toAssignmentReadRow(row, now)) };
    },
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });

  const unauthenticated = isUnauthorized(query.error);
  return {
    data: query.data,
    isLoading: query.isPending,
    isUnauthenticated: unauthenticated,
    isError: query.isError && !unauthenticated,
    refetch: query.refetch,
  };
}

/** 단건 읽기 결과 — 404(없음)를 따로 알려 준다. */
export interface VisibleAssignmentResult {
  data: VisibleAssignmentRow | undefined;
  isLoading: boolean;
  isUnauthenticated: boolean;
  /** 404 — 내가 볼 수 있는 과제 중에 그 id 가 없다(남의 반 과제도 여기다). */
  isNotFound: boolean;
  isError: boolean;
  refetch: UseQueryResult<VisibleAssignmentRow>['refetch'];
}

/**
 * `GET /classbot/assignments/:id` — 과제 단건(문항 포함). 목록과 **같은 술어**를 쓴다.
 * @param id - 과제 id
 * @returns 과제 한 건과 상태
 */
export function useVisibleAssignment(id: string): VisibleAssignmentResult {
  const { user, isReady } = useAuth();
  const query = useQuery<VisibleAssignmentRow, ApiError>({
    queryKey: ['student-read', 'assignment', id, user?.id ?? null],
    queryFn: async () =>
      toVisibleAssignmentRow(
        await classbotRead<AssignmentDetailDto>(`/assignments/${encodeURIComponent(id)}`),
      ),
    enabled: isReady && user !== null && Boolean(id),
    retry: retryUnlessClientError,
  });

  const unauthenticated = isUnauthorized(query.error);
  const notFound = isNotFound(query.error);
  return {
    data: query.data,
    isLoading: query.isPending,
    isUnauthenticated: unauthenticated,
    isNotFound: notFound,
    isError: query.isError && !unauthenticated && !notFound,
    refetch: query.refetch,
  };
}
