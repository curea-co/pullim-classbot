import { Injectable } from "@nestjs/common";

import type { JoinByCodeResult } from "../service/classroom.service";
import { ClassroomService } from "../service/classroom.service";

/**
 * 교사 직접 배정 유즈케이스 — `POST /api/classrooms/:id/enrollments` (spec §4.2).
 * 코드 참여(join-by-code)와 병존하는 교사 진입점 — 소유권 검증 + 멱등 upsert
 * 는 ClassroomService.assignEnrollment 가 강제.
 */
@Injectable()
export class AssignEnrollmentUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(
    userId: string | undefined,
    classroomId: string,
    body: unknown,
  ): Promise<JoinByCodeResult> {
    return this.classroomService.assignEnrollment(userId, classroomId, body);
  }
}
