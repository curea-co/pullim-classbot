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
import type {
  ParentChildrenResponse,
  ParentSelfStudyResponse,
} from '@/hooks/api/types';

/** 쿼리 키 — 무효화할 때 이 상수를 쓴다. */
export const parentKeys = {
  children: ['parent-children'] as const,
  selfStudy: ['parent-self-study'] as const,
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

/* ── 자기주도 요약 ─────────────────────────────────────── */

/**
 * `GET /api/parent/children/self-study` — 자녀의 자기주도 요약.
 *
 * `useParentChildren` 과 **일부러 다른 입구**다. 동의 축이 다르기 때문이다(반·과제 /
 * 자기주도). 한 응답에 축이 둘이 되면 다음 사람이 새 필드를 어느 축 뒤에 두어야 할지 알 수
 * 없다. 화면 두 곳에서 나란히 부르는 것은 괜찮다 — 섞이는 건 응답이지 화면이 아니다.
 *
 * ⚠️ **「동의한 자녀만」 오는 것이 아니다.** 응답에는 **연결 자녀가 전원** 실리고, 미동의
 * 자녀는 내용만 빈다(`bots: []` · `streak` 0). 그래서 「동의했지만 활동 0」 자녀와 **값이
 * 같고**, 부모가 둘을 가를 수 없다(05 § 11.4 규칙 2 · 빈 내용 마스킹).
 *
 * 자녀를 결과에서 빼는 판으로 되돌리지 마라 — 학부모는 `useParentChildren` 에서 연결 자녀
 * 전원을 이미 받으므로, 두 응답을 **대조하면 빠진 자녀가 곧 미동의 자녀**가 된다.
 *
 * @returns react-query 결과(`data.children` — **연결 자녀 전원**. 보여줄 내용이 있는
 *   자녀만 고르는 일은 `self-study-visibility.ts` 의 `visibleChildren` 이 한다)
 */
export function useParentSelfStudy(): UseQueryResult<
  ParentSelfStudyResponse,
  ApiClientError
> {
  const userId = useCurrentUserId();
  return useQuery<ParentSelfStudyResponse, ApiClientError>({
    queryKey: [...parentKeys.selfStudy, userId],
    queryFn: () => apiGet<ParentSelfStudyResponse>('/api/parent/children/self-study'),
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status < 500) return false;
      return failureCount < 1;
    },
  });
}
