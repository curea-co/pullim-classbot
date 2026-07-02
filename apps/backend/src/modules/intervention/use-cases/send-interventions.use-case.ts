import { Injectable } from "@nestjs/common";

import type { InterventionsReadResponseDto } from "../controller/dto/intervention-responses.dto";
import { InterventionService } from "../service/intervention.service";

/**
 * 교사 발신 유즈케이스 — `POST /api/interventions`
 * (FE 스토어 send 의 실전판 — bulk { events: [...] } 1차 계약, 단건도 수용).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class SendInterventionsUseCase {
  constructor(private readonly interventionService: InterventionService) {}

  execute(
    userId: string | undefined,
    body: unknown,
  ): Promise<InterventionsReadResponseDto> {
    return this.interventionService.sendInterventions(userId, body);
  }
}
