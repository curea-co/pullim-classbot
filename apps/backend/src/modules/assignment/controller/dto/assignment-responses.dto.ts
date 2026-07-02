import type {
  AssignmentQuestionRow,
  AssignmentRow,
} from "../../interface/assignment-repository.interface";

/**
 * 과제 한 건 응답형 — AssignmentRow 의 dispatchedAt 을 ISO-8601 문자열로
 * 직렬화(spec §3). FE `AssignmentReadRow` 소비자는 확장 필드
 * (targetStudentIds/dispatchedAt/examTimeLimitMin/requizQuestionIds)를 무시한다.
 */
export type AssignmentResponseDto = Omit<AssignmentRow, "dispatchedAt"> & {
  dispatchedAt: string | null;
};

/**
 * `GET /api/assignments` 응답 봉투 — FE `AssignmentsReadResponse`
 * (apps/classbot/hooks/api/read/types.ts)와 정확히 일치해야 한다.
 */
export interface AssignmentsReadResponseDto {
  assignments: AssignmentResponseDto[];
}

/**
 * `GET /api/assignments/:id` 응답 봉투 — FE `AssignmentReadResponse`
 * `{ assignment }` 와 정합. `questions` 는 상위집합 확장(spec §4.5 상세+문항)
 * 으로 FE 기존 소비자는 무시한다. 문항이 없으면 빈 배열(콘텐츠는 M3).
 */
export interface AssignmentDetailResponseDto {
  assignment: AssignmentResponseDto & { questions: AssignmentQuestionRow[] };
}

/**
 * 제출 한 건 응답 — FE 스토어 `Submission` 형태 재현
 * (submittedAt 은 spec §3 에 따라 ISO-8601 문자열).
 */
export interface SubmissionResponseDto {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  answers: Record<string, string>;
  scorePercent: number;
}

/**
 * `GET /api/assignments/:id/submissions` 응답 봉투 — 교사 제출 현황 시트가
 * 소비할 형태(studentId / submittedAt / scorePercent / answers).
 */
export interface SubmissionsReadResponseDto {
  submissions: SubmissionResponseDto[];
}
