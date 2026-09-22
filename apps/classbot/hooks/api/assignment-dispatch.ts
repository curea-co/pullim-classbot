'use client';

/**
 * 교사 과제 훅 — 내기·낸 과제·상세·제출 현황. **넷 다 pullim-api 정본**이다(2026-09-16 계획 §05 · FE PR 6).
 *
 *  - `useDispatchAssignment` — `POST /classes/:classId/assignments`. 본문에 `questions[]` 를 싣는다(R6). 종전에는
 *    같은 오리진 `/api/teacher/assignments` 에 메타만 보내고 문항은 localStorage 에 따로 썼다 — 그 두 번째 쓰기
 *    (`useAssignmentStore.dispatch`)와 비로그인 분기는 함께 걷었다. 비로그인은 이 화면에 오지 않는다(PR 4 RoleGuard).
 *  - `useTeacherAssignments` — `GET /assignments?audience=teacher`. 기준은 `created_by` 가 아니라 **현재 operator**(R11).
 *    반 필터 `&classId=` 는 pullim-api PR 2 몫이라 아직 화면이 거른다.
 *  - `useAssignmentDetail` — `GET /assignments/:id`(operator 도 통과 — 「현재 operator OR 학생 술어」). 문항 포함, 🔒 answerKey 없음.
 *  - `useAssignmentSubmissions` — `GET /assignments/:id/submissions`(operator 전용 · R10). 학생 sub·점수·답안.
 *
 * **고치기·회수(`useUpdateAssignment`)는 지웠다** — 정본에 PATCH·회수 문이 없다. 화면은 버튼 대신 그 사실을 말한다.
 *
 * 신원·캐시 규약: 세션 복원 전(`isReady=false`)에는 묻지 않고, 사용자 id 를 queryKey 꼬리에 둔다. 오류는 `ApiError`
 * 이고 401 은 `lib/api/classbot-client.ts` 가 로그인으로 보낸다.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classbotRead, classbotWrite, retryUnlessClientError } from '@/lib/api/classbot-client';
import type {
  AssignmentDetailDto,
  AssignmentSummaryDto,
  DispatchAssignmentBody,
  SubmissionsViewDto,
} from '@/lib/api/classbot-dto';
import { useAuth } from '@/lib/auth/auth-context';

/** 쿼리 키 — 무효화할 때 이 상수를 쓴다. 신원 id 는 키의 꼬리에 붙는다. */
export const assignmentDispatchKeys = {
  teacherAssignments: ['teacher-assignments'] as const,
  detail: (id: string) => ['teacher-assignment', id] as const,
  submissions: (id: string) => ['assignment-submissions', id] as const,
};

/** 내기 요청 — 대상 반 + 정본 본문. */
export interface DispatchAssignmentRequest {
  classId: string;
  body: DispatchAssignmentBody;
}

/**
 * `POST /classbot/classes/:classId/assignments` — 문항까지 한 요청으로 과제를 낸다. 응답은 요약 한 행(201).
 * `body.targetStudentIds` 를 비우면 **반 전체**다.
 * @returns mutation. 성공하면 낸 과제·학생 쪽 읽기를 다시 읽는다.
 */
export function useDispatchAssignment(): UseMutationResult<
  AssignmentSummaryDto,
  ApiError,
  DispatchAssignmentRequest
> {
  const queryClient = useQueryClient();
  return useMutation<AssignmentSummaryDto, ApiError, DispatchAssignmentRequest>({
    mutationFn: async ({ classId, body }) =>
      (
        await classbotWrite<AssignmentSummaryDto>(
          `/classes/${encodeURIComponent(classId)}/assignments`,
          body,
        )
      ).body,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentDispatchKeys.teacherAssignments });
      // 같은 브라우저에서 역할을 오갈 때 학생 쪽 목록도 새 과제를 봐야 한다.
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}

/**
 * `GET /classbot/assignments?audience=teacher` — 내가 operator 인 모든 반의 과제(정본).
 *
 * 응답은 봉투 없는 `AssignmentSummaryDto[]` — 문항·answerKey 는 없다. `dDay` 는 낼 때 굳힌 정수다
 * (정본에 `due_at` 컬럼이 없다) — 화면이 `dispatchedAt` 로 지금 기준을 다시 센다(`lib/assignment-due.ts` `remainingDDay`).
 * @returns react-query 결과(`data` = 요약 배열)
 */
export function useTeacherAssignments(): UseQueryResult<AssignmentSummaryDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<AssignmentSummaryDto[], ApiError>({
    queryKey: [...assignmentDispatchKeys.teacherAssignments, user?.id ?? null],
    queryFn: () => classbotRead<AssignmentSummaryDto[]>('/assignments?audience=teacher'),
    enabled: isReady && user !== null,
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/assignments/:id` — 과제 상세(문항 포함). operator 는 자기 반 과제를 읽을 수 있다.
 * 남의 반 과제는 403, 없는 과제는 404 — 화면이 둘을 「내 과제가 아니다」로 함께 읽는다.
 * @param id - 과제 id. 비어 있으면 묻지 않는다.
 */
export function useAssignmentDetail(id: string): UseQueryResult<AssignmentDetailDto, ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<AssignmentDetailDto, ApiError>({
    queryKey: [...assignmentDispatchKeys.detail(id), user?.id ?? null],
    queryFn: () => classbotRead<AssignmentDetailDto>(`/assignments/${encodeURIComponent(id)}`),
    enabled: isReady && user !== null && Boolean(id),
    retry: retryUnlessClientError,
  });
}

/**
 * `GET /classbot/assignments/:id/submissions` — 제출 현황(operator 전용). 학생 한 명에 한 행(upsert).
 * @param id - 과제 id. 비어 있으면 묻지 않는다.
 */
export function useAssignmentSubmissions(id: string): UseQueryResult<SubmissionsViewDto[], ApiError> {
  const { user, isReady } = useAuth();
  return useQuery<SubmissionsViewDto[], ApiError>({
    queryKey: [...assignmentDispatchKeys.submissions(id), user?.id ?? null],
    queryFn: () =>
      classbotRead<SubmissionsViewDto[]>(`/assignments/${encodeURIComponent(id)}/submissions`),
    enabled: isReady && user !== null && Boolean(id),
    retry: retryUnlessClientError,
  });
}
