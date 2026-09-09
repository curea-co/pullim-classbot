'use client';

/**
 * 담은 봇 · 공부한 날 — 화면이 읽는 **유일한** 입구 (자기주도 계약 §3).
 *
 * 지금 값은 localStorage(`lib/store/self-learning.ts`)에서 오지만, 모양은 react-query
 * 결과 그대로다. P3 에서 소스가 서버로 바뀔 때 **이 파일 안쪽만** 갈아 끼우면 되고
 * 화면은 한 줄도 안 바뀐다 — 그래서 컴포넌트에 zustand 를 직접 노출하지 않는다.
 * 같은 이유로 시그니처는 **동결**이다. 고쳐야 할 것 같으면 바꾸지 말고 보고한다.
 *
 * 지금 두 필드의 의미:
 *  - `isLoading` — 하이드레이션 전 구간(`lib/store/use-hydrated.ts`). 이때 `data` 는
 *    `undefined` 다. SSR·첫 페인트의 빈 목록을 「담은 봇 없음」으로 그리면 안 되기 때문이다.
 *  - `isError` — 지금은 항상 `false`. **자리를 비워 두지 않는다** — P3 에서 진짜 값이 온다.
 *  - `isPending` — 지금 쓰기는 동기라 항상 `false`. 위와 같은 이유로 자리를 지킨다.
 */

import { useCallback, useMemo } from 'react';

import { useCurrentUserId } from '@/lib/current-user';
import {
  deriveStreak,
  useSelfLearningStore,
  type SelfBotRow,
} from '@/lib/store/self-learning';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

export type { SelfBotRow };

/** 셀렉터가 매번 새 배열을 만들지 않도록 하는 공용 빈 값(무한 렌더 방지). */
const EMPTY_BOTS: SelfBotRow[] = [];
const EMPTY_DAYS: string[] = [];

/** 조회 훅 공통 모양 — P3 에서 react-query 결과가 그대로 들어올 자리. */
export interface SelfQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** 쓰기 훅 공통 모양. */
export interface SelfMutationResult<TArg> {
  mutate: (arg: TArg) => void;
  isPending: boolean;
}

/** 인자를 생략할 수 있는 쓰기 훅 — 공부한 날처럼 기본값(오늘)이 있는 자리. */
export interface SelfOptionalMutationResult<TArg> {
  mutate: (arg?: TArg) => void;
  isPending: boolean;
}

/**
 * 내가 담은 봇 목록 — 담은 순서(오래된 것 먼저).
 *
 * `botId` 는 마켓이 주는 **`class_bots.id`** 라 그대로 `useMarketplaceBot(botId)` 에 넣거나
 * 대화 상대로 쓸 수 있다.
 * @returns 담은 봇 행 목록. 하이드레이션 전에는 `data` 가 `undefined`
 */
export function useMySelfBots(): SelfQueryResult<SelfBotRow[]> {
  const userId = useCurrentUserId();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const bots = useSelfLearningStore((s) => s.byUser[userId]?.bots ?? EMPTY_BOTS);
  return useMemo(
    () => ({ data: hydrated ? bots : undefined, isLoading: !hydrated, isError: false }),
    [bots, hydrated],
  );
}

/**
 * 이 봇을 이미 담았는가 — 마켓 카드·상세의 「담기 / 담음」 토글용.
 *
 * 하이드레이션 전에는 `false` 다(=「아직 안 담음」). 담기 **여부로 화면을 가르는** 자리라면
 * `useMySelfBots().isLoading` 을 함께 보고 그 사이를 비워 둬라.
 * @param botId - 마켓 봇 id. 없으면 항상 false
 * @returns 담았으면 true
 */
export function useIsSelfAdded(botId: string | null | undefined): boolean {
  const userId = useCurrentUserId();
  return useSelfLearningStore((s) =>
    botId ? (s.byUser[userId]?.bots.some((b) => b.botId === botId) ?? false) : false,
  );
}

/**
 * 봇 담기 — 같은 봇을 두 번 담아도 한 줄이다(멱등).
 *
 * ⛔ 이건 **반 참여가 아니다.** `enrollments` 행도, 교사의 학생 수도 건드리지 않는다.
 * @returns `mutate(botId)`
 */
export function useAddSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const addSelfBot = useSelfLearningStore((s) => s.addSelfBot);
  const mutate = useCallback(
    (botId: string) => addSelfBot(userId, botId),
    [addSelfBot, userId],
  );
  return useMemo(() => ({ mutate, isPending: false }), [mutate]);
}

/**
 * 담은 봇 빼기 — 대화 기록·공부한 날은 남는다(P3 에서도 같은 계약).
 * @returns `mutate(botId)`
 */
export function useRemoveSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const removeSelfBot = useSelfLearningStore((s) => s.removeSelfBot);
  const mutate = useCallback(
    (botId: string) => removeSelfBot(userId, botId),
    [removeSelfBot, userId],
  );
  return useMemo(() => ({ mutate, isPending: false }), [mutate]);
}

/**
 * 공부한 날 `'YYYY-MM-DD'` — 오름차순·중복 없음.
 *
 * P4 `self_study_days` 의 한 행이 이 배열의 한 칸이다. 카운터가 아니라 날짜를 쌓아 두는
 * 이유가 그것 — 나중에 이 배열을 그대로 서버로 올린다.
 * @returns 날짜 배열(없으면 빈 배열)
 */
export function useSelfStudyDays(): { data: string[] } {
  const userId = useCurrentUserId();
  const days = useSelfLearningStore(
    (s) => s.byUser[userId]?.studyDays ?? EMPTY_DAYS,
  );
  return useMemo(() => ({ data: days }), [days]);
}

/**
 * 오늘 공부했다고 기록 — 하루에 여러 번 불러도 한 칸이다(멱등).
 * @returns `mutate(date?)` — 날짜를 안 주면 오늘(`lib/store/today-key.ts`)
 */
export function useRecordSelfStudyDay(): SelfOptionalMutationResult<string> {
  const userId = useCurrentUserId();
  const recordStudyDay = useSelfLearningStore((s) => s.recordStudyDay);
  const mutate = useCallback(
    (date?: string) => recordStudyDay(userId, date),
    [recordStudyDay, userId],
  );
  return useMemo(() => ({ mutate, isPending: false }), [mutate]);
}

/**
 * 연속 학습 — **`useSelfStudyDays()` 에서 읽을 때 계산한다.**
 *
 * 숫자로 저장하지 않는 이유: 카운터는 검증할 수 없고(어느 날들로 그 수가 나왔는지 모른다)
 * 되돌릴 수도 없다. 날짜가 정본이고 이 값은 파생이다.
 * @returns 연속일수와 마지막 학습일
 */
export function useSelfStreak(): { count: number; lastStudyDate: string | null } {
  const { data: days } = useSelfStudyDays();
  return useMemo(() => deriveStreak(days), [days]);
}
