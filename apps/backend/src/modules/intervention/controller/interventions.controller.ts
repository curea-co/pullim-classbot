import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type {
  InterventionResponseDto,
  InterventionsReadAllResponseDto,
  InterventionsReadResponseDto,
} from "./dto/intervention-responses.dto";
import { ListInterventionsUseCase } from "../use-cases/list-interventions.use-case";
import { MarkAllInterventionsReadUseCase } from "../use-cases/mark-all-interventions-read.use-case";
import { MarkInterventionReadUseCase } from "../use-cases/mark-intervention-read.use-case";
import { SendInterventionsUseCase } from "../use-cases/send-interventions.use-case";

/**
 * 개입 컨트롤러 — HTTP 처리만 담당, 로직은 use-case 위임 (spec §4.5 패턴).
 * setGlobalPrefix('api') → 실 경로: /api/interventions*
 *
 * 인증: Ph7 과도기 규약(M2 개정 §3) — @Public 으로 전역 JwtAuthGuard 를
 * 우회하되 OptionalJwtAuthGuard 가 JWT 를 시도하고, 실패 시 x-user-id 폴백.
 * 무신원은 서비스가 401 로 거부한다(mock 폴백 폐지).
 * ⚠ Ph7 정리 대상: JWT 전면 적용 시 @Public/Optional 가드 제거.
 */
@Controller("interventions")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class InterventionsController {
  constructor(
    private readonly sendInterventionsUseCase: SendInterventionsUseCase,
    private readonly listInterventionsUseCase: ListInterventionsUseCase,
    private readonly markInterventionReadUseCase: MarkInterventionReadUseCase,
    private readonly markAllInterventionsReadUseCase: MarkAllInterventionsReadUseCase,
  ) {}

  /**
   * `POST /api/interventions` — 교사 발신 (FE 스토어 send 의 실전판).
   * bulk `{ events: [...] }` 가 1차 계약(리마인드 학생별 N건), 단건 객체도
   * 수용. 201 로 생성 이벤트 배열 봉투를 반환한다.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  send(
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    return this.sendInterventionsUseCase.execute(userId, body);
  }

  /** `GET /api/interventions?audience=student` — 요청 학생 인박스(최신순). */
  @Get()
  list(
    @Query("audience") audience: string | undefined,
    @DomainUserId() userId: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    return this.listInterventionsUseCase.execute(audience, userId);
  }

  /**
   * `PATCH /api/interventions/read-all` — 요청 학생의 미읽음 전체 읽음 처리.
   * `{ updated: n }` 반환 (미읽음 없으면 0 — 멱등).
   */
  @Patch("read-all")
  markAllRead(
    @DomainUserId() userId: string | undefined,
  ): Promise<InterventionsReadAllResponseDto> {
    return this.markAllInterventionsReadUseCase.execute(userId);
  }

  /**
   * `PATCH /api/interventions/:id/read` — 수신 학생 본인만(403).
   * read_at 멱등 기록 — 이미 읽음이면 그대로 200.
   */
  @Patch(":id/read")
  markRead(
    @Param("id") id: string,
    @DomainUserId() userId: string | undefined,
  ): Promise<InterventionResponseDto> {
    return this.markInterventionReadUseCase.execute(userId, id);
  }
}
