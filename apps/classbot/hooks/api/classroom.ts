'use client';

/**
 * 수업방 훅 — 교사(반 목록·반 하나·코드 발급 / 개설·명단)와 학생(코드 참여·내 수업방).
 *
 * 두 무리가 **다른 서버**를 본다 — 완성 설계 `2026-09-16_classbot-completion-design.md` § 5 · § 8:
 *  - **정본**(pullim-api `api.pullim.ai/classbot/*`, OS 쿠키) — 문이 이미 있는 것들.
 *    학생 둘 `useJoinByCode`(`POST /enrollments`) · `useMyClassrooms`(`GET /bots?role=student`),
 *    교사 셋 `useOperatorClasses`(`GET /bots?role=teacher`) · `useOperatorClass`(`GET /bots/:id`) ·
 *    `useIssueJoinCode`(`POST /classes/:classId/join-codes`). 교사 셋은 계획 PR 5a(해소 7)가 옮겼다.
 *  - **같은 오리진** `/api/teacher/classrooms*` — 정본에 아직 문이 없는 둘.
 *    `useCreateClassroom`(`POST /classes` 는 pullim-api PR 2) · `useClassroomStudents`
 *    (`GET /classes/:id/members` 도 PR 2). 그리고 `useTeacherClassrooms` — 내 수업방 화면은 더 안 읽지만
 *    과제 내기 폼(`app/(teacher)/teacher/assignment/new/*` · 계획 PR 6 영역)과 봇 마켓의 「내 봇 공유」
 *    (`app/(teacher)/teacher/marketplace/*` · 결정 ① 범위 밖)가 아직 읽는다. 그 둘이 옮겨 가는 날 함께 걷는다.
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
import type { BotCardDto, BotDetailDto, EnrollmentDto, JoinCodeDto } from '@/lib/api/classbot-dto';
import { ApiClientError, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUserId } from '@/lib/current-user';
import type {
  ClassroomStudentsResponse,
  CreateClassroomInput,
  CreateClassroomResponse,
  TeacherClassroomsResponse,
} from '@/hooks/api/types';

/**
 * 쿼리 키 — 무효화할 때 이 상수를 쓴다(문자열을 손으로 다시 적지 마라).
 * 신원 id 는 키의 **꼬리**에 붙으므로, 접두사만으로 무효화하면 모든 신원이 함께 갈린다.
 */
export const classroomKeys = {
  teacherClassrooms: ['teacher-classrooms'] as const,
  classroomStudents: (classroomId: string) =>
    ['classroom-students', classroomId] as const,
  myClassrooms: ['my-classrooms'] as const,
  /** 정본 — 내가 operator 인 반 목록(`GET /bots?role=teacher`). */
  operatorClasses: ['operator-classes'] as const,
  /** 정본 — 반 하나(`GET /bots/:id`). 목록과 키를 따로 두는 이유는 반 상세가 목록 없이 열려서다. */
  operatorClass: (classId: string) => ['operator-class', classId] as const,
};

/** 같은 오리진 교사 라우트용 — 401 은 재시도해도 같은 답이다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/* ─── 교사 — 같은 오리진 `/api/teacher/classrooms*` (정본에 문이 없는 것들 · 머리주석) ─── */

/**
 * `GET /api/teacher/classrooms` — 내가 연 수업방 목록(같은 오리진).
 *
 * 내 수업방 화면(`/teacher/classroom`)은 더 이상 이것을 읽지 않는다 — `useOperatorClasses` 가 정본이다.
 * 남아 있는 소비자는 과제 내기 폼과 봇 마켓 「내 봇 공유」(머리주석). 새 소비자를 붙이지 마라.
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

/**
 * `POST /api/teacher/classrooms` — 수업방 개설(반 + 봇 + 참여 코드 한 번에).
 * @returns mutation. 성공하면 수업방 목록을 다시 읽는다.
 */
export function useCreateClassroom(): UseMutationResult<
  CreateClassroomResponse,
  ApiClientError,
  CreateClassroomInput
> {
  const queryClient = useQueryClient();
  return useMutation<CreateClassroomResponse, ApiClientError, CreateClassroomInput>({
    mutationFn: (input) =>
      apiPost<CreateClassroomResponse>('/api/teacher/classrooms', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: classroomKeys.teacherClassrooms });
    },
  });
}

/**
 * `GET /api/teacher/classrooms/[id]/students` — 참여 학생 명단(같은 오리진).
 *
 * 내 수업방 카드의 명단은 내렸다(계획 PR 5a) — 정본에 명단 문이 없어(`GET /classes/:id/members` · PR 2)
 * 정본 카드에 같은 오리진 명단을 붙이면 반 id 가 서로 다른 세계의 것이 된다. 5b 가 정본 문으로 되살린다.
 * 남은 소비자는 과제 내기 폼(대상 학생 고르기)이다.
 * @param classroomId - 반 id. 비어 있으면 조회하지 않는다(선택 전 상태).
 * @returns react-query 결과(`data.students`)
 */
export function useClassroomStudents(
  classroomId: string | null | undefined,
): UseQueryResult<ClassroomStudentsResponse, ApiClientError> {
  const userId = useCurrentUserId();
  return useQuery<ClassroomStudentsResponse, ApiClientError>({
    queryKey: [...classroomKeys.classroomStudents(classroomId ?? ''), userId],
    queryFn: () =>
      apiGet<ClassroomStudentsResponse>(
        `/api/teacher/classrooms/${encodeURIComponent(classroomId ?? '')}/students`,
      ),
    enabled: Boolean(classroomId),
    retry: retryUnlessGuarded,
  });
}

/* ─── 교사 — pullim-api 정본 `api.pullim.ai/classbot/*` (계획 PR 5a) ─── */

/**
 * `GET /classbot/bots?role=teacher` — 내가 operator 인 반(과 그 봇) 목록.
 *
 * 응답은 봉투 없는 `BotCardDto[]` 다. bot == class(ADR-063)라 카드 한 장이 반 하나이고 `name` 은 반 이름,
 * 봇 성격은 `profile`(생성 전 null)에 있다 — 참여 코드는 **카드에 없다**(코드는 낼 때만 돌아온다 ·
 * `useIssueJoinCode`). 화면 모양으로 옮기는 일은 `app/(teacher)/teacher/classroom/operator-class.ts` 가 한다.
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
 * 다른 뜻이다. 화면은 `statusOf` 로 둘을 갈라 말한다.
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
 * `POST /classbot/classes/:classId/join-codes` — 이 반의 참여 코드 새로 내기(201).
 *
 * operator 만 낼 수 있다(남의 반 403). 본문은 비운다 — 서버가 코드를 만든다(`IssueJoinCodeDto.code` 는 선택).
 * **옛 코드는 아직 살아 있다** — 정본 `createJoinCode()` 는 저장만 하고, 「반 하나에 살아 있는 코드는
 * 하나」 규칙과 `expires_at` 은 pullim-api PR 2 가 옮겨 온다(완성 설계 § 5 R1). 그래서 화면은 옛 코드가
 * 죽는다고 말하지 않는다. 카드·상세 응답에 코드가 실리지 않으므로 다시 읽을 쿼리도 없다.
 * @returns mutation — 새 코드(`JoinCodeDto`)
 */
export function useIssueJoinCode(): UseMutationResult<JoinCodeDto, ApiError, { classId: string }> {
  return useMutation<JoinCodeDto, ApiError, { classId: string }>({
    mutationFn: async ({ classId }) => {
      const { body } = await classbotWrite<JoinCodeDto>(
        `/classes/${encodeURIComponent(classId)}/join-codes`,
        {},
      );
      return body;
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
