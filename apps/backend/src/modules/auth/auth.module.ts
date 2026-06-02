import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import jwtConfig from "../../config/jwt.config";
import { JwtRefreshStrategy } from "../../common/infrastructure/jwt-refresh.strategy";
import { JwtStrategy } from "../../common/infrastructure/jwt.strategy";
import { PassportTokenProvider } from "../../common/infrastructure/passport-token.provider";
import { TokenProvider } from "../../common/interfaces/token-provider.interface";
import { AuthRevokedToken } from "../../entities/auth-revoked-token.entity";
import { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserProvider } from "../../entities/auth-user-provider.entity";
import { AuthController } from "./controller/auth.controller";
import { AuthUserRepository } from "./infrastructure/auth-user.repository";
import { RevokedTokenRepository } from "./infrastructure/revoked-token.repository";
import { AuthUserRepositoryInterface } from "./interface/auth-user-repository.interface";
import { RevokedTokenRepositoryInterface } from "./interface/revoked-token-repository.interface";
import { AuthService } from "./service/auth.service";
import { CheckEmailUseCase } from "./use-cases/check-email.use-case";
import { LoginUseCase } from "./use-cases/login.use-case";
import { LogoutUseCase } from "./use-cases/logout.use-case";
import { RefreshUseCase } from "./use-cases/refresh.use-case";
import { SignupUseCase } from "./use-cases/signup.use-case";

/**
 * 인증 모듈. 본체 pullim AuthModule 정렬(clean architecture + Passport/JWT).
 * Repository Interface ↔ 구현체는 provide/useClass 로 바인딩한다.
 */
@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    TypeOrmModule.forFeature([AuthUser, AuthUserProvider, AuthRevokedToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("jwt.secret"),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: TokenProvider, useClass: PassportTokenProvider },
    {
      provide: AuthUserRepositoryInterface,
      useClass: AuthUserRepository,
    },
    {
      provide: RevokedTokenRepositoryInterface,
      useClass: RevokedTokenRepository,
    },
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    SignupUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    CheckEmailUseCase,
  ],
  exports: [AuthService],
})
export class AuthModule {}
