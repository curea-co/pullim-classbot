import { Injectable } from "@nestjs/common";

import type { BotDetailResponseDto } from "../controller/dto/classroom-responses.dto";
import { ClassroomService } from "../service/classroom.service";

/**
 * 봇 상세 유즈케이스 — `GET /api/bots/:id` (spec §4.2, + curriculum + settings).
 * 접근 스코프(소유 교사 또는 enrolled 학생만)는 ClassroomService.getBot 이 강제.
 */
@Injectable()
export class GetBotUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(
    botId: string,
    userId: string | undefined,
  ): Promise<BotDetailResponseDto> {
    return this.classroomService.getBot(botId, userId);
  }
}
