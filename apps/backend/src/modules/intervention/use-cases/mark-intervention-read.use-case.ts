import { Injectable } from "@nestjs/common";

import type { InterventionResponseDto } from "../controller/dto/intervention-responses.dto";
import { InterventionService } from "../service/intervention.service";

/**
 * 읽음 처리 유즈케이스 — `PATCH /api/interventions/:id/read`
 * (FE markRead 의 실전판 — 수신 학생 본인만, read_at 멱등).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class MarkInterventionReadUseCase {
  constructor(private readonly interventionService: InterventionService) {}

  execute(
    userId: string | undefined,
    id: string,
  ): Promise<InterventionResponseDto> {
    return this.interventionService.markRead(userId, id);
  }
}
