'use client';

/**
 * 과제 발사 훅 — 교사가 과제를 내고, 자기가 낸 과제를 되본다.
 *
 * 발사는 **행 하나**를 만든다. 학생 수만큼 행이 생기지 않고, 대상은 `targetStudentIds`
 * 로 적힌다 — 비워 두면 반 전체다. 학생 화면은 그 술어를 펼쳐 읽는다.
 *
 * 셋이 **다른 서버**를 본다 — 2026-09-16 계획 §09 PR 4·PR 6:
 *  - `useTeacherAssignments` 는 pullim-api 정본 `GET /assignments?audience=teacher` 다. 문이 이미 있고,
 *    소비자가 아직 없어(계획 §07 「useTeacherAssignments(있음, 소비자 0)」) 응답 모양을 서버 그대로 둔다.
 *    반 필터(`&classId=`)는 pullim-api PR 2 가 더한다.
 *  - `useDispatchAssignment`·`useUpdateAssignment` 는 아직 같은 오리진 `/api/teacher/assignments*` 다.
 *    정본 `POST /classes/:id/assignments` 는 `questions[]` 를 **필수**로 받는데 FE 가 아직 문항을
 *    싣지 않아(계획 §10 「확인해서 문제가 아닌 것」), 지금 옮기면 매 발사가 400 이다. 문항까지 한 요청으로
 *    보내는 일이 PR 6 이고, 고치기·회수의 서버 문도 그때 같이 간다.
 *
 * 같은 오리진 둘의 잠금·캐시 규약은 `hooks/api/classroom.ts` 교사 훅과 같다 — `useCurrentUserId()` 를
 * queryKey 에 실어 신원이 바뀌면 캐시가 갈리게 한다. 정본 하나는 OS 세션(`useAuth`)을 본다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classbotRead, retryUnlessClientError } from '@/lib/api/classbot-client';
import type { AssignmentSummaryDto } from '@/lib/api/classbot-dto';
import { ApiClientError, apiPatch, apiPost } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  DispatchAssignmentInput,
  DispatchAssignmentResponse,
} from '@/hooks/api/types';

/** 쿼리 키 — 무효화할 때 이 상수를 쓴다. */
export const assignmentDispatchKeys = {
  teacherAssignments: ['teacher-assignments'] as const,
};

/**
 * `POST /api/teacher/assignments` — 과제 발사(같은 오리진 · PR 6 에서 정본으로).
 *
 * `targetStudentIds` 를 생략하거나 빈 배열로 주면 **반 전체**다.
 * @returns mutation. 성공하면 내가 낸 과제 목록을 다시 읽는다.
 */
export function useDispatchAssignment(): UseMutationResult<
  DispatchAssignmentResponse,
  ApiClientError,
  DispatchAssignmentInput
> {
  const queryClient = useQueryClient();
  return useMutation<
    DispatchAssignmentResponse,
    ApiClientError,
    DispatchAssignmentInput
  >({
    mutationFn: (input) =>
      apiPost<DispatchAssignmentResponse>('/api/teacher/assignments', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: assignmentDispatchKeys.teacherAssignments,
      });
      // 학생 쪽 과제 목록도 새 발사를 봐야 한다(같은 브라우저에서 역할을 오갈 때).
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}

/**
 * `GET /classbot/assignments?audience=teacher` — 내가 operator 인 모든 반의 과제(정본).
 *
 * 기준은 `created_by` 가 아니라 **현재 operator** 다(계획 §06 R11). 응답은 봉투 없는
 * `AssignmentSummaryDto[]` — 문항·answerKey 는 없다.
 * @returns react-query 결과(`data` = 요약 배열)
 */
export function useTeacherAssignments(): UseQueryResult<AssignmentSummaryDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<AssignmentSummaryDto[], ApiError>({
    queryKey: [...assignmentDispatchKeys.teacherAssignments, user?.id ?? null],
    queryFn: () => classbotRead<AssignmentSummaryDto[]>('/assignments?audience=teacher'),
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}

/** 낸 과제에서 고칠 수 있는 칸 — 서버도 이 밖은 안 받는다(`app/api/teacher/assignments/[id]/route.ts`). */
export interface UpdateAssignmentInput {
  id: string;
  title?: string;
  reasonHint?: string;
  /**
   * 마감 **시각**(ISO8601) — 서버가 「지난 마감인가」를 재는 근거.
   * `dueLabel` 과 **짝으로** 보낸다(하나만 보내면 400).
   */
  dueAt?: string;
  /**
   * 마감 **표시 문자열** — 교사 시간대로 그려진 값이라 클라이언트가 만든다.
   * 서버 런타임은 UTC 라 서버가 그리면 KST 교사의 마감이 9시간 어긋나 앉는다.
   */
  dueLabel?: string;
  /** 회수(`'withdrawn'`) · 되돌리기(`'sent'`). */
  dispatchStatus?: 'sent' | 'withdrawn';
}

/**
 * `PATCH /api/teacher/assignments/[id]` — 낸 과제 고치기·회수(같은 오리진 · PR 6 에서 정본으로).
 *
 * 정본에는 아직 고치기·회수 문이 없다(`lib/store/assignments.ts` `withdraw` 주석 —
 * 「플래그를 켜기 전에 이 셋의 서버 경로를 먼저 낸다」). 호출부가 401·404 를 「서버에 없는 과제」로
 * 읽고 로컬 사본만 고치는 규약은 그대로다.
 * @returns mutation. 성공하면 교사 목록과 학생 쪽 읽기를 다시 읽는다.
 */
export function useUpdateAssignment(): UseMutationResult<
  DispatchAssignmentResponse,
  ApiClientError,
  UpdateAssignmentInput
> {
  const queryClient = useQueryClient();
  return useMutation<DispatchAssignmentResponse, ApiClientError, UpdateAssignmentInput>({
    mutationFn: ({ id, ...patch }) =>
      // id 는 스토어·BE 동기화에서 오므로 그대로 끼우지 않는다 — `/`·`?` 가 들어가면
      // 요청이 다른 경로로 가거나 잘린다(`hooks/api/classroom.ts` 와 같은 처리).
      apiPatch<DispatchAssignmentResponse>(`/api/teacher/assignments/${encodeURIComponent(id)}`, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentDispatchKeys.teacherAssignments });
      // 회수는 학생이 보는 술어를 바꾼다 — 같은 브라우저에서 역할을 오갈 때 바로 비치게.
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}
