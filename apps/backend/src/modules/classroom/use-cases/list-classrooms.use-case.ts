import { Injectable } from "@nestjs/common";

import type { ClassroomsReadResponseDto } from "../controller/dto/classroom-responses.dto";
import { ClassroomService } from "../service/classroom.service";

/**
 * 내 반 목록 유즈케이스 — `GET /api/classrooms` (spec §4.2).
 */
@Injectable()
export class ListClassroomsUseCase {
  constructor(private readonly classroomService: ClassroomService) {}

  execute(userId: string | undefined): Promise<ClassroomsReadResponseDto> {
    return this.classroomService.listClassrooms(userId);
  }
}
