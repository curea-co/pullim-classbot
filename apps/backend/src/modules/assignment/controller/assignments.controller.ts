import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type { AssignmentsReadResponseDto } from "./dto/assignment-responses.dto";
import { ListAssignmentsUseCase } from "../use-cases/list-assignments.use-case";

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
  ) {}

  /** `GET /api/assignments?audience=student|teacher` — 내 과제 목록. */
  @Get()
  list(
    @Query("audience") audience: string | undefined,
    @DomainUserId() userId: string | undefined,
  ): Promise<AssignmentsReadResponseDto> {
    return this.listAssignmentsUseCase.execute(audience, userId);
  }
}
