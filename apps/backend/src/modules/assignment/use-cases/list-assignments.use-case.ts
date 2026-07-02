import { Injectable } from "@nestjs/common";

import type { AssignmentsReadResponseDto } from "../controller/dto/assignment-responses.dto";
import { AssignmentService } from "../service/assignment.service";

/**
 * 내 과제 목록 유즈케이스 — `GET /api/assignments?audience=student|teacher`
 * (spec §4.5). 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class ListAssignmentsUseCase {
  constructor(private readonly assignmentService: AssignmentService) {}

  execute(
    audience: string | undefined,
    userId: string | undefined,
  ): Promise<AssignmentsReadResponseDto> {
    return this.assignmentService.listAssignments(audience, userId);
  }
}
