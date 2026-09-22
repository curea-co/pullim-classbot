'use client';

/**
 * 봇 훅 — 1급 `bots` 표(ADR-092)를 읽고 만들고 고치고, 만든 자리에서 반에 붙인다.
 *
 * 정본 문은 넷이다(api.md § 3.5b): `GET /classbot/me/bots`(내 봇 최신순 · `classIds` 동반 — pullim-api #672) ·
 * `POST /classbot/bots`(201) · `PATCH /classbot/bots/:id`(200 · owner 만) · `PUT /classbot/classes/:classId/bot`
 * (할당 — `hooks/api/classroom.ts` `useAssignClassBot`).
 *
 * **목록 문이 열리면서 이 파일의 성격이 바뀌었다**(계획 PR 5d). 종전에는 이 세션이 만들거나 고친 봇만 캐시에서
 * 되읽었고(`useKnownBot`) 그래서 새로고침하면 전부 「모른다」였다 — 이제 `useMyBots` 하나가 원천이고, 봇 하나를
 * 보는 자리(`useMyBot`)는 **그 목록에서 고른다.** 봇 하나를 읽는 별도 문은 여전히 없다 —
 * `GET /classbot/bots/:id` 는 옛 bot == class 뜻 그대로라(api.md § 3.5 「뜻 개정은 후속 PR」) `bots` 행이 아니라
 * 반을 돌려준다. 목록에서 고르는 것이 지어내기가 아닌 이유가 그것이다: 목록이 곧 「내 봇 전부」다.
 *
 * 그 위에 선 화면 셋 — 반 상세 「봇」 탭의 「다른 봇으로 바꾸기」 고르개 · 봇 관리(`/teacher/bots`) ·
 * 빌더(`/teacher/builder`).
 *
 * 신원·오류 규약은 classroom.ts 와 같다(OS 쿠키 · `ApiError` · 401 은 로그인으로).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classroomKeys, writeClassDetail } from '@/hooks/api/classroom';
import { classbotRead, classbotWrite, retryUnlessClientError } from '@/lib/api/classbot-client';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  AssignClassBotBody,
  BotDto,
  ClassDto,
  CreateBotBody,
  UpdateBotBody,
} from '@/lib/api/classbot-dto';

/**
 * 쿼리 키 — 내 봇 목록 하나뿐이다. 봇 하나를 따로 캐시하지 않는다: 읽는 문이 목록뿐이라
 * 두 자리에 같은 행을 두면 한쪽만 낡는다(`useMyBot` 이 목록에서 고른다).
 */
export const botKeys = {
  /** 정본 — 내 봇 목록(`GET /classbot/me/bots`). 신원 id 는 호출부가 꼬리에 붙인다. */
  myBots: ['my-bots'] as const,
};

/**
 * 쓰기 응답 한 행을 목록 캐시에 **반영한다** — 있으면 갈아 끼우고, 없으면(새로 만든 봇) 맨 앞에(서버도 최신순).
 *
 * 접두사 갱신(`setQueriesData`)이라 **목록을 아직 아무도 안 읽었으면 아무 일도 안 한다.** 그게 맞다 — 한 줄짜리
 * 목록을 여기서 지어내면 「내 봇은 이것 하나」라고 말하는 셈이고, 그건 이 응답이 아는 사실이 아니다.
 */
function writeBotIntoList(queryClient: QueryClient, bot: BotDto): void {
  queryClient.setQueriesData<BotDto[]>({ queryKey: botKeys.myBots }, (prev) => {
    if (!prev) return prev;
    const at = prev.findIndex((row) => row.id === bot.id);
    if (at < 0) return [bot, ...prev];
    return prev.map((row) => (row.id === bot.id ? bot : row));
  });
}

/**
 * `GET /classbot/me/bots` — 내가 owner 인 봇 전부(최신순 · 없으면 `[]`).
 *
 * 응답은 봉투 없는 `BotDto[]` 이고 행마다 `classIds`(이 봇을 지금 쓰는 반)가 실린다 — 「어느 반에 붙어 있나」를
 * 화면이 반마다 되묻지 않아도 된다. **반 목록(`GET /bots?role=teacher`)과 섞지 마라**: 저쪽은 아직 반이고
 * 이쪽이 봇이다.
 * @returns react-query 결과(`data` = 봇 배열)
 */
export function useMyBots(): UseQueryResult<BotDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<BotDto[], ApiError>({
    queryKey: [...botKeys.myBots, user?.id ?? null],
    queryFn: () => classbotRead<BotDto[]>('/me/bots'),
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}

/** `useMyBot` 결과 — 목록 조회의 진행 상태를 그대로 물려받되 「그 봇」만 골라 든다. */
export interface MyBotResult {
  /** 찾은 봇 · 아직 못 읽었거나 내 봇이 아니면 `undefined`. */
  bot: BotDto | undefined;
  /** 목록을 아직 읽는 중인가 — 「모른다」와 「내 봇이 아니다」를 가르는 칸이다. */
  isPending: boolean;
  /** 목록 읽기가 실패했나. */
  error: ApiError | null;
}

/**
 * 내 봇 하나 — **목록에서 고른다**(머리주석: 봇 하나를 읽는 정본 문이 없다).
 *
 * `isPending` 이 아닌데 `bot` 이 `undefined` 면 그건 「모른다」가 아니라 **「내 봇 중에 없다」** 다 —
 * 지워졌거나 남의 봇이다. 화면은 그때 404 처럼 말해야 하고, 읽는 중에는 그러면 안 된다.
 * @param botId - 봇 id. 비어 있으면 찾지 않는다.
 * @returns 고른 봇과 목록의 진행 상태
 */
export function useMyBot(botId: string | null | undefined): MyBotResult {
  const query = useMyBots();
  return {
    bot: botId ? query.data?.find((row) => row.id === botId) : undefined,
    isPending: query.isPending,
    error: query.error,
  };
}

/**
 * `POST /classbot/bots` — 봇 만들기(201 `BotDto`). owner 는 서버가 세션 `sub` 로 정한다(반 소유권 불요).
 * `scope` 를 비우면 서버 기본 3. 만든 봇은 어느 반에도 안 붙어 있다 — 붙이는 것은 `useCreateBotForClass` 나
 * `useAssignClassBot`.
 * @returns mutation — 만든 봇. 내 봇 목록 캐시 맨 앞에 넣고 목록을 다시 읽는다.
 */
export function useCreateBot(): UseMutationResult<BotDto, ApiError, CreateBotBody> {
  const queryClient = useQueryClient();
  return useMutation<BotDto, ApiError, CreateBotBody>({
    mutationFn: async (input) => {
      const { body } = await classbotWrite<BotDto>('/bots', input);
      return body;
    },
    onSuccess: (bot) => {
      writeBotIntoList(queryClient, bot);
      void queryClient.invalidateQueries({ queryKey: botKeys.myBots });
    },
  });
}

/** `PATCH /classbot/bots/:id` 입력 — 고칠 칸만 싣는다(`undefined` 그대로 · 텍스트 `null` 비움). */
export interface UpdateBotInput {
  botId: string;
  patch: UpdateBotBody;
}

/**
 * `PATCH /classbot/bots/:id` — 내 봇 부분 수정(200 `BotDto`). 남의 봇·없는 봇은 **404**(owner 가 아니면 보이지 않는다).
 * 붙어 있는 반 전부에 즉시 반영된다 — 페르소나는 대화 전송 시점에 `bots` 를 읽는다(api.md § 3.8).
 * @returns mutation — 고친 봇. 내 봇 목록을 갱신하고, 이 봇을 든 반 상세 캐시의 이름·아바타도 맞춘다.
 */
export function useUpdateBot(): UseMutationResult<BotDto, ApiError, UpdateBotInput> {
  const queryClient = useQueryClient();
  return useMutation<BotDto, ApiError, UpdateBotInput>({
    mutationFn: async ({ botId, patch }) => {
      const { body } = await classbotWrite<BotDto>(`/bots/${encodeURIComponent(botId)}`, patch, 'PATCH');
      return body;
    },
    onSuccess: (bot) => {
      writeBotIntoList(queryClient, bot);
      // 반 상세가 든 봇 이름·아바타는 `bots` 행의 사본이다 — 고친 값으로 맞춰야 머리 칩이 옛 이름을 부르지 않는다.
      for (const classId of bot.classIds) {
        queryClient.setQueriesData<ClassDto>({ queryKey: classroomKeys.classDetail(classId) }, (prev) =>
          prev && prev.bot?.id === bot.id
            ? { ...prev, bot: { id: bot.id, name: bot.name, avatarEmoji: bot.avatarEmoji } }
            : prev,
        );
      }
      void queryClient.invalidateQueries({ queryKey: botKeys.myBots });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClasses });
    },
  });
}

/** `useCreateBotForClass` 입력 — 만들 봇과 붙일 반. */
export interface CreateBotForClassInput {
  classId: string;
  bot: CreateBotBody;
}

/** `useCreateBotForClass` 결과 — 만든 봇과, 그 봇이 붙은 반. */
export interface CreateBotForClassResult {
  bot: BotDto;
  class: ClassDto;
}

/**
 * 「만들어 붙이기」의 **둘째 걸음(붙이기)만** 실패했다 — 봇은 이미 내 것으로 생겼다.
 * `cause` 가 `PUT …/bot` 이 던진 원래 오류(보통 `ApiError` — 남의 반 403 · 없는 반 404)다.
 */
export class BotAttachError extends Error {
  readonly bot: BotDto;
  override readonly cause: unknown;

  constructor(bot: BotDto, cause: unknown) {
    super(`봇 「${bot.name}」 은 만들어졌지만 반에 붙이지 못했다`);
    this.name = 'BotAttachError';
    this.bot = bot;
    this.cause = cause;
  }
}

/**
 * 「새 봇 만들어 이 반에 붙이기」 — `POST /bots` 뒤 `PUT /classes/:classId/bot {botId}` 를 잇는다.
 *
 * 두 요청이라 **반쪽이 남을 수 있다**: 봇은 생겼는데 붙이기가 실패하면(남의 반 403 · 없는 반 404 · 네트워크)
 * 봇은 내 것으로 남는다 — 지우지 않는다(지우는 문이 없고, 지워야 할 이유도 없다 — 다음에 붙이면 된다).
 * 그 갈래는 `BotAttachError`(만든 봇 + 원래 오류)로 던지고 만든 봇은 캐시에 남겨 둔다. 화면은 「봇은 만들어졌는데
 * 붙이지 못했어요」로 갈라 말한다(`lib/bot-failure-message.ts` `botFailureMessage`). 첫 걸음(만들기) 실패는 `ApiError` 그대로.
 * @returns mutation — `{ bot, class }`. 반 상세·내 봇 목록 캐시를 채우고 반 목록·옛 상세를 다시 읽는다.
 */
export function useCreateBotForClass(): UseMutationResult<
  CreateBotForClassResult,
  ApiError | BotAttachError,
  CreateBotForClassInput
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<CreateBotForClassResult, ApiError | BotAttachError, CreateBotForClassInput>({
    mutationFn: async ({ classId, bot: input }) => {
      const { body: bot } = await classbotWrite<BotDto>('/bots', input);
      writeBotIntoList(queryClient, bot);
      let klass: ClassDto;
      try {
        ({ body: klass } = await classbotWrite<ClassDto>(
          `/classes/${encodeURIComponent(classId)}/bot`,
          { botId: bot.id } satisfies AssignClassBotBody,
          'PUT',
        ));
      } catch (error) {
        throw new BotAttachError(bot, error);
      }
      return { bot, class: klass };
    },
    onSuccess: ({ class: klass }) => {
      writeClassDetail(queryClient, user?.id ?? null, klass);
      void queryClient.invalidateQueries({ queryKey: botKeys.myBots });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClasses });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClass(klass.id) });
    },
  });
}
