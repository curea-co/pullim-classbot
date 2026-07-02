import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";

import { DomainUserId } from "../../../common/decorators/domain-user-id.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import type { InterventionsReadResponseDto } from "./dto/intervention-responses.dto";
import { ListAssignmentInterventionsUseCase } from "../use-cases/list-assignment-interventions.use-case";

/**
 * 과제별 개입 컨트롤러 — `/api/assignments/:id/interventions`.
 *
 * 라우팅 prefix 는 assignments 지만 **intervention 모듈 소속**이다
 * (도메인 응집 — assignment 모듈 컨트롤러에 넣지 않는다). Nest 는 모듈이
 * 달라도 같은 prefix 의 컨트롤러를 공존시킨다.
 *
 * 인증: Ph7 과도기 규약(M2 개정 §3) — interventions.controller 와 동일.
 */
@Controller("assignments")
@Public()
@UseGuards(OptionalJwtAuthGuard)
export class AssignmentInterventionsController {
  constructor(
    private readonly listAssignmentInterventionsUseCase: ListAssignmentInterventionsUseCase,
  ) {}

  /**
   * `GET /api/assignments/:id/interventions?type=remind` — 발사 교사만(403).
   * 과제별 개입 목록 — 리마인드 dedup·코멘트 존재 확인용
   * (FE useRemindedStudentIds/useAssignmentComment 의 서버판).
   */
  @Get(":id/interventions")
  list(
    @Param("id") assignmentId: string,
    @Query("type") type: string | undefined,
    @DomainUserId() userId: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    return this.listAssignmentInterventionsUseCase.execute(
      userId,
      assignmentId,
      type,
    );
  }
}
