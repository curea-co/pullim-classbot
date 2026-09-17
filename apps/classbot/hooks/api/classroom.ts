'use client';

/**
 * 수업방 훅 — 교사(반 목록·반 하나·반 만들기·명단·봇 할당·코드 발급)와 학생(코드 참여·내 수업방).
 *
 * 거의 전부가 **정본**(pullim-api `api.pullim.ai/classbot/*`, OS 쿠키)을 본다 — 완성 설계
 * `2026-09-16_classbot-completion-design.md` § 5 · § 8:
 *  - 학생 둘 `useJoinByCode`(`POST /enrollments`) · `useMyClassrooms`(`GET /bots?role=student`).
 *  - 교사 여섯 `useOperatorClasses`(`GET /bots?role=teacher`) · `useOperatorClass`(`GET /bots/:id`) ·
 *    `useIssueJoinCode`(`POST /classes/:classId/join-codes`) — 계획 PR 5a 가 옮겼고,
 *    `useCreateClassroom`(`POST /classes`) · `useClassMembers`(`GET /classes/:classId/members`) ·
 *    `useAssignClassBot`(`PUT /classes/:classId/bot`) — 계획 PR 5b 가 pullim-api PR 2 의 새 문에 붙였다.
 *  - 같은 오리진 `/api/teacher/classrooms` 는 **`useTeacherClassrooms` 하나만** 남는다 — 내 수업방 화면은 더 안 읽고,
 *    봇 마켓의 「내 봇 공유」(`app/(teacher)/teacher/marketplace/*` · 결정 ① 범위 밖)가 게시 상태를 여기서 읽는다.
 *    그 절이 옮겨 가는 날(계획 PR 8) 함께 걷는다. 같은 오리진 `useCreateClassroom`·`useClassroomStudents` 는
 *    5b 가 걷었다(라우트 핸들러는 PR 8 의 「B 세계 은퇴」 몫으로 남는다).
 *
 * 정본 훅의 신원·캐시 규약:
 *  - 신원은 OS 세션(`useAuth`)이다. 세션 복원 전(`isReady=false`)에는 묻지 않는다 — 그 구간의
 *    요청은 누구 것인지 몰라 캐시가 남의 키에 남는다. 복원 뒤 비로그인이면 RoleGuard 가 이미
 *    로그인으로 보내는 중이라 역시 묻지 않는다.
 *  - 세션 사용자 id 를 queryKey 꼬리에 둔다 — 같은 브라우저에서 계정을 바꾸면 캐시가 갈린다.
 *  - 오류는 `ApiError`(`@pullim-classbot/api-client`)다. 401 은 `lib/api/classbot-client.ts` 가
 *    로그인으로 보낸다. 목 폴백은 없다 — 실패는 실패로 보인다(계획 §07 학생·내 수업방 줄).
 *
 * 같은 오리진 훅의 오류는 종전대로 `ApiClientError` 다. 두 타입을 섞어 판정하지 마라.
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
import { ApiClientError, apiGet } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUserId } from '@/lib/current-user';
import type { TeacherClassroomsResponse } from '@/hooks/api/types';

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙으므로, 접두사만으로 무효화하면 모든 신원이 함께 갈린다.
 */
export const classroomKeys = {
  teacherClassrooms: ['teacher-classrooms'] as const,
  myClassrooms: ['my-classrooms'] as const,
  /** 정본 — 내가 operator 인 반 목록(`GET /bots?role=teacher`). */
  operatorClasses: ['operator-classes'] as const,
  /** 정본 — 반 하나(`GET /bots/:id`). 목록과 키를 따로 두는 이유는 반 상세가 목록 없이 열려서다. */
  operatorClass: (classId: string) => ['operator-class', classId] as const,
  /** 정본 — 반 명단(`GET /classes/:classId/members`). */
  classMembers: (classId: string) => ['class-members', classId] as const,
  /**
   * 정본 `ClassDto` 요약 — 반 생성·봇 할당 응답으로만 채워진다(읽기 문 없음 · `useKnownClassSummary`).
   * 신원 꼬리를 붙이지 않는다 — 쓰기 응답을 그 자리에서 넣는 캐시라 남의 키에 남을 구간이 없다.
   */
  classSummary: (classId: string) => ['class-summary', classId] as const,
};

/** 같은 오리진 교사 라우트용 — 401 은 재시도해도 같은 답이다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/* ─── 교사 — 같은 오리진 `/api/teacher/classrooms` (봇 마켓 「내 봇 공유」만 읽는다 · 머리주석) ─── */

/**
 * `GET /api/teacher/classrooms` — 내가 연 수업방 목록(같은 오리진).
 *
 * 내 수업방 화면(`/teacher/classroom`)은 더 이상 이것을 읽지 않는다 — `useOperatorClasses` 가 정본이다.
 * 남아 있는 소비자는 봇 마켓 「내 봇 공유」(머리주석). 새 소비자를 붙이지 마라.
 * @returns react-query 결과(`data.classrooms`)
 */
export function useTeacherClassrooms(): UseQueryResult<
  TeacherClassroomsResponse,
  ApiClientError
> {
  const userId = useCurrentUserId();
  return useQuery<TeacherClassroomsResponse, ApiClientError>({
    queryKey: [...classroomKeys.teacherClassrooms, userId],
    queryFn: () => apiGet<TeacherClassroomsResponse>('/api/teacher/classrooms'),
    retry: retryUnlessGuarded,
  });
}

/* ─── 교사 — pullim-api 정본 `api.pullim.ai/classbot/*` (계획 PR 5a · 5b) ─── */

/**
 * `GET /classbot/bots?role=teacher` — 내가 operator 인 반(과 그 봇) 목록.
 *
 * 응답은 봉투 없는 `BotCardDto[]` 다. **이 문은 아직 bot == class(ADR-063)다**(api.md § 3.5 「뜻 개정은 후속 PR」) —
 * 카드 한 장이 반 하나이고 `name` 은 반 이름, `profile` 은 옛 `class_bot_profiles`(생성 전 null)다. 참여 코드는
 * **카드에 없다**(코드는 낼 때만 돌아온다 · `useIssueJoinCode`) — 새로 만든 반의 첫 코드는
 * `useKnownClassSummary` 가 든다. 화면 모양으로 옮기는 일은 `app/(teacher)/teacher/classroom/operator-class.ts` 가 한다.
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
 * 다른 뜻이다. 화면은 `statusOf` 로 둘을 갈라 말한다. 이 문도 아직 bot == class 라 `classes.bot_id` 는
 * 실리지 않는다 — 「지금 붙은 봇」은 `useKnownClassSummary`.
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
 * 반 생성·봇 할당·코드 재발급 응답의 `ClassDto` 를 요약 캐시에 넣는다 — 세 문이 같은 자리에 쓴다.
 * @param queryClient - react-query 클라이언트
 * @param klass - 정본이 돌려준 반
 */
function rememberClassSummary(queryClient: QueryClient, klass: ClassDto): void {
  queryClient.setQueryData<ClassDto>(classroomKeys.classSummary(klass.id), klass);
}

/**
 * 「지금 이 반이 아는 것」 — 반 생성(`POST /classes`)·봇 할당(`PUT /classes/:classId/bot`)·코드 재발급이
 * 돌려준 `ClassDto`(합성 `bot` · 활성 `joinCode`)를 **이 세션의 캐시에서** 읽는다. 서버에 묻지 않는다.
 *
 * 왜 묻지 않나: 정본에 반 하나를 `ClassDto` 모양으로 **읽는 문이 없다**(`GET /classes/:id` 는 api.md § 1
 * 「후속 구현」 · `GET /bots/:id` 는 아직 옛 class+profile 합성이라 `classes.bot_id` 가 없다). 그래서 링크로 바로
 * 연 반은 `undefined`(모른다)고, 이 화면에서 반을 만들었거나 봇을 붙이고 뗀 뒤에야 값이 선다. 화면은 셋을 갈라
 * 말한다 — **모른다 · 봇 없음(`bot: null`) · 이 봇**. 「모른다」를 「없다」로 그리면 교사가 멀쩡한 봇을 새로 만든다.
 * 읽기 문이 열리는 날 이 훅에 `queryFn` 을 달면 화면은 그대로다(PR 본문 「pullim-api 후속」).
 *
 * `gcTime: Infinity` — 「이 세션이 아는 것」은 세션이 끝날 때까지 알아야 한다. 기본 5분이면 채점 화면에 다녀온 사이
 * 증발해 「이 봇」이 「모른다」로 되돌아가고 참여 코드 상자도 빈다. 관찰자가 붙는 순간 쿼리의 gcTime 이 이 값으로
 * 올라간다(react-query v5 · 큰 쪽이 이긴다).
 * @param classId - 반 id
 * @returns 아는 `ClassDto` · 모르면 `undefined`
 */
export function useKnownClassSummary(classId: string | null | undefined): ClassDto | undefined {
  const query = useQuery<ClassDto>({
    queryKey: classroomKeys.classSummary(classId ?? ''),
    // 읽기 문이 없다(머리주석). `enabled:false` 라 절대 불리지 않는다 — 캐시 구독만 하려고 쿼리를 쓴다.
    queryFn: () => Promise.reject(new Error('GET /classbot/classes/:id 는 아직 없다')),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return classId ? query.data : undefined;
}

/**
 * `POST /classbot/classes` — 반 만들기(201 `{ class, joinCode }`). 반과 첫 참여 코드가 한 트랜잭션이다.
 *
 * `name` 만 필수. 봇은 여기서 만들지 않는다 — `botId` 는 **이미 있는 내 봇**을 붙일 때만(남의 봇·없는 봇 404).
 * 이 앱의 폼은 `botId` 를 보내지 않는다(내 봇 목록을 읽는 문이 아직 없다 — `hooks/api/bot.ts` 머리주석) —
 * 봇은 반 상세 「봇」 탭에서 만들어 붙인다.
 * @returns mutation. 성공하면 정본 반 목록을 다시 읽고, 돌아온 `class` 를 요약 캐시에 둔다(첫 코드가 거기 있다).
 */
export function useCreateClassroom(): UseMutationResult<CreateClassResponse, ApiError, CreateClassBody> {
  const queryClient = useQueryClient();
  return useMutation<CreateClassResponse, ApiError, CreateClassBody>({
    mutationFn: async (input) => {
      const { body } = await classbotWrite<CreateClassResponse>('/classes', input);
      return body;
    },
    onSuccess: (created) => {
      rememberClassSummary(queryClient, created.class);
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
 * @returns mutation — 돌아온 반(`bot` 합성). 요약 캐시에 두고 반 목록·상세를 다시 읽는다.
 */
export function useAssignClassBot(): UseMutationResult<ClassDto, ApiError, AssignClassBotInput> {
  const queryClient = useQueryClient();
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
      rememberClassSummary(queryClient, klass);
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
 * 요약 캐시(`useKnownClassSummary`)가 이 반을 알고 있으면 거기 `joinCode` 도 새 것으로 바꾼다.
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
      queryClient.setQueryData<ClassDto>(classroomKeys.classSummary(dto.classId), (prev) =>
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
   * 들어간 반 이름 — 참여 응답에는 `classId` 만 있어 `GET /bots/:id` 로 한 번 더 읽는다.
   * 못 읽어도 참여는 이미 됐으므로 실패로 만들지 않고 null 로 둔다(토스트는 이름 없이 말한다).
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
        .then((bot) => bot.name)
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
 * 응답은 봉투 없는 `BotCardDto[]` 다(bot == class). 화면 슬롯으로 옮기는 일은
 * `components/classbot/home/my-rooms.ts` 의 `toSlot` 이 한다.
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
