import { Controller, Get, UseGuards } from "@nestjs/common";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type { ClassroomsReadResponseDto } from "./dto/classroom-responses.dto";
import { ListClassroomsUseCase } from "../use-cases/list-classrooms.use-case";

/**
 * 반 목록 컨트롤러 (spec §4.2 — `GET /api/classrooms`).
 * 인증은 Ph7 과도기 규약(JWT → x-user-id 폴백) — bots.controller 와 동일.
 */
@Controller("classrooms")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class ClassroomsController {
  constructor(private readonly listClassroomsUseCase: ListClassroomsUseCase) {}

  /** `GET /api/classrooms` — 요청 교사의 반 목록. */
  @Get()
  list(
    @DomainUserId() userId: string | undefined,
  ): Promise<ClassroomsReadResponseDto> {
    return this.listClassroomsUseCase.execute(userId);
  }
}
