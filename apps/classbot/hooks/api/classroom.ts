'use client';

/**
 * 수업방 훅 — 교사(반 목록·반 하나·반 만들기·명단·봇 할당·코드 발급)와 학생(코드 참여·내 수업방).
 *
 * 거의 전부가 **정본**(pullim-api `api.pullim.ai/classbot/*`, OS 쿠키)을 본다 — 완성 설계
 * `2026-09-16_classbot-completion-design.md` § 5 · § 8:
 *  - 학생 둘 `useJoinByCode`(`POST /enrollments`) · `useMyClassrooms`(`GET /bots?role=student`).
 *  - 교사 일곱 `useOperatorClasses`(`GET /bots?role=teacher`) · `useOperatorClass`(`GET /bots/:id`) ·
 *    `useIssueJoinCode`(`POST /classes/:classId/join-codes`) — 계획 PR 5a 가 옮겼고,
 *    `useCreateClassroom`(`POST /classes`) · `useClassMembers`(`GET /classes/:classId/members`) ·
 *    `useAssignClassBot`(`PUT /classes/:classId/bot`) — 계획 PR 5b 가 pullim-api PR 2 의 새 문에 붙였고,
 *    `useClassDetail`(`GET /classes/:classId`) — 계획 PR 5d 가 pullim-api PR 4(#672)의 읽기 문에 붙였다.
 *    **반이 지금 가리키는 봇(`classes.bot_id`)은 그 문으로만 온다** — 옛 `GET /bots*` 는 아직 class+profile 이라
 *    싣지 않는다. 종전의 세션 캐시 훅(`useKnownClassSummary`)은 그래서 걷혔다.
 *  - ADR-094 뒤 봇 마켓도 pullim-api 정본이다. 교사 개인 봇 게시·해제는 지원 범위가 아니므로
 *    종전 same-origin `useTeacherClassrooms`와 「내 봇 공유」 소비는 함께 제거했다.
 *
 * 정본 훅의 신원·캐시 규약:
 *  - 신원은 OS 세션(`useAuth`)이다. 세션 복원 전(`isReady=false`)에는 묻지 않는다 — 그 구간의
 *    요청은 누구 것인지 몰라 캐시가 남의 키에 남는다. 복원 뒤 비로그인이면 RoleGuard 가 이미
 *    로그인으로 보내는 중이라 역시 묻지 않는다.
 *  - 세션 사용자 id 를 queryKey 꼬리에 둔다 — 같은 브라우저에서 계정을 바꾸면 캐시가 갈린다.
 *  - 오류는 `ApiError`(`@pullim-classbot/api-client`)다. 401 은 `lib/api/classbot-client.ts` 가
 *    로그인으로 보낸다. 목 폴백은 없다 — 실패는 실패로 보인다(계획 §07 학생·내 수업방 줄).
 *
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

import { botKeys } from '@/hooks/api/bot-keys';
import {
  classbotRead,
  classbotWrite,
  retryUnlessClientError,
  statusOf,
} from '@/lib/api/classbot-client';
import type {
  AssignClassBotBody,
  BotCardDto,
  BotDetailDto,
  ClassDto,
  ClassMemberDto,
  CreateClassBody,
  CreateClassResponse,
  EnrollmentDto,
  JoinCodeDto,
} from '@/lib/api/classbot-dto';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙으므로, 접두사만으로 무효화하면 모든 신원이 함께 갈린다.
 */
export const classroomKeys = {
  myClassrooms: ['my-classrooms'] as const,
  /** 정본 — 내가 operator 인 반 목록(`GET /bots?role=teacher`). */
  operatorClasses: ['operator-classes'] as const,
  /** 정본 — 반 하나(`GET /bots/:id`). 목록과 키를 따로 두는 이유는 반 상세가 목록 없이 열려서다. */
  operatorClass: (classId: string) => ['operator-class', classId] as const,
  /** 정본 — 반 명단(`GET /classes/:classId/members`). */
  classMembers: (classId: string) => ['class-members', classId] as const,
  /**
   * 정본 반 상세(`GET /classbot/classes/:classId` · `useClassDetail`). 반 생성·봇 할당·코드 재발급 응답도
   * 같은 자리에 써 넣는다 — 세 쓰기가 돌려주는 것이 같은 `ClassDto` 라 다시 묻지 않아도 된다.
   * 신원 꼬리는 **붙는다**(이제 읽기 캐시다) — 그래서 쓰기 응답을 넣을 땐 접두사로 찾는다(`writeClassDetail`).
   */
  classDetail: (classId: string) => ['class-detail', classId] as const,
};

/* ─── 교사 — pullim-api 정본 `api.pullim.ai/classbot/*` (계획 PR 5a · 5b) ─── */

/**
 * `GET /classbot/bots?role=teacher` — 내가 operator 인 반(과 그 봇) 목록.
 *
 * 응답은 봉투 없는 `BotCardDto[]` 다. **탐색 키는 아직 반이다**(ADR-092 open ①) — 카드 한 장이 반 하나다.
 * 다만 **안은 바뀌었다**(pullim-api #679): `name` 이 **봇 이름**이고 반 이름은 `className` 으로 따로 오며,
 * `profile` 의 페르소나 칸은 `bots` 에서 온다(붙은 봇이 없으면 null).
 *
 * ⚠ **이 목록에서 반을 부를 때는 `classNameOf(card)` 를 거쳐라**(`lib/api/classbot-dto.ts`). `card.name` 을
 * 그대로 쓰면 같은 봇을 건 두 반이 **완전히 같은 글자**가 된다 — 과제 배포 드롭다운에서 그건 오배포다.
 * 지금 그 함수를 거치는 자리: `toOperatorClass` · `toTeacherClass` · 관제소 반 고르기 · 봇 빌더 「붙일 반」 칩 ·
 * 반 상세 「봇」 탭의 「이미 붙은 반」 줄 · 만든 봇 배너.
 *
 * 참여 코드는 **카드에 없다**(코드는 낼 때만 돌아온다 · `useIssueJoinCode`) — 코드도 지금 붙은 봇도
 * `useClassDetail` 이 든다. 화면 모양으로 옮기는 일은 `app/(teacher)/teacher/classroom/operator-class.ts` 가 한다.
 * @returns react-query 결과(`data` = 카드 배열)
 */
export function useOperatorClasses(): UseQueryResult<BotCardDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<BotCardDto[], ApiError>({
    queryKey: [...classroomKeys.operatorClasses, user?.id ?? null],
    queryFn: () => classbotRead<BotCardDto[]>('/bots?role=teacher'),
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/bots/:id` — 반 하나(반 상세 `/teacher/classroom/[id]` 의 머리).
 *
 * 목록에서 찾지 않고 따로 읽는 이유: 상세는 링크로 바로 열리는 화면이라 목록이 캐시에 없을 수 있고,
 * 남의 반은 정본이 **403** 으로 가른다(`authz.md § 1.5` · 없는 반은 404) — 목록에서 못 찾는 것과
 * 다른 뜻이다. 화면은 `statusOf` 로 둘을 갈라 말한다. 이 문도 탐색 키는 반이고, 카드와 같은 개정을 받는다
 * (pullim-api #679) — `name` 이 봇 이름, `className` 이 반 이름, `botId` 가 `classes.bot_id` 다.
 * *(`[2026-09-19 정정]` 종전에는 「`classes.bot_id` 는 실리지 않는다」고 적었다. #679 가 `botId` 를 실었다.)*
 * 그래도 **봇 칩은 여전히 `useClassDetail`** 이 든다 — 칩이 그리는 것은 id 가 아니라 이름·아바타이고
 * (`ClassDto.bot`), 이 문은 그 둘을 봇 단위로 주지 않는다.
 * @param classId - 반 id. 비어 있으면 묻지 않는다.
 * @returns react-query 결과(`data` = 반 상세)
 */
export function useOperatorClass(classId: string | null | undefined): UseQueryResult<BotDetailDto, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<BotDetailDto, ApiError>({
    queryKey: [...classroomKeys.operatorClass(classId ?? ''), user?.id ?? null],
    queryFn: () => classbotRead<BotDetailDto>(`/bots/${encodeURIComponent(classId ?? '')}`),
    enabled: isReady && user !== null && Boolean(classId),
    retry: retryUnlessClientError,
  });
}

/**
 * 반 생성·봇 할당 응답의 `ClassDto` 를 반 상세 캐시에 넣는다 — 두 문이 같은 자리에 쓴다.
 *
 * **`setQueriesData`(접두사 갱신)가 아니라 `setQueryData`(자리 만들기)다.** 접두사 쪽은 **이미 있는 쿼리만**
 * 고치므로, 아직 아무도 그 반을 안 읽었으면 조용히 아무 일도 안 한다 — 반을 막 만든 순간이 정확히 그 경우다
 * (목록 화면에는 그 반의 상세 구독자가 없다). 그러면 배너가 가리키는 새 반에 들어갈 때 코드 상자가 한 박자 비고,
 * 그 한 박자가 「코드를 못 받았다」로 읽힌다. 그래서 신원 꼬리를 직접 붙여 자리를 만든다.
 * @param queryClient - react-query 클라이언트
 * @param userId - 지금 신원(쿼리 키 꼬리) · 비로그인이면 null
 * 「만들어 붙이기」(`hooks/api/bot.ts` `useCreateBotForClass`)도 마지막에 반을 돌려받으므로 같은 자리를 쓴다 —
 * 그래서 내보낸다. 키 모양을 아는 곳은 이 파일 하나여야 한다.
 * @param klass - 정본이 돌려준 반
 */
export function writeClassDetail(queryClient: QueryClient, userId: string | null, klass: ClassDto): void {
  queryClient.setQueryData<ClassDto>([...classroomKeys.classDetail(klass.id), userId], klass);
}

/**
 * `GET /classbot/classes/:classId` — 반 하나를 `ClassDto` 로(합성 `bot` · 활성 `joinCode` · operator 응답에만).
 *
 * **이 문이 「지금 붙은 봇」의 정본이다**(pullim-api #672 · api.md § 1). 종전 `useKnownClassSummary` 는 반 생성·
 * 봇 할당 응답을 이 세션의 캐시에서 되읽는 것뿐이라 **새로고침하면 다시 「모른다」로 돌아갔다** — 이제 묻는다.
 *
 * 화면이 가르는 셋은 그대로다 — **모른다(`data === undefined`: 아직 못 읽었거나 실패) · 봇 없음(`bot: null`) ·
 * 이 봇**. 「모른다」를 「없다」로 그리면 교사가 멀쩡한 봇 위에 새 봇을 만든다. 그래서 오류를 빈 값으로 접지 않는다.
 *
 * 읽을 수 있는 사람은 operator **또는 활성 멤버**다(비소속 403 · 없는 반 404). 멤버가 읽으면 `joinCode` 는 늘
 * null 이다 — 코드는 운영자 몫이다.
 * @param classId - 반 id. 비어 있으면 묻지 않는다.
 * @returns react-query 결과(`data` = 반 상세)
 */
export function useClassDetail(classId: string | null | undefined): UseQueryResult<ClassDto, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<ClassDto, ApiError>({
    queryKey: [...classroomKeys.classDetail(classId ?? ''), user?.id ?? null],
    queryFn: () => classbotRead<ClassDto>(`/classes/${encodeURIComponent(classId ?? '')}`),
    enabled: isReady && user !== null && Boolean(classId),
    retry: retryUnlessClientError,
  });
}

/**
 * `POST /classbot/classes` — 반 만들기(201 `{ class, joinCode }`). 반과 첫 참여 코드가 한 트랜잭션이다.
 *
 * `name` 만 필수. 봇은 여기서 만들지 않는다 — `botId` 는 **이미 있는 내 봇**을 붙일 때만(남의 봇·없는 봇 404).
 * 이 앱의 폼은 `botId` 를 보내지 않는다 — 봇은 반 상세 「봇」 탭에서 만들어 붙이거나 내 봇 중에 고른다.
 * @returns mutation. 성공하면 정본 반 목록을 다시 읽고, 돌아온 `class` 를 반 상세 캐시에 둔다(첫 코드가 거기 있다).
 */
export function useCreateClassroom(): UseMutationResult<CreateClassResponse, ApiError, CreateClassBody> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<CreateClassResponse, ApiError, CreateClassBody>({
    mutationFn: async (input) => {
      const { body } = await classbotWrite<CreateClassResponse>('/classes', input);
      return body;
    },
    onSuccess: (created) => {
      writeClassDetail(queryClient, user?.id ?? null, created.class);
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClasses });
    },
  });
}

/**
 * `GET /classbot/classes/:classId/members` — 이 반의 명단(operator 만).
 *
 * 활성 멤버십만, 들어온 순서로. 남의 반은 **403**, 없는 반은 404(`CLASS_NOT_FOUND`) — 화면이 갈라 말한다.
 * `displayName` 은 auth 프로필 투영이라 비어 올 수 있다(탈퇴·부재) — null 을 지어내지 말고 그대로 그린다.
 * @param classId - 반 id. 비어 있으면 묻지 않는다.
 * @returns react-query 결과(`data` = 명단 배열)
 */
export function useClassMembers(classId: string | null | undefined): UseQueryResult<ClassMemberDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<ClassMemberDto[], ApiError>({
    queryKey: [...classroomKeys.classMembers(classId ?? ''), user?.id ?? null],
    queryFn: () => classbotRead<ClassMemberDto[]>(`/classes/${encodeURIComponent(classId ?? '')}/members`),
    enabled: isReady && user !== null && Boolean(classId),
    retry: retryUnlessClientError,
  });
}

/** `PUT /classbot/classes/:classId/bot` 입력 — `botId: null` 이 「떼기」다. */
export interface AssignClassBotInput extends AssignClassBotBody {
  classId: string;
}

/**
 * `PUT /classbot/classes/:classId/bot {botId | null}` — 봇 붙이기·바꾸기·떼기(200 `ClassDto`).
 *
 * 반 소유권 **그리고** 봇 owner == 반 operator 여야 한다 — 남의 반 403 · 없는 봇/남의 봇 404(`BOT_NOT_FOUND`) ·
 * 같은 값은 멱등 200. `null` 로 떼면 반은 봇 없이 유효하고 학생의 대화 전송만 409 로 막힌다(api.md § 3.8).
 * 과거 대화는 `messages.bot_id` 로 남는다.
 * @returns mutation — 돌아온 반(`bot` 합성). 반 상세 캐시에 두고 반 목록·옛 상세를 다시 읽는다.
 */
export function useAssignClassBot(): UseMutationResult<ClassDto, ApiError, AssignClassBotInput> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation<ClassDto, ApiError, AssignClassBotInput>({
    mutationFn: async ({ classId, botId }) => {
      const { body } = await classbotWrite<ClassDto>(
        `/classes/${encodeURIComponent(classId)}/bot`,
        { botId } satisfies AssignClassBotBody,
        'PUT',
      );
      return body;
    },
    onSuccess: (klass) => {
      writeClassDetail(queryClient, user?.id ?? null, klass);
      // 내 봇 행의 classIds도 할당 결과로 바뀐다. 이 캐시가 낡으면 방금 떼어진 기존 봇이
      // 바꾸기 목록에서 계속 "이 반에 붙은 봇"으로 필터링돼 즉시 되돌릴 수 없다.
      void queryClient.invalidateQueries({ queryKey: botKeys.myBots });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClasses });
      void queryClient.invalidateQueries({ queryKey: classroomKeys.operatorClass(klass.id) });
    },
  });
}

/**
 * `POST /classbot/classes/:classId/join-codes` — 이 반의 참여 코드 새로 내기(201).
 *
 * operator 만 낼 수 있다(남의 반 403). 본문은 비운다 — 서버가 코드를 만들고 48시간 뒤 닫는다
 * (`IssueJoinCodeBody` · 기본 +48h). **재발급은 갈아 끼우기다** — pullim-api PR 2 부터 그 반의 옛 코드를 전부
 * 지우고 새 코드 하나만 남긴다(api.md § 3.5). 그래서 화면은 「새로 내면 지금 코드는 닫힌다」고 말해도 된다.
 * 반 상세 캐시가 이 반을 들고 있으면 거기 `joinCode` 도 새 것으로 바꾼다(들고 있지 않으면 **만들지 않는다** —
 * 코드 한 장으로 반 하나를 지어낼 수는 없다. 그래서 여기만 접두사 갱신(`setQueriesData`)이다).
 * @returns mutation — 새 코드(`JoinCodeDto` · `expiresAt` 포함)
 */
export function useIssueJoinCode(): UseMutationResult<JoinCodeDto, ApiError, { classId: string }> {
  const queryClient = useQueryClient();
  return useMutation<JoinCodeDto, ApiError, { classId: string }>({
    mutationFn: async ({ classId }) => {
      const { body } = await classbotWrite<JoinCodeDto>(
        `/classes/${encodeURIComponent(classId)}/join-codes`,
        {},
      );
      return body;
    },
    onSuccess: (dto) => {
      queryClient.setQueriesData<ClassDto>({ queryKey: classroomKeys.classDetail(dto.classId) }, (prev) =>
        prev ? { ...prev, joinCode: dto } : prev,
      );
    },
  });
}

/* ─── 학생 — pullim-api 정본 `api.pullim.ai/classbot/*` ─── */

/** `POST /classbot/enrollments` 요청 — 참여 코드 하나. */
export interface JoinByCodeInput {
  code: string;
}

/** 참여 결과 — 서버 응답에 화면이 말할 이름과 「이미 있었나」를 얹은 것. */
export interface JoinByCodeResult {
  enrollment: EnrollmentDto;
  /**
   * 들어간 **반** 이름 — 참여 응답에는 `classId` 만 있어 `GET /bots/:id` 로 한 번 더 읽는다.
   * 못 읽어도 참여는 이미 됐으므로 실패로 만들지 않고 null 로 둔다(토스트는 이름 없이 말한다).
   *
   * ⚠ **상세의 `name` 이 아니라 `className` 을 읽는다**(pullim-api #679) — `name` 은 이제 봇 이름이라
   * 그걸 쓰면 「QA 수학 선생님에 들어왔어요!」가 된다. 학생이 방금 넣은 것은 **반** 참여 코드다.
   */
  className: string | null;
  /** 서버가 200 을 줬다 = 이미 멤버였다(멱등 재입장). 201 이면 새로 들어왔다. */
  alreadyJoined: boolean;
}

/**
 * `POST /classbot/enrollments {code}` — 참여 코드로 수업방 들어가기.
 *
 * 이미 들어와 있던 반이어도 **오류가 아니다** — 서버가 200 으로 같은 멤버십을 돌려주고
 * `alreadyJoined:true` 로 온다. 실패는 `joinFailureMessage` 로 학생에게 말한다.
 * @returns mutation. 성공하면 내 수업방·봇·과제를 다시 읽는다.
 */
export function useJoinByCode(): UseMutationResult<JoinByCodeResult, ApiError, JoinByCodeInput> {
  const queryClient = useQueryClient();
  return useMutation<JoinByCodeResult, ApiError, JoinByCodeInput>({
    mutationFn: async ({ code }) => {
      const { status, body } = await classbotWrite<EnrollmentDto>('/enrollments', { code });
      const className = await classbotRead<BotDetailDto>(
        `/bots/${encodeURIComponent(body.classId)}`,
      )
        // `className` 이 없는 옛 응답(#679 이전)에서는 `name` 이 곧 반 이름이라 거기로 떨어진다.
        .then((bot) => bot.className ?? bot.name)
        .catch(() => null);
      return { enrollment: body, className, alreadyJoined: status === 200 };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: classroomKeys.myClassrooms });
      // 과제 목록(`app/(student)/classbot/assignment/use-assignment-reads.ts`)도 새 반을 반영해야 한다.
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}

/**
 * 참여 실패 → 학생이 읽는 한 줄. 서버가 가른 뜻을 뭉개지 않는다(계획 §07 「실패는 실패로 보인다」).
 *  - 404 없는 코드 · 410 닫힌 코드(만료 — pullim-api PR 2 가 낸다) · 409 이미 들어와 있음
 *    (지금 정본은 멱등 200 으로 주지만, 그 문이 409 를 쓰게 되는 날을 대비해 같은 말을 둔다).
 *  - 401 은 여기 오기 전에 로그인으로 갔다 — 리다이렉트가 도는 사이 토스트가 뜰 수 있어 문구는 둔다.
 *  - 403 은 「들어갈 수 없는 반」이다(entitlement·비활성 반). 그 밖(5xx·네트워크)은 일반 실패.
 * @param error - `useJoinByCode` 가 던진 오류
 * @returns 토스트에 그대로 띄우는 우리말 한 줄
 */
export function joinFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 401:
      return '로그인이 필요해요.';
    case 403:
      return '이 반에는 들어갈 수 없어요.';
    case 404:
      return '없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.';
    case 409:
      return '이미 들어와 있는 반이에요.';
    case 410:
      return '닫힌 코드예요. 선생님께 새 코드를 받아 주세요.';
    default:
      return '참여하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

/**
 * `GET /classbot/bots?role=student` — 내가 들어간 반(과 그 봇) 목록.
 *
 * 응답은 봉투 없는 `BotCardDto[]` 다. 카드 한 장이 반 하나이고(탐색 키는 아직 반 — ADR-092 open ①),
 * **이름은 두 칸이다**(pullim-api #679): `name` = 봇 이름 · `className` = 반 이름.
 * 화면 슬롯으로 옮기는 일은 `components/classbot/home/my-rooms.ts` 의 `toSlot` 이 한다 —
 * **어느 칸을 어느 자리에 쓰는지는 거기가 정본이다.**
 * @returns react-query 결과(`data` = 카드 배열)
 */
export function useMyClassrooms(): UseQueryResult<BotCardDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<BotCardDto[], ApiError>({
    queryKey: [...classroomKeys.myClassrooms, user?.id ?? null],
    queryFn: () => classbotRead<BotCardDto[]>('/bots?role=student'),
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}
