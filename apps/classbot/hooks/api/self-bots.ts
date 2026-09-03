'use client';

/**
 * 담은 봇 · 공부한 날 — 화면이 읽는 **유일한** 입구 (자기주도 계약 §3).
 *
 * P1 이 세운 훅 경계가 P3 에서 값을 치렀다: **export 시그니처는 한 글자도 안 바뀌고**
 * 안쪽만 localStorage → 서버로 갈아 끼웠다. 화면 파일은 한 줄도 손대지 않았다.
 * 시그니처는 그대로 **동결**이다 — 고쳐야 할 것 같으면 바꾸지 말고 보고한다.
 *
 * ## 두 슬라이스가 지금 서로 다른 곳에 산다
 *  - **담은 봇** — 서버(`/api/me/self-bots`). 기기·브라우저를 넘어 남는다. ← 이번 단계
 *  - **공부한 날·연속 학습** — 아직 localStorage(`lib/store/self-learning.ts`). **P4 몫**이라
 *    이번엔 손대지 않는다. 한 파일이 두 출처를 읽는 게 어색해 보이는 건 맞지만,
 *    그게 지금의 사실이라 감추지 않고 적어 둔다.
 *
 * ## ⛔ 신원이 없으면 서버를 부르지 않는다 — 지우지 마라
 *
 * 담은 봇은 **신원이 있을 때만** 서버로 간다. 없으면 예전처럼 localStorage 를 읽고 쓰고,
 * **요청을 아예 내보내지 않는다.** 「일단 보내고 401 을 화면이 받는다」(`classroom.ts` 규약)를
 * 여기서만 따르지 않는 이유가 있다:
 *
 *  - prod(`classbot.pullim.ai`)는 **로그인 없이 열리는 공개 데모**다. 거기 방문자는
 *    세션도 개발 쿠키도 없어 `useCurrentUserId()` 가 데모 폴백(`student_001`)을 준다.
 *  - 서버 라우트는 그 상태를 **401** 로 답한다. 그러니 서버를 부르면 공개 데모의 담기
 *    버튼이 **전부 오류**가 된다 — 읽기 3면과 달리 여기는 로그인월을 세우는 자리가 아니다.
 *  - 401 을 「고장」이 아니라 **데모 상태**로 다루는 건 과제 폼에서 이미 내린 판단이다.
 *    새 규칙이 아니라 그 선례를 같은 이유로 따르는 것이다.
 *
 * 그래서 아래 `useHasServerIdentity()` 가 갈래를 정한다. **「간단히 하겠다」며 이 분기를 걷어
 * 무조건 쿼리로 만들면 prod 데모가 조용히 깨진다.** 로컬에서는 개발 쿠키가 있어 티가 안 난다.
 *
 * 신원이 있을 때 게이트는 `useAuth().user` 가 아니라 `useCurrentUserId()` 다 — 개발용 신원
 * 쿠키에서는 세션이 null 이라 그걸로 잠그면 쿼리가 **영영 안 나간다.** 그 id 는 queryKey
 * 꼬리에 붙어 신원이 바뀌면 캐시를 가른다(안 넣으면 서연의 목록이 민준 화면에 그대로 남는다).
 * 선례: `hooks/api/classroom.ts`.
 *
 * P1 이 「자리만 잡아 둔다」고 적어 둔 세 필드에 이제 진짜 값이 들어왔다(데모에서는
 * P1 때와 같은 뜻으로 남는다 — 그래서 화면은 두 갈래를 구분할 필요가 없다):
 *  - `isLoading` — 서버 응답 전 구간(데모에서는 하이드레이션 전). 이때 `data` 는
 *    `undefined` 다. 잠깐이라도 `[]` 를 주면 화면이 그 순간을 「담은 봇 없음」으로 그린다.
 *  - `isError` — 조회 실패. 데모에서는 갈 곳이 없어 언제나 `false` 다.
 *  - `isPending` — 담기·빼기 왕복 중. 데모의 쓰기는 동기라 언제나 `false` 다.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiClientError, apiDelete, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUserId } from '@/lib/current-user';
import { useDevIdentityId } from '@/lib/use-dev-identity';
import {
  deriveStreak,
  useSelfLearningStore,
  type SelfBotRow,
} from '@/lib/store/self-learning';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import type {
  AddSelfBotInput,
  AddSelfBotResponse,
  MySelfBotsResponse,
  RemoveSelfBotResponse,
} from '@/hooks/api/types';

/*
  행 모양(`SelfBotRow`)은 스토어에서, 봉투(`MySelfBotsResponse` 등)는 서버 계약에서 온다.
  둘로 갈린 게 아니라 **같은 두 칸이 두 곳에 적힌 것**이다 — 계약 §2 가 행 모양을
  「P1 에서 이미 고정된 모양 그대로」로 못박아 서버가 그 모양을 따라 적었다.
  훅이 스토어를 import 하므로 스토어가 계약을 import 하면 순환이 된다. 그래서 이 파일이
  P1 때 내보내던 그 타입을 계속 내보낸다 — 화면 쪽 import 는 한 글자도 안 바뀐다.
*/
export type { SelfBotRow };

/** 셀렉터가 매번 새 배열을 만들지 않도록 하는 공용 빈 값(무한 렌더 방지). */
const EMPTY_BOTS: SelfBotRow[] = [];
const EMPTY_DAYS: string[] = [];

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙는다. 접두사만으로 무효화하면 모든 신원이 함께 갈리는데,
 * 다른 신원의 쿼리는 비활성이라 stale 표시만 되고 다시 읽지는 않는다(`classroom.ts` 와 같다).
 */
export const selfBotKeys = {
  mine: ['self-bots'] as const,
};

/** 401 은 다시 물어도 같은 답이다 — 게이트로 넘긴다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/**
 * 서버가 **내 명의를 인정해 주는 상태인가** — 담은 봇이 서버로 갈지 데모로 갈지 가르는 값.
 *
 * ⚠️ `useCurrentUser().isAuthenticated` 를 쓰면 **안 된다.** 이름과 달리 이 질문의 답이
 * 아니다. 그 플래그는 「진짜 로그인 세션인가」라서 **개발용 신원 쿠키에 일부러 false** 를
 * 준다(`lib/current-user.ts` 의 ⚠️ 주석 — RoleGuard 가 데모 통과 경로를 인증으로 세는 것을
 * 막는 값이다). 그런데 **서버는 그 쿠키를 인정한다**(`getCurrentUserIdFromRequest` 는 dev
 * 쿠키에 `isAuthenticated: true`). 두 값은 뜻이 달라서 어긋난 게 아니라 각자 맞다.
 *
 * 그 플래그로 갈랐다면 개발 쿠키를 쓴 로컬·dev preview 전체가 데모로 떨어져 **서버에 한 번도
 * 안 가고**, 그러면서 prod 만 서버를 부르는 정반대 동작이 된다. 그래서 여기서는 서버의
 * 판정 조건을 그대로 다시 적는다 — **JWT 세션이거나, 유효한 개발 신원 쿠키이거나.**
 *
 * `useDevIdentityId()` 는 prod 호스트에서 **항상 빈 문자열**이다(`resolveDevIdentity` 가
 * 호스트로 먼저 거른다). 그래서 prod 에 낡은 쿠키가 남아 있어도 데모로 떨어진다 —
 * 서버가 그 쿠키를 무시하는 것과 같은 판정이다.
 *
 * SSR 스냅샷도 빈 문자열이라 첫 페인트는 데모 쪽이고 하이드레이션 직후 갈린다. 그 구간에
 * 빈 목록이 새지 않는 이유는 `useMySelfBots` 의 `isLoading` 처리에 적어 뒀다.
 *
 * (다른 훅도 같은 갈래가 필요해지면 이 판정을 `lib/current-user.ts` 로 올려야 한다.
 * 그건 공유 파일이라 별건 승인 사항이라서, 지금은 이 파일 안에 둔다.)
 * @returns 서버에 물어봐도 되는 신원이면 true
 */
function useHasServerIdentity(): boolean {
  const { user } = useAuth();
  const devIdentityId = useDevIdentityId();
  return Boolean(user) || Boolean(devIdentityId);
}

/** 조회 훅 공통 모양 — react-query 결과에서 화면이 쓰는 세 칸만 추린 것. */
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
 * 내가 담은 봇 목록 — `GET /api/me/self-bots`. 담은 순서(오래된 것 먼저).
 *
 * `botId` 는 마켓이 주는 **`class_bots.id`** 라 그대로 `useMarketplaceBot(botId)` 에 넣거나
 * 대화 상대로 쓸 수 있다.
 * @returns 담은 봇 행 목록. 응답 전에는 `data` 가 `undefined`
 */
export function useMySelfBots(): SelfQueryResult<SelfBotRow[]> {
  const userId = useCurrentUserId();
  const hasServerIdentity = useHasServerIdentity();

  const query = useQuery<MySelfBotsResponse, ApiClientError>({
    queryKey: [...selfBotKeys.mine, userId],
    queryFn: () => apiGet<MySelfBotsResponse>('/api/me/self-bots'),
    // 신원이 없으면 **요청 자체를 내보내지 않는다**(머리주석 ⛔). 401 을 받아 화면에서
    // 처리하는 게 아니라, 애초에 물어보지 않는다.
    enabled: hasServerIdentity,
    retry: retryUnlessGuarded,
  });

  // 데모 경로 — 신원이 있을 때는 이 구독이 값을 쓰지 않지만, 훅 순서를 지키려 항상 건다.
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const localBots = useSelfLearningStore((s) => s.byUser[userId]?.bots ?? EMPTY_BOTS);

  // 서버 목록이 도착한 다음에야 「로컬에만 있는 행」을 알 수 있다 — 이관은 여기서 걸린다.
  // 데모에서는 올릴 곳이 없으니 `undefined` 를 넘겨 아무것도 하지 않게 둔다.
  useLocalSelfBotUpload(userId, hasServerIdentity ? query.data?.bots : undefined);

  const serverBots = query.data?.bots;
  return useMemo(() => {
    if (!hasServerIdentity) {
      // 하이드레이션 전에는 `undefined` 다. SSR·첫 페인트의 빈 목록을 「담은 봇 없음」으로
      // 그리면 안 되기 때문 — 신원 판정이 갈리는 구간도 이 값이 함께 덮는다.
      return { data: hydrated ? localBots : undefined, isLoading: !hydrated, isError: false };
    }
    return { data: serverBots, isLoading: query.isLoading, isError: query.isError };
  }, [hasServerIdentity, hydrated, localBots, serverBots, query.isLoading, query.isError]);
}

/**
 * 이 봇을 이미 담았는가 — 마켓 카드·상세의 「담기 / 담음」 토글용.
 *
 * 응답 전에는 `false` 다(=「아직 안 담음」). 담기 **여부로 화면을 가르는** 자리라면
 * `useMySelfBots().isLoading` 을 함께 보고 그 사이를 비워 둬라.
 * 같은 쿼리를 읽으므로 이 훅을 더 부른다고 요청이 늘지 않는다.
 * @param botId - 마켓 봇 id. 없으면 항상 false
 * @returns 담았으면 true
 */
export function useIsSelfAdded(botId: string | null | undefined): boolean {
  const { data } = useMySelfBots();
  if (!botId) return false;
  return data?.some((b) => b.botId === botId) ?? false;
}

/**
 * 봇 담기 — `POST /api/me/self-bots`. 같은 봇을 두 번 담아도 한 줄이다(서버가 멱등).
 *
 * ⛔ 이건 **반 참여가 아니다.** `enrollments` 행도, 교사의 학생 수도 건드리지 않는다.
 * @returns `mutate(botId)`
 */
export function useAddSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const hasServerIdentity = useHasServerIdentity();
  const addLocalSelfBot = useSelfLearningStore((s) => s.addSelfBot);
  const queryClient = useQueryClient();
  const mutation = useMutation<AddSelfBotResponse, ApiClientError, string>({
    mutationFn: (botId) =>
      apiPost<AddSelfBotResponse>('/api/me/self-bots', {
        botId,
      } satisfies AddSelfBotInput),
    onSuccess: (res) => {
      // 서버가 준 행을 캐시에 먼저 얹는다. 무효화만 하면 다시 읽어 오는 한 왕복 동안
      // 버튼이 「담기」로 되돌아갔다가 「담음」으로 뛴다 — 눌렀는데 안 담긴 것처럼 보인다.
      queryClient.setQueryData<MySelfBotsResponse>(
        [...selfBotKeys.mine, userId],
        (old) =>
          old && !old.bots.some((b) => b.botId === res.bot.botId)
            ? { ...old, bots: [...old.bots, res.bot] }
            : old,
      );
      void queryClient.invalidateQueries({ queryKey: selfBotKeys.mine });
    },
  });
  const mutate = useCallback(
    (botId: string) => {
      // 데모는 서버에 가지 않고 예전 자리에 그대로 쓴다(머리주석 ⛔).
      if (!hasServerIdentity) {
        addLocalSelfBot(userId, botId);
        return;
      }
      mutation.mutate(botId);
    },
    [hasServerIdentity, addLocalSelfBot, userId, mutation],
  );
  return useMemo(
    // 데모의 쓰기는 동기라 기다릴 구간이 없다.
    () => ({ mutate, isPending: hasServerIdentity && mutation.isPending }),
    [mutate, hasServerIdentity, mutation.isPending],
  );
}

/**
 * 담은 봇 빼기 — `DELETE /api/me/self-bots/[botId]`. 대화 기록·공부한 날은 남는다.
 * @returns `mutate(botId)`
 */
export function useRemoveSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const hasServerIdentity = useHasServerIdentity();
  const removeLocalSelfBot = useSelfLearningStore((s) => s.removeSelfBot);
  const queryClient = useQueryClient();
  const mutation = useMutation<RemoveSelfBotResponse, ApiClientError, string>({
    mutationFn: (botId) =>
      apiDelete<RemoveSelfBotResponse>(
        `/api/me/self-bots/${encodeURIComponent(botId)}`,
      ),
    onSuccess: (_res, botId) => {
      // 담기와 같은 이유로 캐시를 먼저 줄인다 — 뺐는데 한 왕복 동안 카드가 남아 있으면
      // 안 지워진 것처럼 보인다.
      queryClient.setQueryData<MySelfBotsResponse>(
        [...selfBotKeys.mine, userId],
        (old) =>
          old ? { ...old, bots: old.bots.filter((b) => b.botId !== botId) } : old,
      );
      void queryClient.invalidateQueries({ queryKey: selfBotKeys.mine });
    },
  });
  const mutate = useCallback(
    (botId: string) => {
      if (!hasServerIdentity) {
        removeLocalSelfBot(userId, botId);
        return;
      }
      mutation.mutate(botId);
    },
    [hasServerIdentity, removeLocalSelfBot, userId, mutation],
  );
  return useMemo(
    () => ({ mutate, isPending: hasServerIdentity && mutation.isPending }),
    [mutate, hasServerIdentity, mutation.isPending],
  );
}

/* ── 한 번만 올리는 이관 (계약 §4) ────────────────────────────────────────────
 * P1·P2 를 쓰던 사람의 브라우저에는 담은 봇이 localStorage 에 있다. 그대로 두면
 * P3 가 뜨는 순간 그 사람의 목록이 **빈 것처럼 보인다.** 서버 목록이 온 뒤 한 번,
 * 로컬에만 있는 행을 올린다.
 * ------------------------------------------------------------------------- */

/**
 * 지금 올리는 중인 사용자 — 모듈 전역이다.
 *
 * 한 화면에서 이 훅이 여러 번 마운트된다(마켓 카드마다 담기 버튼 + 목록). 완료 표시는
 * 왕복이 끝나야 남으므로, 그 사이를 막는 자물쇠가 따로 있어야 같은 행을 여러 번 올리지 않는다.
 */
const uploading = new Set<string>();

/** 다시 해 볼 만한 실패인가 — 네트워크 단절·5xx·401 만. 404 는 다시 해도 같은 답이다. */
function isRetriableUploadError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true; // 네트워크가 끊긴 경우 등
  return error.status >= 500 || error.status === 401;
}

/**
 * 로컬에만 있는 담은 봇을 서버로 한 번 올린다 — 실패해도 화면은 죽지 않는다.
 *
 * 언제 도는가:
 *  - **스토어 rehydrate 가 끝난 뒤.** 안 그러면 `byUser` 가 비어 보여서 「올릴 게 없다」로
 *    완료 표시를 남기고, 로컬 기록이 영영 안 올라간다.
 *  - **서버 목록이 온 뒤.** 무엇이 이미 서버에 있는지 알아야 그것만 빼고 올린다.
 *  - 사용자당 **한 번** — 완료 표시(`botsMigratedUserIds`)를 스토어에 남긴다. 매 로드마다
 *    다시 훑지 않으려는 것이고, 올릴 게 하나도 없던 사람도 곧바로 표시를 남긴다.
 *
 * ## 지금 신원의 통 **하나만** 본다 — `byUser` 를 훑지 마라
 * 클라이언트는 한 번에 **한 신원**으로만 인증된다. 그러니 다른 통의 행을 올리면 서연의 봇이
 * **민준 명의로** 서버에 박힌다 — 사용자별 네임스페이스를 만들어 고친 바로 그 버그를,
 * 그게 아직 일어날 수 있는 마지막 자리에서 되살리는 셈이다. 다른 통은 **그 신원이 다음에
 * 활성일 때** 자기 손으로 올라간다. 그때까지 건드리지 않는다.
 *
 * ## 올린 뒤에도 로컬 행을 **지우지 않는다**
 * 비대칭이 결정한다: 지웠는데 올리기가 미묘하게 틀렸으면 데이터가 사라지고, 남겨 두면
 * 최악이 P4 까지 남는 죽은 바이트다. 그래서 **읽기만 끊고 그대로 둔다.** 서버가 정본이 된 뒤
 * 화면은 서버만 읽으므로 남은 로컬 행이 목록에 겹쳐 보이는 일은 없다.
 * 정리는 **P4** 가 `studyDays` 를 서버로 옮기면서 함께 한다 — 청소를 두 번 하지 않는다.
 * @param userId - 현재 사용자
 * @param serverBots - 서버 목록. `undefined` 면 아직 안 왔거나 데모라 아무것도 안 한다
 */
function useLocalSelfBotUpload(
  userId: string,
  serverBots: SelfBotRow[] | undefined,
): void {
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !hydrated || !serverBots) return;
    if (uploading.has(userId)) return;
    const state = useSelfLearningStore.getState();
    if (state.botsMigratedUserIds.includes(userId)) return;

    const onServer = new Set(serverBots.map((b) => b.botId));
    const pending = (state.byUser[userId]?.bots ?? []).filter(
      (b) => !onServer.has(b.botId),
    );
    if (pending.length === 0) {
      state.markBotsMigrated(userId);
      return;
    }

    uploading.add(userId);
    void (async () => {
      const results = await Promise.allSettled(
        pending.map((b) =>
          apiPost<AddSelfBotResponse>('/api/me/self-bots', {
            botId: b.botId,
          } satisfies AddSelfBotInput),
        ),
      );
      uploading.delete(userId);

      // 다시 해 볼 만한 실패가 하나라도 있으면 표시를 남기지 않는다 — 다음 로드에서 또 해 본다.
      // 없던 봇(404) 같은 영구 실패는 다시 해도 같으니 표시를 남기고 넘어간다.
      const retriable = results.some(
        (r) => r.status === 'rejected' && isRetriableUploadError(r.reason),
      );
      if (!retriable) useSelfLearningStore.getState().markBotsMigrated(userId);

      if (results.some((r) => r.status === 'fulfilled')) {
        void queryClient.invalidateQueries({ queryKey: selfBotKeys.mine });
      }
    })();
    // 이관 실패로 화면이 죽으면 안 된다 — 위 async 안에서 던지는 것은 `allSettled` 가 삼키고,
    // 남는 경로는 없다. 그래서 여기에 try/catch 를 더 두지 않는다.
  }, [userId, hydrated, serverBots, queryClient]);
}

/* ── 공부한 날 · 연속 학습 — 아직 localStorage (P4 몫) ────────────────────────
 * 위 담은 봇과 달리 이 아래는 서버에 가지 않는다. 같은 파일에 있는 이유는 화면이 읽는
 * 입구가 하나여야 해서고, P4 에서 이쪽도 같은 방식으로 안쪽만 갈아 끼운다.
 * ------------------------------------------------------------------------- */

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
