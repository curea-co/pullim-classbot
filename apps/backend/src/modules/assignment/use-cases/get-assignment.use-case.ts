import { Injectable } from "@nestjs/common";

import type { AssignmentDetailResponseDto } from "../controller/dto/assignment-responses.dto";
import { AssignmentService } from "../service/assignment.service";

/**
 * 과제 상세 유즈케이스 — `GET /api/assignments/:id` (spec §4.5, 상세 + 문항).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class GetAssignmentUseCase {
  constructor(private readonly assignmentService: AssignmentService) {}

  execute(
    id: string,
    userId: string | undefined,
  ): Promise<AssignmentDetailResponseDto> {
    return this.assignmentService.getAssignment(id, userId);
  }
}
