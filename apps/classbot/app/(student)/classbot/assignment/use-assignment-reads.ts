'use client';

/**
 * 학생 과제 읽기 — 목록과 상세가 같이 쓰는 한 벌.
 *
 * `hooks/api/read/use-student-reads.ts` 의 `useMyAssignments()` 와 갈리는 지점은 하나,
 * **무엇으로 잠그는가**다. 저쪽은 `useAuth().user`(JWT 세션)가 있어야 요청을 보낸다.
 * 그런데 로컬 개발 신원은 **쿠키**(`pullim_dev_identity`)로 오고 JWT 는 없다 —
 * 그래서 저 훅은 개발용 신원으로 보는 동안 **한 번도 나가지 않고**, 화면은 언제나
 * 데모 스토어만 본다. 반 단위로 발사된 과제(`student_id IS NULL`)는 스토어에 없으므로
 * 「받은 과제가 없어요」가 된다.
 *
 * 그래서 `hooks/api/classroom.ts` 와 같은 규약을 쓴다:
 *  - 잠그지 않고 일단 보낸다. 쿠키는 같은 오리진 요청에 자동으로 실린다.
 *  - **서버가 준 401** 을 `isUnauthenticated` 로 올려 호출부가 데모 폴백을 세운다
 *    (로그인도 개발용 신원도 없는 prod 데모의 동작이 그대로 유지된다).
 *  - 신원 id 를 queryKey 에 실어 역할 전환 시 캐시가 갈리게 한다.
 *
 * queryKey 접두사는 `['student-read', …]` 그대로 둔다 — `useJoinByCode()` 가 참여 성공
 * 후 그 접두사로 무효화하므로, 새 반의 과제가 목록에 바로 따라 들어온다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  AssignmentReadResponse,
  AssignmentReadRow,
  AssignmentsReadResponse,
} from '@/hooks/api/read/types';
import { ApiClientError, apiGet } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';

/** 4xx 는 다시 보내도 같은 답이다. 5xx 만 한 번 더. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/** 401 인가 — 「로그인도 개발용 신원도 없다」. 그 밖의 4xx·5xx 는 그냥 실패다. */
function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

/** 목록 읽기 결과 — 인증 게이트가 반영된 모양(`StudentReadResult` 와 같은 계약). */
export interface VisibleAssignmentsResult {
  data: AssignmentsReadResponse | undefined;
  isLoading: boolean;
  /** 401 — 호출부가 데모 폴백 또는 로그인 게이트를 세운다. */
  isUnauthenticated: boolean;
  isError: boolean;
  refetch: UseQueryResult<AssignmentsReadResponse>['refetch'];
}

/**
 * `GET /api/assignments?audience=student` — 내가 볼 수 있는 과제 전부.
 *
 * 서버의 술어는 개인 배정(`student_id = 나`) **더하기** 반 단위 발사
 * (`student_id IS NULL` + 내가 그 봇에 참여 중)라, 반 전체에 쏜 과제도 여기로 온다.
 * @returns 과제 목록과 상태
 */
export function useVisibleAssignments(): VisibleAssignmentsResult {
  const userId = useCurrentUserId();
  const query = useQuery<AssignmentsReadResponse, ApiClientError>({
    queryKey: ['student-read', 'assignments', userId],
    queryFn: () => apiGet<AssignmentsReadResponse>('/api/assignments?audience=student'),
    retry: retryUnlessGuarded,
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
  data: AssignmentReadRow | undefined;
  isLoading: boolean;
  isUnauthenticated: boolean;
  /** 404 — 내가 볼 수 있는 과제 중에 그 id 가 없다. */
  isNotFound: boolean;
  isError: boolean;
  refetch: UseQueryResult<AssignmentReadResponse>['refetch'];
}

/**
 * `GET /api/assignments/[id]` — 과제 단건. 목록과 **같은 술어**를 쓴다.
 * @param id - 과제 id
 * @returns 과제 한 건과 상태
 */
export function useVisibleAssignment(id: string): VisibleAssignmentResult {
  const userId = useCurrentUserId();
  const query = useQuery<AssignmentReadResponse, ApiClientError>({
    queryKey: ['student-read', 'assignment', id, userId],
    queryFn: () =>
      apiGet<AssignmentReadResponse>(`/api/assignments/${encodeURIComponent(id)}`),
    enabled: Boolean(id),
    retry: retryUnlessGuarded,
  });

  const unauthenticated = isUnauthorized(query.error);
  const notFound = query.error instanceof ApiClientError && query.error.status === 404;
  return {
    data: query.data?.assignment,
    isLoading: query.isPending,
    isUnauthenticated: unauthenticated,
    isNotFound: notFound,
    isError: query.isError && !unauthenticated && !notFound,
    refetch: query.refetch,
  };
}
