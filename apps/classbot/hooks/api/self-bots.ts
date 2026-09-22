'use client';

/**
 * ADR-094 자기주도 입구.
 *
 * 담은 봇은 별도 목록 API가 없다. `GET /classbot/bots?role=student` 카드 중
 * `isSelfStudy`인 방이 곧 목록이고, 담기/빼기만 `/classbot/me/self-bots`에 쓴다.
 * 공부한 날은 pullim-api 계약이 생길 때까지 명시적인 로컬 임시 소스다. 따라서 OS 로그인
 * 상태에서도 `/api/me/study-days` 같은 same-origin 라우트를 호출하지 않는다.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classroomKeys, useMyClassrooms } from '@/hooks/api/classroom';
import {
  useClassbotDomainIdentityState,
  useServerIdentityState,
} from '@/hooks/api/self-server';
import { classbotWrite } from '@/lib/api/classbot-client';
import type { ClassDto } from '@/lib/api/classbot-dto';
import { useCurrentUserId } from '@/lib/current-user';
import { deriveStreak, useSelfLearningStore, type SelfBotRow } from '@/lib/store/self-learning';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

export type { SelfBotRow };

const EMPTY_BOTS: SelfBotRow[] = [];
const EMPTY_DAYS: string[] = [];

/** 기존 소비자의 무효화 표면. 실제 정본 캐시는 학생 카드 목록 하나다. */
export const selfBotKeys = { mine: classroomKeys.myClassrooms };

export interface SelfQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
}

export interface SelfMutationResult<TArg> {
  mutate: (arg: TArg) => void;
  isPending: boolean;
}

export interface SelfOptionalMutationResult<TArg> {
  mutate: (arg?: TArg) => void;
  isPending: boolean;
}

/** 자습방 카드가 곧 담은 봇 목록이다. 카드 id는 대화에 쓸 classId다. */
export function useMySelfBots(): SelfQueryResult<SelfBotRow[]> {
  const userId = useCurrentUserId();
  const identity = useClassbotDomainIdentityState();
  const classrooms = useMyClassrooms();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const localBots = useSelfLearningStore((s) => s.byUser[userId]?.bots ?? EMPTY_BOTS);

  const serverBots = useMemo<SelfBotRow[] | undefined>(() => {
    if (!classrooms.data) return undefined;
    return classrooms.data
      .filter((card) => card.isSelfStudy === true)
      .map((card) => ({
        botId: card.botId ?? card.id,
        classId: card.id,
        // BotCardDto에는 담은 시각이 없다. UI는 빈 값이면 그 줄을 숨긴다.
        addedAt: '',
      }));
  }, [classrooms.data]);

  if (identity === 'pending') return { data: undefined, isLoading: true, isError: false };
  if (identity === 'demo') {
    return { data: hydrated ? localBots : undefined, isLoading: !hydrated, isError: false };
  }
  return { data: serverBots, isLoading: classrooms.isPending, isError: classrooms.isError };
}

export function useIsSelfAdded(botId: string | null | undefined): boolean {
  const { data } = useMySelfBots();
  return Boolean(botId && data?.some((row) => row.botId === botId));
}

/** 공식 봇 담기. 200/201 모두 성공이며 응답의 ClassDto id가 자습방 classId다. */
export function useAddSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const identity = useClassbotDomainIdentityState();
  const addLocalSelfBot = useSelfLearningStore((s) => s.addSelfBot);
  const queryClient = useQueryClient();
  const mutation = useMutation<ClassDto, ApiError, string>({
    mutationFn: async (botId) => {
      const { body } = await classbotWrite<ClassDto>('/me/self-bots', { botId });
      return body;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: classroomKeys.myClassrooms });
    },
  });
  const { mutate: runMutation } = mutation;
  const mutate = useCallback((botId: string) => {
    if (identity === 'pending') return;
    if (identity === 'demo') {
      addLocalSelfBot(userId, botId);
      return;
    }
    runMutation(botId);
  }, [identity, addLocalSelfBot, userId, runMutation]);
  return useMemo(
    () => ({ mutate, isPending: identity === 'server' && mutation.isPending }),
    [mutate, identity, mutation.isPending],
  );
}

/** 멤버십만 비활성화한다. 204 빈 본문이 정상이며 반과 대화 기록은 남는다. */
export function useRemoveSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const identity = useClassbotDomainIdentityState();
  const removeLocalSelfBot = useSelfLearningStore((s) => s.removeSelfBot);
  const queryClient = useQueryClient();
  const mutation = useMutation<void, ApiError, string>({
    mutationFn: async (botId) => {
      await classbotWrite<null>(`/me/self-bots/${encodeURIComponent(botId)}`, undefined, 'DELETE');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: classroomKeys.myClassrooms });
    },
  });
  const { mutate: runMutation } = mutation;
  const mutate = useCallback((botId: string) => {
    if (identity === 'pending') return;
    if (identity === 'demo') {
      removeLocalSelfBot(userId, botId);
      return;
    }
    runMutation(botId);
  }, [identity, removeLocalSelfBot, userId, runMutation]);
  return useMemo(
    () => ({ mutate, isPending: identity === 'server' && mutation.isPending }),
    [mutate, identity, mutation.isPending],
  );
}

/** 공부한 날은 로그인 여부와 무관하게 로컬 임시 소스만 읽는다. */
export function useSelfStudyDays(): { data: string[] } {
  const userId = useCurrentUserId();
  const identity = useServerIdentityState();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const localDays = useSelfLearningStore((s) => s.byUser[userId]?.studyDays ?? EMPTY_DAYS);
  return useMemo(
    () => ({ data: hydrated && identity !== 'pending' ? localDays : EMPTY_DAYS }),
    [hydrated, identity, localDays],
  );
}

/** 공부한 날은 same-origin 서버 대신 현재 사용자 로컬 통에만 기록한다. */
export function useRecordSelfStudyDay(): SelfOptionalMutationResult<string> {
  const userId = useCurrentUserId();
  const identity = useServerIdentityState();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const recordStudyDay = useSelfLearningStore((s) => s.recordStudyDay);
  const mutate = useCallback((date?: string) => {
    if (!hydrated || identity === 'pending') return;
    recordStudyDay(userId, date);
  }, [hydrated, identity, recordStudyDay, userId]);
  return useMemo(() => ({ mutate, isPending: false }), [mutate]);
}

export function useSelfStreak(): { count: number; lastStudyDate: string | null } {
  const { data: days } = useSelfStudyDays();
  return useMemo(() => deriveStreak(days), [days]);
}
