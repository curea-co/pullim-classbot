import { Injectable } from "@nestjs/common";

import type { InterventionsReadAllResponseDto } from "../controller/dto/intervention-responses.dto";
import { InterventionService } from "../service/intervention.service";

/**
 * 전체 읽음 처리 유즈케이스 — `PATCH /api/interventions/read-all`
 * (FE markAllRead 의 실전판 — 요청 학생의 미읽음 전체).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class MarkAllInterventionsReadUseCase {
  constructor(private readonly interventionService: InterventionService) {}

  execute(
    userId: string | undefined,
  ): Promise<InterventionsReadAllResponseDto> {
    return this.interventionService.markAllRead(userId);
  }
}
