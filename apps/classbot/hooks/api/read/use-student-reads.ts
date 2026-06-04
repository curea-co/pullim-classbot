'use client';

/**
 * 학생 읽기 React Query 훅 — Phase 7 Stage 2 (bots / assignments).
 *
 * 각 훅은 같은 오리진 읽기 라우트(`/api/*`)를 `domainRead`(인증 헤더 첨부)로 친다.
 * 인증 세션이 준비되고 로그인된 경우에만 fetch 한다(`enabled`):
 *  - 미로그인이면 쿼리를 비활성화하고 `isUnauthenticated=true` 로 호출부가 로그인
 *    게이트를 띄운다(mock 폴백 없음 — D1 로그인월).
 *  - 401(만료 등)은 `UnauthorizedReadError` 로 와서 retry 하지 않고 게이트로 처리한다.
 *
 * 권위 계약 정합(`proc/spec/2026-05-18_be-api-design.md` §4): 학생 시점 봇/과제 목록은
 * spec 이 `?role=student` / `?audience=student` 분기를 정의하므로 그 쿼리를 명시해
 * 보낸다(Stage 1 라우트는 JWT sub 로 자기 명의 격리하며 미사용 파라미터는 무시 →
 * 현재 동작 불변 + 향후 spec-compliant 라우트와 전방 호환).
 *
 * NOTE(웰빙 제외): 웰빙 허브는 신원 소스 혼합(게이지/봇코멘트=mock roster vs 체크인=JWT
 * sub) 회귀 우려 + 5지표·봇코멘트가 아직 DB/읽기 API 에 없어 이 PR 범위에서 제외했다.
 * 후속 슬라이스에서 `/api/me/wellbeing`·`/api/me/emotion-checkins`(spec §4.7) 확장과
 * 함께 단일 auth-scoped 소스로 배선한다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth/auth-context';
import { domainRead, ReadError, UnauthorizedReadError } from '@/lib/api/read-fetch';
import type {
  AssignmentReadResponse,
  AssignmentReadRow,
  AssignmentsReadResponse,
  BotsReadResponse,
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

/** `GET /api/bots?role=student` — 내가 수강 중인 클래스봇 (spec §4.2). */
export function useMyBots(): StudentReadResult<BotsReadResponse> {
  return useStudentRead<BotsReadResponse>('bots', '/api/bots?role=student');
}

/** `GET /api/assignments?audience=student` — 내게 배정된 과제 (spec §4.5). */
export function useMyAssignments(): StudentReadResult<AssignmentsReadResponse> {
  return useStudentRead<AssignmentsReadResponse>(
    'assignments',
    '/api/assignments?audience=student',
  );
}

/** 단일 과제 읽기 결과 — 404(없음)를 별도 플래그로 노출한다. */
export interface SingleAssignmentResult {
  /** 과제 행(미인증·404·로딩 시 undefined). */
  data: AssignmentReadRow | undefined;
  isLoading: boolean;
  isUnauthenticated: boolean;
  /** 404 — 본인 명의 과제가 없음(상세 not-found 카드로 처리). */
  isNotFound: boolean;
  isError: boolean;
  refetch: UseQueryResult<AssignmentReadResponse>['refetch'];
}

/**
 * `GET /api/assignments/[id]` — 내 과제 단건.
 *
 * 상세면(`/classbot/assignment/[id]`)이 목록과 **같은 실DB 소스**를 보게 한다
 * (목록=실DB / 상세=mock 의 split-brain·404 회귀 제거). 404 는 retry 하지 않고
 * `isNotFound` 로 노출해 호출부가 not-found 카드를 그린다.
 */
export function useMyAssignment(id: string): SingleAssignmentResult {
  const { user, isReady } = useAuth();
  const isLoggedIn = isReady && Boolean(user);

  const query = useQuery<AssignmentReadResponse>({
    queryKey: ['student-read', 'assignment', id, user?.id ?? null],
    queryFn: () =>
      domainRead<AssignmentReadResponse>(`/api/assignments/${encodeURIComponent(id)}`),
    enabled: isLoggedIn && Boolean(id),
    retry: (failureCount, error) => {
      // 401(로그인월)·404(없음)는 재시도 무의미 → 게이트/not-found 로 처리.
      if (error instanceof UnauthorizedReadError) return false;
      if (error instanceof ReadError && error.status === 404) return false;
      return failureCount < 1;
    },
  });

  const isUnauthenticated =
    (isReady && !user) || query.error instanceof UnauthorizedReadError;
  const isNotFound =
    query.error instanceof ReadError && query.error.status === 404;

  return {
    data: query.data?.assignment,
    isLoading: !isReady || (isLoggedIn && query.isPending),
    isUnauthenticated,
    isNotFound,
    // 인증/404 이외의 실패(네트워크/5xx 등)만 일반 에러로 노출.
    isError: query.isError && !isUnauthenticated && !isNotFound,
    refetch: query.refetch,
  };
}
