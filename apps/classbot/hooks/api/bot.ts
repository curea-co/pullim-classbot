'use client';

/**
 * 봇 훅 — 1급 `bots` 표(ADR-092 · pullim-api PR 2)를 만들고 고치고, 만든 자리에서 반에 붙인다.
 *
 * 정본 문은 셋이다(api.md § 3.5b): `POST /classbot/bots`(201) · `PATCH /classbot/bots/:id`(200 · owner 만) ·
 * `PUT /classbot/classes/:classId/bot`(할당 — `hooks/api/classroom.ts` `useAssignClassBot`). **내 봇 목록·봇 하나를
 * 읽는 문은 아직 없다** — `GET /classbot/bots?role=teacher`·`GET /classbot/bots/:id` 는 옛 bot == class 뜻 그대로라
 * (api.md § 3.5 「뜻 개정은 후속 PR」) 반 목록을 돌려주지 `bots` 행을 돌려주지 않는다. 그래서:
 *  - 「다른 봇으로 바꾸기」 고르개는 **없다.** 목록을 화면에서 지어내지 않는다(계획 PR 5b 지시).
 *  - 봇의 전체 모양(`BotDto`)은 **이 세션이 만들거나 고친 것**만 안다 — `useKnownBot` 이 캐시에서 읽는다.
 *    반이 가리키는 봇의 요약(id·이름·아바타)은 `useKnownClassSummary`(classroom.ts) 가 든다.
 *  - 봇 관리·빌더 화면(`/teacher/bots` · `/teacher/builder`)은 이 PR 이 건드리지 않는다 — 별건(5d).
 *
 * 신원·오류 규약은 classroom.ts 와 같다(OS 쿠키 · `ApiError` · 401 은 로그인으로).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classroomKeys } from '@/hooks/api/classroom';
import { classbotWrite } from '@/lib/api/classbot-client';
import type {
  AssignClassBotBody,
  BotDto,
  ClassDto,
  CreateBotBody,
  UpdateBotBody,
} from '@/lib/api/classbot-dto';

/** 쿼리 키 — 봇 하나(`POST`·`PATCH` 응답으로만 채워진다 · 읽기 문 없음). */
export const botKeys = {
  bot: (botId: string) => ['bot', botId] as const,
};

function rememberBot(queryClient: QueryClient, bot: BotDto): void {
  queryClient.setQueryData<BotDto>(botKeys.bot(bot.id), bot);
}

/**
 * 이 세션이 만들거나 고친 봇 — 캐시에서만 읽는다(서버에 묻지 않는다 · 머리주석).
 * 링크로 바로 연 반의 봇은 요약(`ClassBotSummaryDto`)까지만 알고, 과목·학년·말투·등급은 **모른다**고 그린다.
 * `gcTime: Infinity` — 세션이 끝날 때까지 안다(`useKnownClassSummary` 와 같은 이유 — 기본 5분이면 증발한다).
 * @param botId - 봇 id. 비어 있으면 `undefined`
 * @returns 아는 `BotDto` · 모르면 `undefined`
 */
export function useKnownBot(botId: string | null | undefined): BotDto | undefined {
  const query = useQuery<BotDto>({
    queryKey: botKeys.bot(botId ?? ''),
    queryFn: () => Promise.reject(new Error('GET /classbot/bots/:id 는 아직 bots 행을 주지 않는다')),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return botId ? query.data : undefined;
}

/**
 * `POST /classbot/bots` — 봇 만들기(201 `BotDto`). owner 는 서버가 세션 `sub` 로 정한다(반 소유권 불요).
 * `scope` 를 비우면 서버 기본 3. 만든 봇은 어느 반에도 안 붙어 있다 — 붙이는 것은 `useCreateBotForClass` 나
 * `useAssignClassBot`.
 * @returns mutation — 만든 봇. 캐시에 둔다.
 */
export function useCreateBot(): UseMutationResult<BotDto, ApiError, CreateBotBody> {
  const queryClient = useQueryClient();
  return useMutation<BotDto, ApiError, CreateBotBody>({
    mutationFn: async (input) => {
      const { body } = await classbotWrite<BotDto>('/bots', input);
      return body;
    },
    onSuccess: (bot) => rememberBot(queryClient, bot),
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
 * @returns mutation — 고친 봇. 캐시를 갱신하고, 이 봇을 요약으로 든 반 캐시의 이름·아바타도 맞춘다.
 */
export function useUpdateBot(): UseMutationResult<BotDto, ApiError, UpdateBotInput> {
  const queryClient = useQueryClient();
  return useMutation<BotDto, ApiError, UpdateBotInput>({
    mutationFn: async ({ botId, patch }) => {
      const { body } = await classbotWrite<BotDto>(`/bots/${encodeURIComponent(botId)}`, patch, 'PATCH');
      return body;
    },
    onSuccess: (bot) => {
      rememberBot(queryClient, bot);
      // 반 요약이 든 봇 이름·아바타는 `bots` 행의 사본이다 — 고친 값으로 맞춰야 머리 칩이 옛 이름을 부르지 않는다.
      for (const classId of bot.classIds) {
        queryClient.setQueryData<ClassDto>(classroomKeys.classSummary(classId), (prev) =>
          prev && prev.bot?.id === bot.id
            ? { ...prev, bot: { id: bot.id, name: bot.name, avatarEmoji: bot.avatarEmoji } }
            : prev,
        );
      }
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
 * 붙이지 못했어요」로 갈라 말한다(`class-bot-tab.tsx` `botFailureMessage`). 첫 걸음(만들기) 실패는 `ApiError` 그대로.
 * @returns mutation — `{ bot, class }`. 반 요약·봇 캐시를 채우고 반 목록·상세를 다시 읽는다.
 */
export function useCreateBotForClass(): UseMutationResult<
  CreateBotForClassResult,
  ApiError | BotAttachError,
  CreateBotForClassInput
> {
  const queryClient = useQueryClient();
  return useMutation<CreateBotForClassResult, ApiError | BotAttachError, CreateBotForClassInput>({
    mutationFn: async ({ classId, bot: input }) => {
      const { body: bot } = await classbotWrite<BotDto>('/bots', input);
      rememberBot(queryClient, bot);
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
      queryClient.setQueryData<ClassDto>(classroomKeys.classSummary(klass.id), klass);
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClasses });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClass(klass.id) });
    },
  });
}
