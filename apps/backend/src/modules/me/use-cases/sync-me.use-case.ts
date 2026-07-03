import { Injectable } from "@nestjs/common";

import { MeService, SyncMeResult } from "../service/me.service";

/**
 * SSO 신원 프로비저닝 유즈케이스 — `POST /api/me/sync` (M1 spec §2.1).
 * 컨트롤러와 서비스 사이의 얇은 오케스트레이션 레이어.
 */
@Injectable()
export class SyncMeUseCase {
  constructor(private readonly meService: MeService) {}

  execute(userId: string | undefined, body: unknown): Promise<SyncMeResult> {
    return this.meService.syncMe(userId, body);
  }
}
