import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { AppController } from "./app.controller";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import qgenConfig from "./config/qgen.config";
import { AuthRevokedToken } from "./entities/auth-revoked-token.entity";
import { AuthUser } from "./entities/auth-user.entity";
import { AuthUserProvider } from "./entities/auth-user-provider.entity";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, qgenConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.getOrThrow<string>("database.host"),
        port: configService.getOrThrow<number>("database.port"),
        username: configService.getOrThrow<string>("database.username"),
        password: configService.getOrThrow<string>("database.password"),
        database: configService.getOrThrow<string>("database.name"),
        // 인증 엔티티만 등록 — classbot FE(Drizzle) 테이블은 TypeORM 이 관리하지 않는다.
        entities: [AuthUser, AuthUserProvider, AuthRevokedToken],
        // camelCase 프로퍼티 ↔ snake_case 컬럼 자동 변환 (본체 pullim 정렬).
        namingStrategy: new SnakeNamingStrategy(),
        // 스키마 변경은 마이그레이션으로만. 자동 동기화 금지(Drizzle 자산 보호).
        synchronize: false,
      }),
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // 글로벌 JWT 가드 — 기본 전체 보호, @Public() 만 예외.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
