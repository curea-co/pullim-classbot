import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type {
  ClassroomsReadResponseDto,
  EnrollmentResponseDto,
} from "./dto/classroom-responses.dto";
import { AssignEnrollmentUseCase } from "../use-cases/assign-enrollment.use-case";
import { ListClassroomsUseCase } from "../use-cases/list-classrooms.use-case";

/**
 * 반 컨트롤러 (spec §4.2 — `GET /api/classrooms`, `POST /api/classrooms/:id/enrollments`).
 * 인증은 Ph7 과도기 규약(JWT → x-user-id 폴백) — bots.controller 와 동일.
 */
@Controller("classrooms")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class ClassroomsController {
  constructor(
    private readonly listClassroomsUseCase: ListClassroomsUseCase,
    private readonly assignEnrollmentUseCase: AssignEnrollmentUseCase,
  ) {}

  /** `GET /api/classrooms` — 요청 교사의 반 목록. */
  @Get()
  list(
    @DomainUserId() userId: string | undefined,
  ): Promise<ClassroomsReadResponseDto> {
    return this.listClassroomsUseCase.execute(userId);
  }

  /**
   * `POST /api/classrooms/:id/enrollments` — 교사 직접 배정 (코드 참여와 병존).
   * body { studentId, botId }. 신규 201, 이미 배정(멱등) 200.
   */
  @Post(":id/enrollments")
  async assign(
    @Param("id") classroomId: string,
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EnrollmentResponseDto> {
    const { created, enrollment } = await this.assignEnrollmentUseCase.execute(
      userId,
      classroomId,
      body,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return enrollment;
  }
}
