import { Injectable } from "@nestjs/common";

import type { JoinByCodeResult } from "../service/classroom.service";
import { ClassroomService } from "../service/classroom.service";

/**
 * 학생 코드 참여 유즈케이스 — `POST /api/enrollments` (M2 개정 §2).
 */
@Injectable()
export class JoinByCodeUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(
    userId: string | undefined,
    body: unknown,
  ): Promise<JoinByCodeResult> {
    return this.classroomService.joinByCode(userId, body);
  }
}
