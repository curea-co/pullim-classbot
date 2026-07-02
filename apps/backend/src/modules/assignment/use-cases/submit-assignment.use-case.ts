import { Injectable } from "@nestjs/common";

import {
  AssignmentService,
  SubmitAssignmentResult,
} from "../service/assignment.service";

/**
 * 학생 제출 유즈케이스 — `POST /api/assignments/:id/submissions`
 * (FE recordSubmission 의 실전판 — 같은 (assignment, student) 멱등 upsert).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class SubmitAssignmentUseCase {
  constructor(private readonly assignmentService: AssignmentService) {}

  execute(
    userId: string | undefined,
    assignmentId: string,
    body: unknown,
  ): Promise<SubmitAssignmentResult> {
    return this.assignmentService.submitAssignment(userId, assignmentId, body);
  }
}
