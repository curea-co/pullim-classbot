import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type {
  BotDetailResponseDto,
  BotsReadResponseDto,
  JoinCodeResponseDto,
} from "./dto/classroom-responses.dto";
import { GetBotUseCase } from "../use-cases/get-bot.use-case";
import { IssueJoinCodeUseCase } from "../use-cases/issue-join-code.use-case";
import { ListBotsUseCase } from "../use-cases/list-bots.use-case";

/**
 * 봇 카탈로그 컨트롤러 — HTTP 처리만 담당, 로직은 use-case 위임 (spec §4.2).
 * setGlobalPrefix('api') → 실 경로: /api/bots*
 *
 * 인증: Ph7 과도기 규약(spec §3·§6.1) — @Public 으로 전역 JwtAuthGuard 를
 * 우회하되 OptionalJwtAuthGuard 가 JWT 를 시도하고, 실패 시 x-user-id 폴백.
 * ⚠ Ph7 정리 대상: JWT 전면 적용 시 @Public/Optional 가드 제거.
 */
@Controller("bots")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class BotsController {
  constructor(
    private readonly listBotsUseCase: ListBotsUseCase,
    private readonly getBotUseCase: GetBotUseCase,
    private readonly issueJoinCodeUseCase: IssueJoinCodeUseCase,
  ) {}

  /** `GET /api/bots?role=student|teacher` — 내 봇 목록. */
  @Get()
  list(
    @Query("role") role: string | undefined,
    @DomainUserId() userId: string | undefined,
  ): Promise<BotsReadResponseDto> {
    return this.listBotsUseCase.execute(role, userId);
  }

  /** `GET /api/bots/:id` — 봇 상세 (+ curriculum + settings). */
  @Get(":id")
  detail(@Param("id") id: string): Promise<BotDetailResponseDto> {
    return this.getBotUseCase.execute(id);
  }

  /**
   * `POST /api/bots/:id/join-codes` — 참여 코드 발급 (M2 개정 §2).
   * 요청 교사가 봇·반 소유자인지 검증하고 teacher_id 를 필수 기록한다.
   */
  @Post(":id/join-codes")
  @HttpCode(HttpStatus.CREATED)
  issueJoinCode(
    @Param("id") botId: string,
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
  ): Promise<JoinCodeResponseDto> {
    return this.issueJoinCodeUseCase.execute(userId, botId, body);
  }
}
