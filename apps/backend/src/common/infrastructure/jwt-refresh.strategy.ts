import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";

import jwtConfig from "../../config/jwt.config";
import { ErrorMessages } from "../constants/error-messages.constant";
import { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserRepositoryInterface } from "../../modules/auth/interface/auth-user-repository.interface";

/** Refresh Token JWT payload 형태. */
interface RefreshTokenPayload {
  sub: string;
  type?: string;
  iat?: number;
}

/**
 * Refresh Token 검증 전략. 본체 pullim JwtRefreshStrategy 정렬.
 * request.user 에 { user, refreshToken } 을 주입하여 refresh use-case 가 토큰을 회수할 수 있게 한다.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    @Inject(jwtConfig.KEY)
    jwt: ConfigType<typeof jwtConfig>,
    private readonly userRepository: AuthUserRepositoryInterface,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
      passReqToCallback: true,
    });
  }

  /**
   * refresh payload 를 검증하고 사용자와 원본 토큰을 반환한다.
   * @param req - HTTP 요청
   * @param payload - 디코딩된 refresh payload
   * @returns { user, refreshToken }
   * @throws {UnauthorizedException} 토큰 타입 불일치/토큰 부재/사용자 없음/비번 변경 이전 토큰
   */
  async validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): Promise<{ user: AuthUser; refreshToken: string }> {
    if (payload.type && payload.type !== "refresh") {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH_UNAUTHORIZED);
    }

    if (user.passwordChangedAt && payload.iat !== undefined) {
      const changedSecond = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat <= changedSecond) {
        throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
      }
    }

    return { user, refreshToken: token };
  }
}
