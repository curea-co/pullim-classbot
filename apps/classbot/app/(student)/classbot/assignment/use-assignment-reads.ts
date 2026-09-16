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
 * `isUnauthenticated` 는 그 리다이렉트가 도는 사이 화면이 오류 카드를 띄우지 않게 남겨 둔 값이다 —
 * 호출부의 데모 폴백 분기(`assignmentToReadRow(localA)`)는 그래서 실제로는 더 닿지 않으며, 로컬
 * 스토어와 함께 PR 6 이 걷는다(계획 §07 학생·받은 과제 줄 「pullim-assignments persist · useMergedAssignments」).
 *
 * queryKey 접두사는 `['student-read', …]` 그대로 둔다 — `useJoinByCode()` 가 참여 성공 후 그 접두사로
 * 무효화하므로, 새 반의 과제가 목록에 바로 따라 들어온다.
 *
 * 화면은 종전 행 모양(`AssignmentReadRow`)을 그대로 읽는다 — 서버 DTO 를 그 모양으로 옮기는 것이
 * 아래 `toAssignmentReadRow` 다. 서버에 **없는 칸**은 이렇게 채운다(줄마다 이유):
 *  - `botId` ← `classId` — bot == class(ADR-063). 화면의 봇 조인 키가 그대로 선다.
 *  - `studentId: null` — 서버는 대상 표(`assignment_targets`)를 학생 응답에 싣지 않는다. 술어는 서버가 집행.
 *  - `completedCount: 0` · `recentAccuracy: null` — 제출 진행은 `/submit`·`/submissions` 에 있고 PR 6 이 잇는다.
 *  - `assignedBy: ''` — 교사 표시명이 응답에 없다(계획 §10 해소 5 · pullim-api PR 2 members 조인). 모르는 것을
 *    지어내지 않는다 — 화면이 반 봇 이름을 먼저 쓰고, 그것도 없을 때의 「선생님」은 화면의 폴백이다
 *    (`assignment/page.tsx`). 이 행을 `Assignment` 로 되돌리는 풀이·결과 화면은 PR 6 이 정본 문항·제출과 함께 본다.
 *  - `source: 'teacher-assigned'` · `reasonHint: null` · `scopeOverride: null` — 정본에 그 개념이 없다.
 *  - `dDay` 라벨은 정수에서 만든다(`lib/tokens/assignment-state.ts` `parseDDay` 가 읽는 형태).
 *  - `mode`·`difficulty`·`state` 는 서버가 string 으로 열어 둔 칸이다 — 교사가 낼 때 이 앱의 union 값을
 *    보내므로 그대로 좁히고, 낯선 값은 가장 보수적인 쪽(연습·중·todo)으로 접는다.
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
import { useAuth } from '@/lib/auth/auth-context';

/** 상세 한 건 — 목록 행에 문항이 붙는다. 🔒 answerKey 없음. 풀이 화면이 서버 문항을 쓰는 것은 PR 6. */
export type VisibleAssignmentRow = AssignmentReadRow & {
  questions: AssignmentQuestionDto[];
};

const MODES = ['practice', 'exam', 'wrong-conquest'] as const satisfies readonly AssignmentReadRow['mode'][];
const DIFFICULTIES = ['하', '중', '상'] as const satisfies readonly AssignmentReadRow['difficulty'][];
const STATES = ['todo', 'in-progress', 'submitted', 'overdue'] as const satisfies readonly AssignmentReadRow['state'][];

/** 서버가 string 으로 준 값을 화면 union 으로 좁힌다 — 목록에 없으면 폴백. 캐스팅 없이 `find` 로. */
function narrow<T extends string>(raw: string, allowed: readonly T[], fallback: T): T {
  return allowed.find((v) => v === raw) ?? fallback;
}

/**
 * 정수 D-day → 화면 라벨. `lib/tokens/assignment-state.ts` 의 `parseDDay` 가 읽는 네 형태
 * (`오늘`·`내일`·`D-n`·`지난 n일`)만 만든다 — 다른 모양을 내면 그쪽이 999 로 읽어 「진행 중」으로 뭉갠다.
 * @param dDay - 서버 정수(음수 = 마감 지남)
 * @returns 라벨
 */
export function dDayLabel(dDay: number): string {
  if (dDay === 0) return '오늘';
  if (dDay === 1) return '내일';
  if (dDay > 1) return `D-${dDay}`;
  return `지난 ${-dDay}일`;
}

/**
 * ISO 8601 → 「YYYY-MM-DD HH:mm」(브라우저 시간대). 목록 카드가 그대로 찍는 문자열이라
 * mock `Assignment.assignedAt` 과 같은 모양을 낸다. 배포 전(null)·깨진 값은 빈 문자열.
 * @param iso - `dispatchedAt`
 * @returns 표시 문자열
 */
export function dispatchedAtLabel(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 정본 요약 DTO → 화면 행. 서버에 없는 칸의 채움 규칙은 파일 머리주석.
 * @param dto - `AssignmentSummaryResponseDto` 한 행
 * @returns 목록 카드·상세가 읽는 행
 */
export function toAssignmentReadRow(dto: AssignmentSummaryDto): AssignmentReadRow {
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
    dDay: dDayLabel(dto.dDay),
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
 * @returns 상세가 읽는 행
 */
export function toVisibleAssignmentRow(dto: AssignmentDetailDto): VisibleAssignmentRow {
  return { ...toAssignmentReadRow(dto), questions: dto.questions };
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
      return { assignments: rows.map(toAssignmentReadRow) };
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
