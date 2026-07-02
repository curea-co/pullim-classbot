import { Injectable } from "@nestjs/common";

import type { JoinCodeResponseDto } from "../controller/dto/classroom-responses.dto";
import { ClassroomService } from "../service/classroom.service";

/**
 * 참여 코드 발급 유즈케이스 — `POST /api/bots/:id/join-codes` (M2 개정 §2).
 * 소유권 검증 + teacher_id 필수 기록은 ClassroomService.issueJoinCode 가 강제.
 */
@Injectable()
export class IssueJoinCodeUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(
    userId: string | undefined,
    botId: string,
    body: unknown,
  ): Promise<JoinCodeResponseDto> {
    return this.classroomService.issueJoinCode(userId, botId, body);
  }
}
