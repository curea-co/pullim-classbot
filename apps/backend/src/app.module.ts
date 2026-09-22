import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";

/**
 * 클래스봇 백엔드 루트 모듈 — 지금은 health 스켈레톤뿐이다.
 *
 * 인증은 이 앱이 갖지 않는다. 클래스봇은 외부 pullim-os / pullim-api SSO 에
 * 인가를 맡기고, 자체 email/password 스택(구 classbot-local)은 폐기했다.
 * 그 스택만을 위해 있던 TypeORM(auth_* 엔티티 셋)·전역 JwtAuthGuard 도 함께
 * 걷었다 — 남은 엔티티가 없으므로 DB 연결이 더는 부팅 조건이 아니다.
 *
 * ConfigModule 은 .env 를 process.env 로 올려 main.ts 의 PORT·CORS_ORIGIN 이
 * 파일 설정을 읽게 하려고 남긴다.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
})
export class AppModule {}
