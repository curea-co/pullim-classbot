import type { AssignmentRow } from "../../interface/assignment-repository.interface";

/**
 * `GET /api/assignments` 응답 봉투 — FE `AssignmentsReadResponse`
 * (apps/classbot/hooks/api/read/types.ts)와 정확히 일치해야 한다.
 * 행 형태는 AssignmentRow(FE AssignmentReadRow 1:1) 그대로.
 */
export interface AssignmentsReadResponseDto {
  assignments: AssignmentRow[];
}
