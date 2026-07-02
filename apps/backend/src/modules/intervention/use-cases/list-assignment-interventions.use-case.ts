import { Injectable } from "@nestjs/common";

import type { InterventionsReadResponseDto } from "../controller/dto/intervention-responses.dto";
import { InterventionService } from "../service/intervention.service";

/**
 * 과제별 개입 목록 유즈케이스 — `GET /api/assignments/:id/interventions?type=`
 * (FE useRemindedStudentIds/useAssignmentComment 의 서버판 — 발사 교사만).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class ListAssignmentInterventionsUseCase {
  constructor(private readonly interventionService: InterventionService) {}

  execute(
    userId: string | undefined,
    assignmentId: string,
    type: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    return this.interventionService.listAssignmentInterventions(
      userId,
      assignmentId,
      type,
    );
  }
}
