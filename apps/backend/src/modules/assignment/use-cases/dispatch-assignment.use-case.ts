import { Injectable } from "@nestjs/common";

import type { AssignmentResponseDto } from "../controller/dto/assignment-responses.dto";
import { AssignmentService } from "../service/assignment.service";

/**
 * 교사 발사 유즈케이스 — `POST /api/assignments` (spec §4.5 출제).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class DispatchAssignmentUseCase {
  constructor(private readonly assignmentService: AssignmentService) {}

  execute(
    userId: string | undefined,
    body: unknown,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentService.dispatchAssignment(userId, body);
  }
}
