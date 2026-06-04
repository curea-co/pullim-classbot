'use client';

/**
 * 학생 읽기 4면 React Query 훅 — Phase 7 Stage 2.
 *
 * 각 훅은 같은 오리진 읽기 라우트(`/api/*`)를 `domainRead`(인증 헤더 첨부)로 친다.
 * 인증 세션이 준비되고 로그인된 경우에만 fetch 한다(`enabled`):
 *  - 미로그인이면 쿼리를 비활성화하고 `isUnauthenticated=true` 로 호출부가 로그인
 *    게이트를 띄운다(mock 폴백 없음 — D1 로그인월).
 *  - 401(만료 등)은 `UnauthorizedReadError` 로 와서 retry 하지 않고 게이트로 처리한다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth/auth-context';
import { domainRead, UnauthorizedReadError } from '@/lib/api/read-fetch';
import type {
  AssignmentsReadResponse,
  BotsReadResponse,
  GradesReadResponse,
  WellnessReadResponse,
} from './types';

/** 인증 게이트가 반영된 읽기 쿼리 결과. */
export interface StudentReadResult<T> {
  /** 응답 데이터(미인증·로딩 시 undefined). */
  data: T | undefined;
  /** 첫 로딩(인증된 상태에서 fetch 중). */
  isLoading: boolean;
  /** 비인증 — 로그인 게이트를 띄워야 함. */
  isUnauthenticated: boolean;
  /** 비-인증 오류(네트워크/5xx 등). */
  isError: boolean;
  /** 재시도 트리거. */
  refetch: UseQueryResult<T>['refetch'];
}

/** 401 은 retry 하지 않는다(로그인 게이트로 처리). 그 외 1회 retry. */
function retryUnlessUnauthorized(failureCount: number, error: unknown): boolean {
  if (error instanceof UnauthorizedReadError) return false;
  return failureCount < 1;
}

/**
 * 공통 읽기 쿼리 — 인증 준비/로그인 여부를 enabled 와 결과에 반영한다.
 */
function useStudentRead<T>(key: string, path: string): StudentReadResult<T> {
  const { user, isReady } = useAuth();
  const isLoggedIn = isReady && Boolean(user);

  const query = useQuery<T>({
    queryKey: ['student-read', key, user?.id ?? null],
    queryFn: () => domainRead<T>(path),
    enabled: isLoggedIn,
    retry: retryUnlessUnauthorized,
  });

  const isUnauthenticated =
    (isReady && !user) || query.error instanceof UnauthorizedReadError;

  return {
    data: query.data,
    // 세션 복원 중이거나, 로그인된 상태에서 fetch 중이면 로딩.
    isLoading: !isReady || (isLoggedIn && query.isPending),
    isUnauthenticated,
    isError: query.isError && !(query.error instanceof UnauthorizedReadError),
    refetch: query.refetch,
  };
}

/** `GET /api/bots` — 내가 수강 중인 클래스봇. */
export function useMyBots(): StudentReadResult<BotsReadResponse> {
  return useStudentRead<BotsReadResponse>('bots', '/api/bots');
}

/** `GET /api/assignments` — 내게 배정된 과제. */
export function useMyAssignments(): StudentReadResult<AssignmentsReadResponse> {
  return useStudentRead<AssignmentsReadResponse>('assignments', '/api/assignments');
}

/** `GET /api/grades` — 내 채점 이력. */
export function useMyGrades(): StudentReadResult<GradesReadResponse> {
  return useStudentRead<GradesReadResponse>('grades', '/api/grades');
}

/** `GET /api/wellness` — 내 웰빙 스냅샷 + 최근 감정 체크인. */
export function useMyWellness(): StudentReadResult<WellnessReadResponse> {
  return useStudentRead<WellnessReadResponse>('wellness', '/api/wellness');
}
