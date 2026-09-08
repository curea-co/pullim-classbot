'use client';

/**
 * 학부모 훅 — 내 자녀와 자녀의 수업방·과제.
 *
 * 자녀 목록은 서버가 `parent_child_links` 로 좁혀 준다. 화면이 학생 id 를 골라 보내는
 * 구조가 아니다 — 그래야 남의 아이 자료를 요청할 방법 자체가 없다.
 *
 * 잠금·캐시 규약은 `hooks/api/classroom.ts` 와 같다 — `useAuth().user` 로 막지 않고
 * `useCurrentUserId()` 를 queryKey 에 실어 신원이 바뀌면 캐시가 갈리게 한다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { ApiClientError, apiGet } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import type { ParentChildrenResponse } from '@/hooks/api/types';

/** 쿼리 키 — 무효화할 때 이 상수를 쓴다. */
export const parentKeys = {
  children: ['parent-children'] as const,
};

/**
 * `GET /api/parent/children` — 내 자녀 + 각 자녀의 수업방·과제.
 * @returns react-query 결과(`data.children`)
 */
export function useParentChildren(): UseQueryResult<
  ParentChildrenResponse,
  ApiClientError
> {
  const userId = useCurrentUserId();
  return useQuery<ParentChildrenResponse, ApiClientError>({
    queryKey: [...parentKeys.children, userId],
    queryFn: () => apiGet<ParentChildrenResponse>('/api/parent/children'),
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status < 500) return false;
      return failureCount < 1;
    },
  });
}
