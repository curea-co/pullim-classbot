import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { QgenClient } from "./infrastructure/qgen.client";
import { QGEN_CLIENT_TOKEN } from "./interface/qgen-client.interface";
import { ReplayController } from "./controller/replay.controller";
import { ReplayService } from "./service/replay.service";
import { RequizUseCase } from "./use-cases/requiz.use-case";

/**
 * 리플레이(재응시) 모듈.
 * IQgenClient 는 QGEN_CLIENT_TOKEN Symbol 로만 바인딩한다 — 이중 토큰 위험 제거.
 * ConfigModule 은 글로벌(app.module) 이지만 forFeature 없이도 주입 가능.
 * 명시적 import 로 의존 관계를 문서화한다.
 */
@Module({
  imports: [ConfigModule],
  controllers: [ReplayController],
  providers: [
    { provide: QGEN_CLIENT_TOKEN, useClass: QgenClient },
    ReplayService,
    RequizUseCase,
  ],
})
export class ReplayModule {}
