import type {
  AssignmentQuestionRow,
  AssignmentRow,
} from "../../interface/assignment-repository.interface";

/**
 * `GET /api/assignments` 응답 봉투 — FE `AssignmentsReadResponse`
 * (apps/classbot/hooks/api/read/types.ts)와 정확히 일치해야 한다.
 * 행 형태는 AssignmentRow(FE AssignmentReadRow 1:1) 그대로.
 */
export interface AssignmentsReadResponseDto {
  assignments: AssignmentRow[];
}

/**
 * `GET /api/assignments/:id` 응답 봉투 — FE `AssignmentReadResponse`
 * `{ assignment }` 와 정합. `questions` 는 상위집합 확장(spec §4.5 상세+문항)
 * 으로 FE 기존 소비자는 무시한다. 문항이 없으면 빈 배열(콘텐츠는 M3).
 */
export interface AssignmentDetailResponseDto {
  assignment: AssignmentRow & { questions: AssignmentQuestionRow[] };
}
