import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type {
  AssignmentDetailResponseDto,
  AssignmentsReadResponseDto,
  SubmissionResponseDto,
  SubmissionsReadResponseDto,
} from "./dto/assignment-responses.dto";
import type { AssignmentRow } from "../interface/assignment-repository.interface";
import { DispatchAssignmentUseCase } from "../use-cases/dispatch-assignment.use-case";
import { GetAssignmentUseCase } from "../use-cases/get-assignment.use-case";
import { ListAssignmentsUseCase } from "../use-cases/list-assignments.use-case";
import { ListSubmissionsUseCase } from "../use-cases/list-submissions.use-case";
import { SubmitAssignmentUseCase } from "../use-cases/submit-assignment.use-case";

/**
 * 과제 컨트롤러 — HTTP 처리만 담당, 로직은 use-case 위임 (spec §4.5).
 * setGlobalPrefix('api') → 실 경로: /api/assignments*
 *
 * 인증: Ph7 과도기 규약(M2 개정 §3) — @Public 으로 전역 JwtAuthGuard 를
 * 우회하되 OptionalJwtAuthGuard 가 JWT 를 시도하고, 실패 시 x-user-id 폴백.
 * 무신원은 서비스가 401 로 거부한다(mock 폴백 폐지).
 * ⚠ Ph7 정리 대상: JWT 전면 적용 시 @Public/Optional 가드 제거.
 */
@Controller("assignments")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class AssignmentsController {
  constructor(
    private readonly listAssignmentsUseCase: ListAssignmentsUseCase,
    private readonly getAssignmentUseCase: GetAssignmentUseCase,
    private readonly dispatchAssignmentUseCase: DispatchAssignmentUseCase,
    private readonly submitAssignmentUseCase: SubmitAssignmentUseCase,
    private readonly listSubmissionsUseCase: ListSubmissionsUseCase,
  ) {}

  /** `GET /api/assignments?audience=student|teacher` — 내 과제 목록. */
  @Get()
  list(
    @Query("audience") audience: string | undefined,
    @DomainUserId() userId: string | undefined,
  ): Promise<AssignmentsReadResponseDto> {
    return this.listAssignmentsUseCase.execute(audience, userId);
  }

  /**
   * `GET /api/assignments/:id` — 과제 상세(+문항).
   * 대상 학생 또는 발사 교사만 200, 그 외 403.
   */
  @Get(":id")
  detail(
    @Param("id") id: string,
    @DomainUserId() userId: string | undefined,
  ): Promise<AssignmentDetailResponseDto> {
    return this.getAssignmentUseCase.execute(id, userId);
  }

  /**
   * `POST /api/assignments` — 교사 발사 (spec §4.5 출제).
   * 요청 교사가 봇 소유자인지 검증하고 서버가 id 를 생성해 201 로
   * 생성 row(FE AssignmentReadRow 형태)를 반환한다.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  dispatch(
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
  ): Promise<AssignmentRow> {
    return this.dispatchAssignmentUseCase.execute(userId, body);
  }

  /**
   * `POST /api/assignments/:id/submissions` — 학생 제출.
   * 같은 (assignment, student) 는 멱등 upsert — 신규 201, 갱신 200
   * (enrollments 컨트롤러의 201/200 분기 패턴).
   */
  @Post(":id/submissions")
  async submit(
    @Param("id") assignmentId: string,
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SubmissionResponseDto> {
    const { created, submission } = await this.submitAssignmentUseCase.execute(
      userId,
      assignmentId,
      body,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return submission;
  }

  /**
   * `GET /api/assignments/:id/submissions` — 제출 목록 (발사 교사 전용).
   */
  @Get(":id/submissions")
  listSubmissions(
    @Param("id") assignmentId: string,
    @DomainUserId() userId: string | undefined,
  ): Promise<SubmissionsReadResponseDto> {
    return this.listSubmissionsUseCase.execute(userId, assignmentId);
  }
}
