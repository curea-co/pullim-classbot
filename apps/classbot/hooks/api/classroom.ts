'use client';

/**
 * 수업방 훅 — 교사(목록·개설·코드 재발급·명단)와 학생(코드 참여·내 수업방).
 *
 * 두 무리가 **다른 서버**를 본다 — 2026-09-16 계획 §09 PR 4 · §10 해소 7:
 *  - **학생 둘**(`useJoinByCode`·`useMyClassrooms`)은 pullim-api 정본(`api.pullim.ai/classbot/*`,
 *    OS 쿠키)이다. 그 문은 이미 있다 — `POST /enrollments`·`GET /bots?role=student`.
 *  - **교사 넷**(목록·개설·코드 재발급·명단)은 아직 같은 오리진 `/api/teacher/classrooms*` 다.
 *    정본에는 반을 만드는 문과 명단 문이 없어서(`POST /classes`·`GET /classes/:id/members` —
 *    pullim-api PR 2), 지금 옮기면 그 화면이 PR 2 전까지 404 다. PR 5 가 옮긴다.
 *
 * 학생 훅의 신원·캐시 규약:
 *  - 신원은 OS 세션(`useAuth`)이다. 세션 복원 전(`isReady=false`)에는 묻지 않는다 — 그 구간의
 *    요청은 누구 것인지 몰라 캐시가 남의 키에 남는다. 복원 뒤 비로그인이면 RoleGuard 가 이미
 *    로그인으로 보내는 중이라 역시 묻지 않는다.
 *  - 세션 사용자 id 를 queryKey 꼬리에 둔다 — 같은 브라우저에서 계정을 바꾸면 캐시가 갈린다.
 *  - 오류는 `ApiError`(`@pullim-classbot/api-client`)다. 401 은 `lib/api/classbot-client.ts` 가
 *    로그인으로 보낸다. 목 폴백은 없다 — 실패는 실패로 보인다(계획 §07 학생·내 수업방 줄).
 *
 * 교사 훅의 오류는 종전대로 `ApiClientError`(같은 오리진)다. 두 타입을 섞어 판정하지 마라.
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
import type { BotCardDto, BotDetailDto, EnrollmentDto } from '@/lib/api/classbot-dto';
import { ApiClientError, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useAuth } from '@/lib/auth/auth-context';
import { useCurrentUserId } from '@/lib/current-user';
import type {
  ClassroomStudentsResponse,
  CreateClassroomInput,
  CreateClassroomResponse,
  IssueJoinCodeResponse,
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
};

/** 같은 오리진 교사 라우트용 — 401 은 재시도해도 같은 답이다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

/* ─── 교사 — 같은 오리진 `/api/teacher/classrooms*` (PR 5 에서 정본으로) ─── */

/**
 * `GET /api/teacher/classrooms` — 내가 연 수업방 목록.
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
 * `POST /api/teacher/classrooms/[id]/join-codes` — 참여 코드 다시 뽑기.
 *
 * 새 코드가 나오면 **옛 코드는 그 자리에서 무효**다(서버가 지운다).
 * @returns mutation. 성공하면 수업방 목록을 다시 읽는다.
 */
export function useIssueJoinCode(): UseMutationResult<
  IssueJoinCodeResponse,
  ApiClientError,
  { classroomId: string }
> {
  const queryClient = useQueryClient();
  return useMutation<IssueJoinCodeResponse, ApiClientError, { classroomId: string }>({
    mutationFn: ({ classroomId }) =>
      apiPost<IssueJoinCodeResponse>(
        `/api/teacher/classrooms/${encodeURIComponent(classroomId)}/join-codes`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: classroomKeys.teacherClassrooms });
    },
  });
}

/**
 * `GET /api/teacher/classrooms/[id]/students` — 참여 학생 명단.
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
