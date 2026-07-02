import { Injectable } from "@nestjs/common";

import type { SubmissionsReadResponseDto } from "../controller/dto/assignment-responses.dto";
import { AssignmentService } from "../service/assignment.service";

/**
 * 제출 목록 유즈케이스 — `GET /api/assignments/:id/submissions`
 * (발사 교사 전용 — 제출 현황 시트 소비). 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class ListSubmissionsUseCase {
  constructor(private readonly assignmentService: AssignmentService) {}

  execute(
    userId: string | undefined,
    assignmentId: string,
  ): Promise<SubmissionsReadResponseDto> {
    return this.assignmentService.listSubmissions(userId, assignmentId);
  }
}
