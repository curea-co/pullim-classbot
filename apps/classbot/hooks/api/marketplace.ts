'use client';

/**
 * 마켓 훅 — 둘러보기(목록·상세)와 교사의 게시·내리기 (마켓 계약 §2).
 *
 * 게이트는 `hooks/api/classroom.ts` 와 같은 규약이다. 잠그는 열쇠로 `useAuth().user` 를
 * 쓰지 않는다 — 그 신원은 JWT 세션이라 **개발용 신원 쿠키에서는 언제나 null** 이고,
 * 그걸로 `enabled` 를 세우면 로컬에서 이 훅들이 한 번도 안 나간다.
 * 대신 `useCurrentUserId()` 를 **queryKey 꼬리에** 넣는다:
 *  - 일단 보내고, 서버가 준 401 을 `ApiClientError` 로 받아 화면이 게이트를 세운다.
 *  - 역할 전환으로 신원이 바뀌면 캐시가 갈라진다. 마켓 목록 자체는 누가 봐도 같지만,
 *    **미인증일 때 캐시된 401 이 로그인 뒤에도 남는 것**을 이 꼬리가 막는다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiClientError, apiDelete, apiGet, apiPost } from '@/lib/api/client-fetch';
import { classroomKeys } from '@/hooks/api/classroom';
import { useCurrentUserId } from '@/lib/current-user';
import type {
  MarketplaceBotResponse,
  MarketplaceBotsResponse,
  PublishBotInput,
  PublishBotResponse,
} from '@/hooks/api/types';

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙으므로, 접두사만으로 무효화하면 모든 신원이 함께 갈린다.
 */
export const marketplaceKeys = {
  bots: ['marketplace-bots'] as const,
  bot: (botId: string) => ['marketplace-bot', botId] as const,
};

/** 401·404 는 다시 물어도 같은 답이다 — 게이트·빈 화면으로 넘긴다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * `GET /api/marketplace/bots` — 게시된 봇 전부(최근 게시순).
 *
 * 역할과 무관한 목록이라 학생·교사·학부모 화면이 **같은 훅**을 쓴다.
 * @returns react-query 결과(`data.bots`)
 */
export function useMarketplaceBots(): UseQueryResult<
  MarketplaceBotsResponse,
  ApiClientError
> {
  const userId = useCurrentUserId();
  return useQuery<MarketplaceBotsResponse, ApiClientError>({
    queryKey: [...marketplaceKeys.bots, userId],
    queryFn: () => apiGet<MarketplaceBotsResponse>('/api/marketplace/bots'),
    retry: retryUnlessGuarded,
  });
}

/**
 * `GET /api/marketplace/bots/[botId]` — 게시된 봇 한 개.
 *
 * 게시가 내려간 봇은 **404** 로 온다(`error.status === 404`) — 없는 봇과 같은 답이라
 * 화면은 둘을 구분하지 말고 「지금은 볼 수 없어요」 한 가지로 안내하면 된다.
 * @param botId - 봇 id. 비어 있으면 조회하지 않는다
 * @returns react-query 결과(`data.bot`)
 */
export function useMarketplaceBot(
  botId: string | null | undefined,
): UseQueryResult<MarketplaceBotResponse, ApiClientError> {
  const userId = useCurrentUserId();
  return useQuery<MarketplaceBotResponse, ApiClientError>({
    queryKey: [...marketplaceKeys.bot(botId ?? ''), userId],
    queryFn: () =>
      apiGet<MarketplaceBotResponse>(
        `/api/marketplace/bots/${encodeURIComponent(botId ?? '')}`,
      ),
    enabled: Boolean(botId),
    retry: retryUnlessGuarded,
  });
}

/**
 * `POST /api/teacher/bots/[botId]/publish` — 내 봇을 마켓에 건다.
 *
 * `blurb` 는 선택이고 **다듬은 뒤 200자까지**다. 넘기면 400 `INVALID_INPUT` 이 오고
 * `error.message` 가 이미 우리말이라 그대로 띄우면 된다.
 * 남의 봇 id 를 넣으면 403 이 아니라 **404** 다(존재 노출 차단).
 *
 * ⚠️ **`blurb` 는 이 요청이 통째로 정한다** — 안 넘기면 저장돼 있던 소개가 지워진다.
 * 소개를 안 고치는 게시(내렸다 다시 걸기 등)에서도 **저장된 값을 그대로 실어 보내라.**
 * 그 값은 `useTeacherClassrooms()` 의 `publishBlurb` 에 있다 — 그 조회는 게시 여부로
 * 거르지 않아 **내려간 봇의 소개도 읽힌다.** `useMarketplaceBots()` 로 읽지 마라.
 * 거긴 게시된 봇만 있어서 내린 순간 소개가 사라진 것처럼 보인다.
 * @returns mutation. 성공하면 마켓 목록·상세와 교사 수업방 목록을 다시 읽는다
 */
export function usePublishBot(): UseMutationResult<
  PublishBotResponse,
  ApiClientError,
  PublishBotInput & { botId: string }
> {
  const queryClient = useQueryClient();
  return useMutation<
    PublishBotResponse,
    ApiClientError,
    PublishBotInput & { botId: string }
  >({
    mutationFn: ({ botId, blurb }) =>
      apiPost<PublishBotResponse>(
        `/api/teacher/bots/${encodeURIComponent(botId)}/publish`,
        { blurb },
      ),
    onSuccess: (_data, { botId }) => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.bots });
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.bot(botId) });
      // 수업방 카드의 게시 배지는 **마켓 목록에서 파생**된다(`TeacherClassroomItem` 에
      // 게시 상태 칸이 없다). 목록만 갈아도 배지는 맞지만, 카드 자체가 헌 응답으로
      // 남아 있으면 배지와 나머지 칸의 시점이 어긋난다 — 카드도 같이 다시 읽는다.
      void queryClient.invalidateQueries({ queryKey: classroomKeys.teacherClassrooms });
    },
  });
}

/**
 * `DELETE /api/teacher/bots/[botId]/publish` — 게시를 내린다.
 *
 * 한 줄 소개는 **DB 에 남는다.** 다만 그것만으로 저절로 복원되지는 않는다 —
 * 다시 걸 때 `usePublishBot()` 에 그 값을 **도로 실어 보내야** 살아남는다(안 보내면 지워진다).
 * 읽는 자리는 `useTeacherClassrooms()` 의 `publishBlurb` 다. 내려간 뒤에도 읽히므로
 * 게시 폼을 거기서 채우면 된다.
 * @returns mutation. 성공하면 마켓 목록·상세와 교사 수업방 목록을 다시 읽는다
 */
export function useUnpublishBot(): UseMutationResult<
  PublishBotResponse,
  ApiClientError,
  { botId: string }
> {
  const queryClient = useQueryClient();
  return useMutation<PublishBotResponse, ApiClientError, { botId: string }>({
    mutationFn: ({ botId }) =>
      apiDelete<PublishBotResponse>(
        `/api/teacher/bots/${encodeURIComponent(botId)}/publish`,
      ),
    onSuccess: (_data, { botId }) => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.bots });
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.bot(botId) });
      // 수업방 카드의 게시 배지는 **마켓 목록에서 파생**된다(`TeacherClassroomItem` 에
      // 게시 상태 칸이 없다). 목록만 갈아도 배지는 맞지만, 카드 자체가 헌 응답으로
      // 남아 있으면 배지와 나머지 칸의 시점이 어긋난다 — 카드도 같이 다시 읽는다.
      void queryClient.invalidateQueries({ queryKey: classroomKeys.teacherClassrooms });
    },
  });
}
