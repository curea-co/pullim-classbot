import { Injectable } from "@nestjs/common";

import type { InterventionsReadResponseDto } from "../controller/dto/intervention-responses.dto";
import { InterventionService } from "../service/intervention.service";

/**
 * 학생 인박스 유즈케이스 — `GET /api/interventions?audience=student`
 * (FE useMyInterventions 최신순의 서버판).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class ListInterventionsUseCase {
  constructor(private readonly interventionService: InterventionService) {}

  execute(
    audience: string | undefined,
    userId: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    return this.interventionService.listInterventions(audience, userId);
  }
}
