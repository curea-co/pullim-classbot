import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import jwtConfig from "../../config/jwt.config";
import { ErrorMessages } from "../constants/error-messages.constant";
import { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserRepositoryInterface } from "../../modules/auth/interface/auth-user-repository.interface";

/** Access Token JWT payload 형태. */
interface AccessTokenPayload {
  sub: string;
  type?: string;
  iat?: number;
}

/**
 * Access Token 검증 전략. 본체 pullim JwtStrategy 정렬.
 * type 검증 → DB 사용자 조회 → 비밀번호 변경 이전 발급 토큰 무효화(S-5).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(jwtConfig.KEY)
    jwt: ConfigType<typeof jwtConfig>,
    private readonly userRepository: AuthUserRepositoryInterface,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  /**
   * payload 를 검증하고 사용자를 반환한다(request.user 에 주입).
   * @param payload - 디코딩된 access payload
   * @returns 사용자 엔티티
   * @throws {UnauthorizedException} 토큰 타입 불일치/사용자 없음/비번 변경 이전 토큰
   */
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.type && payload.type !== "access") {
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

    return user;
  }
}
