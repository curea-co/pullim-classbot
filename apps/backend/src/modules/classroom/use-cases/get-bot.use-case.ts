import { Injectable } from "@nestjs/common";

import type { BotDetailResponseDto } from "../controller/dto/classroom-responses.dto";
import { ClassroomService } from "../service/classroom.service";

/**
 * 봇 상세 유즈케이스 — `GET /api/bots/:id` (spec §4.2, + curriculum + settings).
 */
@Injectable()
export class GetBotUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(botId: string): Promise<BotDetailResponseDto> {
    return this.classroomService.getBot(botId);
  }
}
