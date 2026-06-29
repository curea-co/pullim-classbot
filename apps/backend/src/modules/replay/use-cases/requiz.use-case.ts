import { Injectable } from "@nestjs/common";

import { ReplayRequizResponseDto } from "../controller/dto/requiz-response.dto";
import { ReplayService } from "../service/replay.service";

/**
 * 재응시 문항 생성 유즈케이스.
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어 — 로직은 ReplayService 에 위임.
 */
@Injectable()
export class RequizUseCase {
  constructor(private readonly replayService: ReplayService) {}

  execute(replayId: string): Promise<ReplayRequizResponseDto> {
    return this.replayService.requiz(replayId);
  }
}
