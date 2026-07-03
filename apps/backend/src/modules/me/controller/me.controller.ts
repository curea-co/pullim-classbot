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
import type { MeSyncResponseDto } from "./dto/me-responses.dto";
import { SyncMeUseCase } from "../use-cases/sync-me.use-case";

/**
 * me 컨트롤러 — HTTP 처리만 담당, 로직은 use-case 위임 (spec §4.5 패턴).
 * setGlobalPrefix('api') → 실 경로: /api/me/*
 *
 * 인증: Ph7 과도기 규약(M2 개정 §3) — @Public 으로 전역 JwtAuthGuard 를
 * 우회하되 OptionalJwtAuthGuard 가 JWT 를 시도하고, 실패 시 x-user-id 폴백.
 * 무신원은 서비스가 401 로 거부한다(mock 폴백 폐지).
 * ⚠ Ph7 정리 대상: JWT 전면 적용 시 @Public/Optional 가드 제거.
 */
@Controller("me")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class MeController {
  constructor(private readonly syncMeUseCase: SyncMeUseCase) {}

  /**
   * `POST /api/me/sync` — SSO 신원 프로비저닝 (M1 spec §2.1).
   * x-user-id(=OS sub uuid) 신원 + body { name, role } 로 도메인 users
   * 행을 멱등 upsert — 신규 201, 기존(name 갱신·role 유지) 200
   * (submissions upsert 의 201/200 분기 패턴).
   */
  @Post("sync")
  async sync(
    @Body() body: unknown,
    @DomainUserId() userId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeSyncResponseDto> {
    const { created, user } = await this.syncMeUseCase.execute(userId, body);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return user;
  }
}
