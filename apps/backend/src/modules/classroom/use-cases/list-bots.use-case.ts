import { Injectable } from "@nestjs/common";

import type { BotsReadResponseDto } from "../controller/dto/classroom-responses.dto";
import { ClassroomService } from "../service/classroom.service";

/**
 * 내 봇 목록 유즈케이스 — `GET /api/bots?role=student|teacher` (spec §4.2).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class ListBotsUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(
    role: string | undefined,
    userId: string | undefined,
  ): Promise<BotsReadResponseDto> {
    return this.classroomService.listBots(role, userId);
  }
}
