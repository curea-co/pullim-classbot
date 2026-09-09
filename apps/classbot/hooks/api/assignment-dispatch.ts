'use client';

/**
 * 과제 발사 훅 — 교사가 과제를 내고, 자기가 낸 과제를 되본다.
 *
 * 발사는 **행 하나**를 만든다. 학생 수만큼 행이 생기지 않고, 대상은 `targetStudentIds`
 * 로 적힌다 — 비워 두면 반 전체다. 학생 화면은 그 술어를 펼쳐 읽는다.
 *
 * 잠금·캐시 규약은 `hooks/api/classroom.ts` 와 같다 — `useAuth().user` 로 막지 않고
 * `useCurrentUserId()` 를 queryKey 에 실어 신원이 바뀌면 캐시가 갈리게 한다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiClientError, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import type {
  DispatchAssignmentInput,
  DispatchAssignmentResponse,
  TeacherAssignmentsResponse,
} from '@/hooks/api/types';

/** 쿼리 키 — 무효화할 때 이 상수를 쓴다. */
export const assignmentDispatchKeys = {
  teacherAssignments: ['teacher-assignments'] as const,
};

/** 4xx 는 다시 보내도 같은 답이다. 5xx 만 한 번 더. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * `POST /api/teacher/assignments` — 과제 발사.
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
 * `GET /api/teacher/assignments` — 내가 낸 과제 목록(최신 발사가 위).
 * @returns react-query 결과(`data.assignments`)
 */
export function useTeacherAssignments(): UseQueryResult<
  TeacherAssignmentsResponse,
  ApiClientError
> {
  const userId = useCurrentUserId();
  return useQuery<TeacherAssignmentsResponse, ApiClientError>({
    queryKey: [...assignmentDispatchKeys.teacherAssignments, userId],
    queryFn: () => apiGet<TeacherAssignmentsResponse>('/api/teacher/assignments'),
    retry: retryUnlessGuarded,
  });
}
