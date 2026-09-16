'use client';

/**
 * 학생 제출 — pullim-api 정본 `POST /classbot/assignments/:id/submit`(2026-09-16 계획 §05 R9 · FE PR 6).
 *
 * 본문은 `{ answers }` 하나다 — 점수는 보내지 않는다. 서버가 `answers` ↔ `answer_key` 를 대조해 점수를 세고
 * (`assignment.service.ts` `computeScore` — 서술형이 하나라도 있으면 null), 문항별 정오는 돌려주지 않는다.
 * 같은 학생의 재제출은 upsert 라 **200**, 최초는 **201** — 본문은 같고 `resubmitted` 로 갈라 준다
 * (참여 `useJoinByCode` 의 `alreadyJoined` 와 같은 결).
 *
 * 종전에는 `computeMockScore` 로 브라우저가 점수를 매기고 `pullim-assignments` persist 에 썼다 — 둘 다 걷었다.
 * 성공하면 학생 과제 읽기(`['student-read', …]`)를 무효화한다.
 */

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { ApiError } from '@pullim-classbot/api-client';

import { classbotWrite } from '@/lib/api/classbot-client';
import type { SubmissionDto, SubmitAssignmentBody } from '@/lib/api/classbot-dto';

/** 제출 요청 — 과제 id + 문항 id → 답. */
export interface SubmitAssignmentRequest {
  assignmentId: string;
  answers: SubmitAssignmentBody['answers'];
}

/** 제출 결과 — 서버 응답에 「다시 낸 것인가」를 얹었다. */
export interface SubmitAssignmentResult {
  submission: SubmissionDto;
  /** 서버가 200 을 줬다 = 이미 낸 과제를 다시 냈다(upsert). 201 이면 첫 제출. */
  resubmitted: boolean;
}

/**
 * `POST /classbot/assignments/:id/submit` — 답을 내고 서버 점수를 받는다.
 * @returns mutation. 성공하면 학생 과제 읽기를 다시 읽는다.
 */
export function useSubmitAssignment(): UseMutationResult<
  SubmitAssignmentResult,
  ApiError,
  SubmitAssignmentRequest
> {
  const queryClient = useQueryClient();
  return useMutation<SubmitAssignmentResult, ApiError, SubmitAssignmentRequest>({
    mutationFn: async ({ assignmentId, answers }) => {
      const { status, body } = await classbotWrite<SubmissionDto>(
        `/assignments/${encodeURIComponent(assignmentId)}/submit`,
        { answers },
      );
      return { submission: body, resubmitted: status === 200 };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-read'] });
    },
  });
}
