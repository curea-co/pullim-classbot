'use client';

/**
 * 수업방 훅 — 교사(목록·개설·코드 재발급·명단)와 학생(코드 참여·내 수업방).
 *
 * 기존 `hooks/api/read/*` 와 갈리는 지점 하나: 저 훅들은 `useAuth().user` 로 잠근다
 * (`enabled: isReady && Boolean(user)`). 그 신원은 **JWT 세션**이라 개발용 신원 쿠키로는
 * 언제나 null 이고, 같은 방식으로 잠그면 로컬에서 이 훅들이 **한 번도 안 나간다.**
 * 그래서 `useCurrentUserId()`(JWT → 개발 쿠키 → 데모 폴백)를 쓴다:
 *  - 잠그지 않고 일단 보내고, **서버가 준 401** 을 `ApiClientError` 로 받아 화면이 게이트를 세운다.
 *  - 그 id 를 **queryKey 에 넣는다** — 역할 전환(DevRoleSwitch)으로 신원이 바뀌면 캐시가
 *    갈라져 새로 읽는다. 안 넣으면 교사로 보던 목록이 학생 화면에 그대로 남는다.
 *
 * 오류는 전부 `ApiClientError` 다 — `error.message` 가 이미 우리말이라 그대로 띄우면 된다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { ApiClientError, apiGet, apiPost } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import type {
  ClassroomStudentsResponse,
  CreateClassroomInput,
  CreateClassroomResponse,
  IssueJoinCodeResponse,
  JoinByCodeInput,
  JoinByCodeResponse,
  MyClassroomsResponse,
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

/** 401 은 재시도해도 같은 답이다 — 게이트로 넘긴다. 그 밖에는 1회만 다시. */
function retryUnlessGuarded(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status < 500) return false;
  return failureCount < 1;
}

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

/**
 * `POST /api/enrollments` — 참여 코드로 수업방 들어가기.
 *
 * 이미 들어와 있던 방이어도 **오류가 아니다** — `alreadyJoined:true` 로 온다.
 * @returns mutation. 성공하면 내 수업방·봇·과제를 다시 읽는다.
 */
export function useJoinByCode(): UseMutationResult<
  JoinByCodeResponse,
  ApiClientError,
  JoinByCodeInput
> {
  const queryClient = useQueryClient();
  return useMutation<JoinByCodeResponse, ApiClientError, JoinByCodeInput>({
    mutationFn: (input) => apiPost<JoinByCodeResponse>('/api/enrollments', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: classroomKeys.myClassrooms });
      // 봇·과제 목록(hooks/api/read)도 새 방을 반영해야 한다.
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}

/**
 * `GET /api/me/classrooms` — 내가 참여한 수업방 목록.
 * @returns react-query 결과(`data.classrooms`)
 */
export function useMyClassrooms(): UseQueryResult<MyClassroomsResponse, ApiClientError> {
  const userId = useCurrentUserId();
  return useQuery<MyClassroomsResponse, ApiClientError>({
    queryKey: [...classroomKeys.myClassrooms, userId],
    queryFn: () => apiGet<MyClassroomsResponse>('/api/me/classrooms'),
    retry: retryUnlessGuarded,
  });
}
