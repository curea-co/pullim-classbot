'use client';

/**
 * 봇 마켓 읽기 훅 — pullim-api 정본 `GET /classbot/marketplace/bots*`.
 *
 * ADR-094 는 이번 마켓을 **풀림 공식 봇 둘을 바로 쓰는 카탈로그**로 연다.
 * 교사 봇 게시·해제는 그 결정의 open item 이므로 이 파일은 읽기 둘만 소유한다.
 * 종전 same-origin `/api/marketplace/*`는 OS 세션을 검증할 수 없어 배포본에서 항상
 * 401이었다. 이제 `classbotRead` → `domainFetch` 경계를 통해 OS HttpOnly 쿠키를
 * pullim-api가 검증한다.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classbotRead, retryUnlessClientError } from '@/lib/api/classbot-client';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  MarketplaceBotItem,
  MarketplaceBotResponse,
  MarketplaceBotsResponse,
} from '@/hooks/api/types';

/**
 * 정본은 DB 현실을 그대로 내려 nullable 필드와 자유 문자열 말투를 허용한다.
 * 화면의 기존 `MarketplaceBotItem`은 이 경계에서 폴백을 적용해 넓히지 않는다.
 */
interface MarketplaceApiBotItem
  extends Omit<
    MarketplaceBotItem,
    'avatarEmoji' | 'subject' | 'grade' | 'tone' | 'greeting' | 'teacherName' | 'organization'
  > {
  avatarEmoji: string | null;
  subject: string | null;
  grade: string | null;
  tone: string | null;
  greeting: string | null;
  teacherName: string | null;
  organization: string | null;
}

interface MarketplaceApiBotsResponse {
  bots: MarketplaceApiBotItem[];
}

interface MarketplaceApiBotResponse {
  bot: MarketplaceApiBotItem;
}

const TONES = new Set<MarketplaceBotItem['tone']>([
  '정중',
  '친근',
  '스파르타',
  '차분',
  '열정',
]);

function isMarketplaceTone(value: string | null): value is MarketplaceBotItem['tone'] {
  return value !== null && TONES.has(value as MarketplaceBotItem['tone']);
}

/** 정본 nullable DTO를 현 화면이 그릴 수 있는 모양으로 좁힌다. */
function toMarketplaceBot(item: MarketplaceApiBotItem): MarketplaceBotItem {
  return {
    ...item,
    avatarEmoji: item.avatarEmoji ?? '🤖',
    subject: item.subject ?? '',
    grade: item.grade ?? '',
    tone: isMarketplaceTone(item.tone) ? item.tone : '친근',
    greeting: item.greeting ?? '안녕! 무엇을 같이 볼까?',
    teacherName: item.teacherName ?? '',
    organization: item.organization ?? '',
  };
}

/** 쿼리 키 — 신원 id 는 뒤에 붙여 계정 전환 시 캐시를 가른다. */
export const marketplaceKeys = {
  bots: ['marketplace-bots'] as const,
  bot: (botId: string) => ['marketplace-bot', botId] as const,
};

/** `GET /classbot/marketplace/bots` — 게시된 봇 전체(최근 게시순). */
export function useMarketplaceBots(): UseQueryResult<MarketplaceBotsResponse, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<MarketplaceBotsResponse, ApiError>({
    queryKey: [...marketplaceKeys.bots, user?.id ?? null],
    queryFn: async () => {
      const response = await classbotRead<MarketplaceApiBotsResponse>('/marketplace/bots');
      return { bots: response.bots.map(toMarketplaceBot) };
    },
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/marketplace/bots/:botId` — 게시된 봇 하나.
 * 미존재·미게시는 둘 다 404 `BOT_NOT_FOUND`로 같다.
 */
export function useMarketplaceBot(
  botId: string | null | undefined,
): UseQueryResult<MarketplaceBotResponse, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<MarketplaceBotResponse, ApiError>({
    queryKey: [...marketplaceKeys.bot(botId ?? ''), user?.id ?? null],
    queryFn: async () => {
      const response = await classbotRead<MarketplaceApiBotResponse>(
        `/marketplace/bots/${encodeURIComponent(botId ?? '')}`,
      );
      return { bot: toMarketplaceBot(response.bot) };
    },
    enabled: isReady && user !== null && Boolean(botId),
    retry: retryUnlessClientError,
  });
}
