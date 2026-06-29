import { Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";

import { ReplayRequizResponseDto } from "./dto/requiz-response.dto";
import { RequizUseCase } from "../use-cases/requiz.use-case";

/**
 * 리플레이(재응시) 컨트롤러 — HTTP/Param 처리만 담당하고 모든 로직은 use-case 에 위임한다.
 * 글로벌 JwtAuthGuard 가 적용되어 있으므로 학생 인증이 자동으로 강제됨.
 * setGlobalPrefix('api') → 실 경로: POST /api/replay/:id/requiz
 */
@Controller("replay")
export class ReplayController {
  constructor(private readonly requizUseCase: RequizUseCase) {}

  @Post(":id/requiz")
  @HttpCode(HttpStatus.OK)
  requiz(@Param("id") id: string): Promise<ReplayRequizResponseDto> {
    return this.requizUseCase.execute(id);
  }
}
