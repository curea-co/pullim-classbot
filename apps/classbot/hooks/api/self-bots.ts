'use client';

/**
 * 담은 봇 · 공부한 날 — 화면이 읽는 **유일한** 입구 (자기주도 계약 §3).
 *
 * P1 이 세운 훅 경계가 P3 에서 값을 치렀다: **export 시그니처는 한 글자도 안 바뀌고**
 * 안쪽만 localStorage → 서버로 갈아 끼웠다. 화면 파일은 한 줄도 손대지 않았다.
 * 시그니처는 그대로 **동결**이다 — 고쳐야 할 것 같으면 바꾸지 말고 보고한다.
 *
 * ## 두 슬라이스가 이제 같은 곳에 산다 — 서버
 *  - **담은 봇** — `/api/me/self-bots`(P3).
 *  - **공부한 날·연속 학습** — `/api/me/study-days`(P4, 이번 단계). 기기·브라우저를 넘어
 *    남는다. **`localStorage.clear()` 를 해도 연속일수가 그대로인 것**이 이 단계의 요점이다.
 *
 * 연속일수는 **숫자로 저장하지 않는다.** 서버가 주는 날짜 배열에서 `deriveStreak` 로 그때그때
 * 계산한다 — 카운터는 어느 날들로 그 수가 나왔는지 검증할 수 없다(계약 §1).
 *
 * ## ⛔ 신원이 없으면 서버를 부르지 않는다 — 지우지 마라
 *
 * 담은 봇도 공부한 날도 **신원이 있을 때만** 서버로 간다. 없으면 예전처럼 localStorage 를 읽고 쓰고,
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
 * 그래서 `useServerIdentityState()`(`./self-server`)가 갈래를 정한다. **「간단히 하겠다」며 이 분기를 걷어
 * 무조건 쿼리로 만들면 prod 데모가 조용히 깨진다.** 로컬에서는 개발 쿠키가 있어 티가 안 난다.
 *
 * ## ⛔ 갈래는 **셋**이다 — 「아직 모른다」를 데모로 접지 마라
 * 세션 복원(`AuthProvider` 의 `isReady`)이 끝나기 전에는 로그인 사용자도 `user === null`
 * 이다. 그 구간을 데모로 접으면 이 훅들이 로컬을 정본으로 삼는데, 그때 `useCurrentUserId()`
 * 는 데모 폴백 `student_001` 이라 **로그인 사용자가 남의 담은 봇·공부한 날·연속일수를
 * 잠깐 본다.** 그래서 `'pending'` 에서는 어느 쪽 데이터도 주지 않고 **로딩으로 그린다**
 * (`isLoading: true` · 날짜는 빈 배열). 쓰기도 마찬가지로 아무 데도 쓰지 않는다.
 *
 * 이건 아래 `useRecordSelfStudyDay` 의 ⛔ ② 와 **같은 함정의 읽기 쪽**이다. 그쪽은 처음부터
 * 막혀 있었고 이쪽만 뚫려 있었다 — 두 자리가 같은 판정을 쓰도록 tri-state 로 합쳤다.
 *
 * ## 서버 쪽 게이트는 **학생 전용**이다 — 이 훅을 학생 아닌 화면에 걸지 마라
 * 자기주도는 학생의 하위 컨텍스트라(dual-mode spec §1·§7) 라우트가 교사·학부모 신원을
 * 403 으로 막는다. 지금 이 훅들이 붙는 자리는 전부 학생 표면이다 — `(student)` 라우트
 * 그룹, 그리고 셸의 연속일수 뱃지(`role === 'student'` 일 때만 그린다). 마켓 카드·상세의
 * 담기 버튼도 `viewer === 'student'` 에서만 그려진다. **그 조건을 지우고 교사 화면에
 * 담기 버튼을 내보이면** 눌러도 403 만 받는 버튼이 된다 — 화면 쪽을 고칠 게 아니라
 * 애초에 걸지 않는 것이 맞다.
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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiClientError, apiDelete, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import {
  deriveStreak,
  useSelfLearningStore,
  useStudyDayBackfill,
  type SelfBotRow,
} from '@/lib/store/self-learning';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import {
  isRetriableUploadError,
  retryUnlessGuarded,
  selfStudyDayKeys,
  useServerIdentityState,
  useServerStudyDays,
} from '@/hooks/api/self-server';
import type {
  AddSelfBotInput,
  AddSelfBotResponse,
  MySelfBotsResponse,
  MyStudyDaysResponse,
  RecordStudyDayInput,
  RecordStudyDayResponse,
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

/*
  신원 판정(`useHasServerIdentity`)·재시도 규칙(`retryUnlessGuarded` ·
  `isRetriableUploadError`)·공부한 날 조회는 `./self-server` 로 옮겼다.
  P3 때는 이 파일 안에 있었는데, P4 에서 **스토어의 `useStreak()`** 도 같은 판정과 같은
  조회를 필요로 하게 됐다. 스토어가 이 파일을 import 하면 순환이라(이 파일이 스토어를
  import 한다) 스토어를 모르는 얇은 층을 따로 두고 양쪽이 그것을 읽는다.
  **판정 자체는 한 글자도 바뀌지 않았다** — 옮기기만 했다.
*/

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
  const identity = useServerIdentityState();

  const query = useQuery<MySelfBotsResponse, ApiClientError>({
    queryKey: [...selfBotKeys.mine, userId],
    queryFn: () => apiGet<MySelfBotsResponse>('/api/me/self-bots'),
    // 신원이 없으면 **요청 자체를 내보내지 않는다**(머리주석 ⛔). 401 을 받아 화면에서
    // 처리하는 게 아니라, 애초에 물어보지 않는다. 판정 대기 중에도 묻지 않는다 —
    // 이 키의 `userId` 가 아직 데모 폴백이라 그 상태로 물으면 남의 키에 캐시된다.
    enabled: identity === 'server',
    retry: retryUnlessGuarded,
  });

  // 데모 경로 — 신원이 있을 때는 이 구독이 값을 쓰지 않지만, 훅 순서를 지키려 항상 건다.
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const localBots = useSelfLearningStore((s) => s.byUser[userId]?.bots ?? EMPTY_BOTS);

  // 서버 목록이 도착한 다음에야 「로컬에만 있는 행」을 알 수 있다 — 이관은 여기서 걸린다.
  // 데모에서는 올릴 곳이 없으니 `undefined` 를 넘겨 아무것도 하지 않게 둔다.
  useLocalSelfBotUpload(userId, identity === 'server' ? query.data?.bots : undefined);

  const serverBots = query.data?.bots;
  return useMemo(() => {
    // ⛔ 판정 대기 — **어느 쪽도 보여 주지 않는다.** 여기서 로컬을 주면 세션 복원이
    // 끝나기 전의 로그인 사용자에게 데모 통(`student_001`)의 목록이 스친다. 그 구간은
    // 「담은 봇 없음」이 아니라 **아직 모름**이라, 로딩으로 그리는 것이 맞다.
    if (identity === 'pending') {
      return { data: undefined, isLoading: true, isError: false };
    }
    if (identity === 'demo') {
      // 하이드레이션 전에는 `undefined` 다. SSR·첫 페인트의 빈 목록을 「담은 봇 없음」으로
      // 그리면 안 되기 때문이다.
      return { data: hydrated ? localBots : undefined, isLoading: !hydrated, isError: false };
    }
    return { data: serverBots, isLoading: query.isLoading, isError: query.isError };
  }, [identity, hydrated, localBots, serverBots, query.isLoading, query.isError]);
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
  const identity = useServerIdentityState();
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
  // ⚠️ 의존성에 `mutation` **객체**를 넣지 마라 — 왕복마다 정체가 바뀌어 이 `mutate` 도
  // 매번 새 함수가 된다. 그 함수를 `useEffect` 의존성에 넣은 화면이 무한 루프에 빠진다
  // (`useRecordSelfStudyDay` 주석에 실제 사례). `mutation.mutate` 는 react-query 가
  // 정체를 고정해 주는 함수라 그것만 뽑아 쓴다.
  const { mutate: runMutation } = mutation;
  const mutate = useCallback(
    (botId: string) => {
      // ⛔ 판정 대기에는 **어느 쪽에도 쓰지 않는다.** 로컬에 쓰면 데모 통(`student_001`)에
      // 남의 봇이 박히고, 그 찌꺼기를 다음 로드의 이관이 서버로 올린다. 이 구간의 버튼은
      // `useMySelfBots().isLoading` 이라 스켈레톤이므로 실제로 눌릴 일도 없다.
      if (identity === 'pending') return;
      // 데모는 서버에 가지 않고 예전 자리에 그대로 쓴다(머리주석 ⛔).
      if (identity === 'demo') {
        addLocalSelfBot(userId, botId);
        return;
      }
      runMutation(botId);
    },
    [identity, addLocalSelfBot, userId, runMutation],
  );
  return useMemo(
    // 데모의 쓰기는 동기라 기다릴 구간이 없다.
    () => ({ mutate, isPending: identity === 'server' && mutation.isPending }),
    [mutate, identity, mutation.isPending],
  );
}

/**
 * 담은 봇 빼기 — `DELETE /api/me/self-bots/[botId]`. 대화 기록·공부한 날은 남는다.
 * @returns `mutate(botId)`
 */
export function useRemoveSelfBot(): SelfMutationResult<string> {
  const userId = useCurrentUserId();
  const identity = useServerIdentityState();
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
  const { mutate: runMutation } = mutation; // 정체 고정 — 위 `useAddSelfBot` 주석 참조
  const mutate = useCallback(
    (botId: string) => {
      // 담기와 같은 이유로 판정 대기에는 아무것도 하지 않는다(위 ⛔).
      if (identity === 'pending') return;
      if (identity === 'demo') {
        removeLocalSelfBot(userId, botId);
        return;
      }
      runMutation(botId);
    },
    [identity, removeLocalSelfBot, userId, runMutation],
  );
  return useMemo(
    () => ({ mutate, isPending: identity === 'server' && mutation.isPending }),
    [mutate, identity, mutation.isPending],
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
 * ## 걷는 조건은 **둘**이다 (계약 §5 — P3 가 미룬 정리)
 * P3 는 「올린 뒤에도 지우지 않는다」로 두고 정리를 P4 에 넘겼다. 그 청소가 이것인데,
 * **`byUser[].bots` 는 절반만 찌꺼기다.** 공개 데모 방문자는 신원이 없어 데모 폴백
 * `student_001` 이 되므로, `byUser['student_001'].bots` 는 **이관을 마친 서연의 찌꺼기**일
 * 수도 **prod 익명 방문자의 유일한 사본**일 수도 있다. 모양으로는 구별되지 않는다.
 *
 *  ① **`botsMigratedUserIds` 에 그 id 가 있어야 한다.** 계약이 지목한 판별자다. 없으면
 *     그 통은 서버를 만난 적이 없다 — 한 줄도 지우지 않는다.
 *  ② **그 행이 서버 목록에 돌아와 있어야 한다.** 「우리 요청이 201 을 받았다」를 근거로
 *     지우지 않는다 — 서버가 자기 목록에 실어 주는 쪽이 한 단계 강한 증거다. 올린 직후
 *     무효화가 목록을 다시 읽으므로 보통 같은 화면에서 끝나고, 그 왕복이 실패하면 다음
 *     로드에서 걷힌다.
 *
 * 그래서 남는 로컬 행의 뜻이 하나로 좁혀진다 — **서버가 아직 모르는 행.** 없는 봇(404)처럼
 * 영영 못 올라가는 행은 그대로 남는다. 그게 그 행의 유일한 사본이라 지울 수 없다.
 * 비로그인 데모는 ① 도 ② 도 성립하지 않는다(`serverBots` 자체가 `undefined` 다) —
 * 그 통은 찌꺼기가 아니라 **살아 있는 데이터**다(스토어 머리주석의 표).
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
    const serverBotIds = serverBots.map((b) => b.botId);

    /**
     * 청소(계약 §5) — **두 조건이 다 맞을 때만** 이 통에서 행을 걷는다.
     *  ① 이 신원이 이관을 마쳤다(`botsMigratedUserIds`). 계약이 지목한 판별자이고,
     *     **없으면 그 통은 서버를 만난 적이 없는 공개 데모의 유일한 사본**이다.
     *  ② 그 행이 방금 받은 서버 목록에 **들어 있다**. 「우리 요청이 201 을 받았다」보다
     *     서버가 자기 목록에 실어 주는 쪽이 한 단계 강한 증거다.
     *
     * 둘 중 하나만으로도 데모는 안전하다(신원이 없으면 `serverBots` 자체가 오지 않는다).
     * 그래도 둘을 다 거는 이유: **머리주석의 표가 ① 로 두 절반을 가른다고 적혀 있다.**
     * 코드가 ② 만 보고 지우면 문서와 코드가 다른 것을 근거로 삼게 되고, 다음 사람이
     * 어느 쪽을 믿어야 할지 알 수 없다.
     */
    const dropIfMigrated = () => {
      const s = useSelfLearningStore.getState();
      if (!s.botsMigratedUserIds.includes(userId)) return;
      s.dropUploadedBots(userId, serverBotIds);
    };

    dropIfMigrated();

    if (uploading.has(userId)) return;
    const state = useSelfLearningStore.getState();
    if (state.botsMigratedUserIds.includes(userId)) return;

    const onServer = new Set(serverBotIds);
    const pending = (state.byUser[userId]?.bots ?? []).filter(
      (b) => !onServer.has(b.botId),
    );
    if (pending.length === 0) {
      // 올릴 게 없다 = 이 통은 서버와 이미 같다. 표시를 남기고, 그 표시로 곧바로 걷는다.
      state.markBotsMigrated(userId);
      dropIfMigrated();
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

      // 올린 행을 여기서 걷지 않는다 — 지금 손에 든 목록은 **올리기 전** 것이라 방금 올린
      // 행이 없다. 무효화가 새 목록을 가져오면 이 effect 가 다시 돌고, 그때 위 `dropIfMigrated`
      // 가 「서버가 돌려준 행」으로 걷는다.
      if (results.some((r) => r.status === 'fulfilled')) {
        void queryClient.invalidateQueries({ queryKey: selfBotKeys.mine });
      }
    })();
    // 이관 실패로 화면이 죽으면 안 된다 — 위 async 안에서 던지는 것은 `allSettled` 가 삼키고,
    // 남는 경로는 없다. 그래서 여기에 try/catch 를 더 두지 않는다.
  }, [userId, hydrated, serverBots, queryClient]);
}

/* ── 공부한 날 · 연속 학습 — 서버 (계약 §3) ──────────────────────────────────
 * 담은 봇과 **같은 규율**이다: 신원이 있으면 서버, 없으면 localStorage 이고 요청은 아예
 * 안 나간다. export 시그니처는 P1 이 정한 그대로라 화면 파일은 이번에도 한 줄도 안 바뀌었다.
 * ------------------------------------------------------------------------- */

/**
 * 공부한 날 `'YYYY-MM-DD'` — 오름차순·중복 없음.
 *
 * `self_study_days` 의 한 행이 이 배열의 한 칸이다. 카운터가 아니라 날짜를 쌓는 이유가
 * 그것 — 이 배열이 그대로 서버의 행이고, 연속일수는 여기서 **읽을 때** 계산된다.
 *
 * ⚠️ 이 시그니처에는 **로딩 칸이 없다**(계약 §3 동결). 서버 응답 전에는 `[]` 다.
 * 「기록 없음」과 「아직 안 옴」이 구별되지 않으므로, 그 둘을 갈라 그려야 하는 화면이
 * 생기면 시그니처를 바꿀 게 아니라 **보고해라**(머리주석). 지금 유일한 소비자인 연속일수
 * 뱃지는 0 이면 숨는 자리라 문제가 되지 않는다.
 * @returns 날짜 배열(없으면 빈 배열)
 */
export function useSelfStudyDays(): { data: string[] } {
  const userId = useCurrentUserId();
  const { days: serverDays, identity } = useServerStudyDays();

  // 데모 경로 — 신원이 있을 때는 이 구독이 값을 쓰지 않지만, 훅 순서를 지키려 항상 건다.
  const localDays = useSelfLearningStore(
    (s) => s.byUser[userId]?.studyDays ?? EMPTY_DAYS,
  );

  // 로컬에 쌓여 있던 날짜를 한 번 올린다(계약 §4). 셸 뱃지(`useStreak`)도 같은 훅을
  // 부르는데, 자물쇠와 완료 표시가 모듈 전역이라 둘이 함께 떠 있어도 한 번만 올라간다.
  useStudyDayBackfill(serverDays);

  return useMemo(
    () => ({
      data:
        identity === 'server'
          ? (serverDays ?? EMPTY_DAYS)
          : // ⛔ 판정 대기에는 로컬을 주지 않는다 — 세션 복원 전의 로그인 사용자에게
            // 데모 통(`student_001`)의 날짜가 스친다. 이 시그니처에는 로딩 칸이 없어
            // 빈 배열로 답한다(연속일수 0 = 뱃지 숨김이라 틀린 수가 보이지 않는다).
            identity === 'demo'
            ? localDays
            : EMPTY_DAYS,
    }),
    [identity, serverDays, localDays],
  );
}

/**
 * 오늘 공부했다고 기록 — `POST /api/me/study-days`. 하루에 여러 번 불러도 한 칸이다(멱등).
 *
 * **날짜를 안 주면 「오늘」을 서버가 정한다**(KST). 클라이언트가 자기 시계로 오늘을 만들어
 * 보내면 기기 시간대·시계 오차만큼 남의 날짜가 된다 — 그래서 두 번째 「오늘」을 만들지 않고,
 * 응답이 돌려주는 `date` 를 그대로 캐시에 얹는다. (데모는 서버가 없으니 예전처럼
 * `lib/store/today-key.ts` 의 오늘을 쓴다. 사용자가 한국에 있어 로컬 = KST 다.)
 *
 * ⚠️ **오늘을 기록할 때 날짜를 넣지 마라 — `mutate()` 로 부른다.** 날짜를 실어 보내면 서버가
 * 그 값을 검사해서 형식이 틀리거나 **KST 기준 미래**이거나 2년보다 오래됐으면 **400** 을
 * 낸다(조용히 넘기는 건 백필 라우트뿐이다). KST 보다 앞선 시간대의 브라우저가 `todayKey()`
 * 로 만든 「오늘」은 서버에서 **미래**라 그대로 400 이 된다.
 * @returns `mutate(date?)` — 날짜를 안 주면 오늘
 */
export function useRecordSelfStudyDay(): SelfOptionalMutationResult<string> {
  const userId = useCurrentUserId();
  const identity = useServerIdentityState();
  const recordLocalStudyDay = useSelfLearningStore((s) => s.recordStudyDay);
  const hydrated = useStoresHydrated(useSelfLearningStore);
  /**
   * 「어디에 쓸지 정해졌는가」 — 아래 ⛔ 「첫 페인트에서는 아무도 아니다」에서 쓴다.
   *
   * 조건이 **둘**이다. 스토어 rehydrate 만 보던 때는 세션 복원이 아직 안 끝난 로그인
   * 사용자를 데모로 봐서, 그 사람의 기록이 데모 통(`student_001`)에 적혔다 —
   * 두 대기 구간이 서로를 덮어 주지 않는다(localStorage 는 동기, 세션 복원은 왕복이다).
   */
  const settled = hydrated && identity !== 'pending';
  const queryClient = useQueryClient();
  const mutation = useMutation<RecordStudyDayResponse, ApiClientError, string | undefined>({
    // 날짜가 없어도 **본문은 보낸다**(`{}`) — 빈 본문은 서버가 JSON 을 파싱할 게 없어
    // 갈래가 하나 늘어난다. 「생략」의 뜻은 빈 객체로 싣는다.
    //
    // ⚠️ 생략인지 가르는 것은 **`=== undefined`** 다. truthy 로 가르면(`date ? ... : {}`)
    // `mutate('')` 가 「빈 문자열을 보냈다」가 아니라 「날짜를 생략했다」로 바뀌어,
    // 서버가 400 `INVALID_INPUT` 으로 막을 값이 **조용히 오늘 기록**이 된다. 이 훅은
    // 서버 계약을 감추는 자리가 아니라 그대로 태우는 자리다 — 못 쓸 값이면 400 을 받아야
    // 부르는 쪽이 자기가 뭘 보냈는지 안다. (계약 §2 의 테두리는 서버 한 곳에 있다.)
    mutationFn: (date) =>
      apiPost<RecordStudyDayResponse>(
        '/api/me/study-days',
        (date === undefined ? {} : { date }) satisfies RecordStudyDayInput,
      ),
    onSuccess: (res) => {
      // 담기와 같은 이유로 캐시를 먼저 늘린다 — 다시 읽어 오는 한 왕복 동안 연속일수가
      // 예전 값으로 남아 있으면 기록이 안 된 것처럼 보인다.
      queryClient.setQueryData<MyStudyDaysResponse>(
        [...selfStudyDayKeys.mine, userId],
        (old) =>
          old && !old.days.includes(res.date)
            ? { ...old, days: [...old.days, res.date].sort() }
            : old,
      );
      void queryClient.invalidateQueries({ queryKey: selfStudyDayKeys.mine });
    },
  });
  const { mutate: runMutation } = mutation;

  /*
    ⛔ **이 `mutate` 의 정체는 고정이다 — 그래야 하는 이유가 둘이다.**

    부르는 화면이 이렇게 쓴다:

        const { mutate: recordStudyDay } = useRecordSelfStudyDay();
        useEffect(() => { recordStudyDay(); }, [recordStudyDay]);
        // app/(student)/classbot/learn/[tutorId]/page.tsx

    ① **무한 루프.** P4 첫 판은 `useMutation()` 이 돌려주는 **객체**를 `useCallback`
       의존성에 넣었다. 왕복이 끝날 때마다 그 객체가 새것이 되고 → `mutate` 도 새것이 되고 →
       위 effect 가 다시 돌고 → 또 왕복. 브라우저 확인에서 **초당 수천 건**으로 잡혔다.
    ② **첫 페인트에서는 모두가 「아무도 아니다」.** `useDevIdentityId()` 의 SSR 스냅샷은 빈
       문자열이고 `useAuth().user` 도 처음엔 null 이라, 하이드레이션 직전 한 박자 동안
       **신원이 있는 사람도 비로그인으로 보인다.** 그때 `useCurrentUserId()` 는 데모 폴백
       `student_001` 을 준다(`lib/current-user.ts`). 그 순간 로컬에 쓰면 **민준의 공부한 날이
       서연의 통에 적힌다** — 실측으로 확인했다(`pullim_dev_identity=s2` 로 학습 화면을 열면
       서버에는 `s2` 로 남는데 localStorage 에는 `byUser.student_001` 에 적혔다).
       P1~P3 에서는 그 찌꺼기가 로컬에만 있었지만 **P4 의 백필이 그것을 서버로 올린다.**

    그래서 판정을 의존성이 아니라 **ref** 로 들고(정체 고정), 판정이 서기 전에 들어온 기록은
    **버리지 않고 미뤄 뒀다가**(`deferred`) 신원이 정해진 뒤 그쪽으로 보낸다. 결과적으로
    화면의 effect 는 **마운트당 한 번** 돌고, 기록도 **한 번** 나간다 — 로그인·데모 양쪽 다.

    (담기·빼기에는 이 장치가 없다. 그쪽은 클릭 핸들러라 하이드레이션 뒤에만 불린다.)
  */
  const latest = useRef({
    userId,
    identity,
    settled,
    recordLocalStudyDay,
    runMutation,
  });
  /** 판정이 서기 전에 들어온 기록 — 서면 그때 보낸다. `null` 이면 미뤄 둔 게 없다. */
  const deferred = useRef<{ date?: string } | null>(null);

  useEffect(() => {
    latest.current = { userId, identity, settled, recordLocalStudyDay, runMutation };
    if (!settled || !deferred.current) return;
    const { date } = deferred.current;
    deferred.current = null;
    // 이제 신원을 안다 — 그제야 어느 쪽으로 보낼지 정한다.
    if (identity === 'server') runMutation(date);
    else recordLocalStudyDay(userId, date);
  }, [userId, identity, settled, recordLocalStudyDay, runMutation]);

  const mutate = useCallback((date?: string) => {
    const now = latest.current;
    if (!now.settled) {
      // 하이드레이션 전. 지금 쓰면 남의 통에 갈 수 있으니 들고만 있는다(위 ②).
      deferred.current = { date };
      return;
    }
    // 데모는 서버에 가지 않고 예전 자리에 그대로 쓴다(머리주석 ⛔).
    if (now.identity !== 'server') {
      now.recordLocalStudyDay(now.userId, date);
      return;
    }
    now.runMutation(date);
  }, []);
  return useMemo(
    // 데모의 쓰기는 동기라 기다릴 구간이 없다.
    () => ({ mutate, isPending: identity === 'server' && mutation.isPending }),
    [mutate, identity, mutation.isPending],
  );
}

/**
 * 연속 학습 — **`useSelfStudyDays()` 에서 읽을 때 계산한다.**
 *
 * 숫자로 저장하지 않는 이유: 카운터는 검증할 수 없고(어느 날들로 그 수가 나왔는지 모른다)
 * 되돌릴 수도 없다. 날짜가 정본이고 이 값은 파생이다. **서버로 옮긴 뒤에도 같다** —
 * 서버는 날짜만 돌려주고 계산은 여기서 한다(계약 §1·§3).
 * @returns 연속일수와 마지막 학습일
 */
export function useSelfStreak(): { count: number; lastStudyDate: string | null } {
  const { data: days } = useSelfStudyDays();
  return useMemo(() => deriveStreak(days), [days]);
}
