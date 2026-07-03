import { Module } from "@nestjs/common";

import { MeController } from "./controller/me.controller";
import { MeRepository } from "./infrastructure/me.repository";
import { ME_REPOSITORY_TOKEN } from "./interface/me-repository.interface";
import { MeService } from "./service/me.service";
import { SyncMeUseCase } from "./use-cases/sync-me.use-case";

/**
 * me 도메인 모듈 — SSO 신원 프로비저닝 (M1 spec §2.1).
 * IMeRepository 는 ME_REPOSITORY_TOKEN Symbol 로만 바인딩한다
 * (assignment/classroom/intervention 패턴 미러). 도메인 `users` 테이블
 * 접근은 raw SQL 리포지토리(TypeOrmModule.forRoot 가 전역 등록한
 * DataSource 주입) 하나로 캡슐화한다.
 */
@Module({
  controllers: [MeController],
  providers: [
    {
      provide: ME_REPOSITORY_TOKEN,
      useClass: MeRepository,
    },
    MeService,
    SyncMeUseCase,
  ],
})
export class MeModule {}
