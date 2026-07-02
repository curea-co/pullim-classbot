import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type { EnrollmentResponseDto } from "./dto/classroom-responses.dto";
import { JoinByCodeUseCase } from "../use-cases/join-by-code.use-case";

/**
 * 학생 코드 참여 컨트롤러 — `POST /api/enrollments` (M2 개정 §2).
 * 인증은 Ph7 과도기 규약(JWT → x-user-id 폴백) — bots.controller 와 동일.
 */
@Controller("enrollments")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly joinByCodeUseCase: JoinByCodeUseCase) {}

  /**
   * body { code } → join_codes 해석 → enrollment upsert.
   * 신규 201, 이미 등록(멱등) 200. 무효 코드 404 봉투.
   */
  @Post()
  async join(
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<EnrollmentResponseDto> {
    const { created, enrollment } = await this.joinByCodeUseCase.execute(
      userId,
      body,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return enrollment;
  }
}
