import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { AuthUser } from "../../entities/auth-user.entity";
import jwtConfig from "../../config/jwt.config";
import { TokenProvider } from "../interfaces/token-provider.interface";

/**
 * Passport/JWT 기반 토큰 발급기. 본체 pullim PassportTokenProvider 정렬.
 * access/refresh 각각 고유 jti 를 부여하여 블랙리스트로 회수 가능하게 한다.
 */
@Injectable()
export class PassportTokenProvider extends TokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {
    super();
  }

  /**
   * Access Token + Refresh Token 쌍을 생성한다.
   * @param user - 토큰을 발급할 사용자 엔티티
   * @returns accessToken, refreshToken 쌍
   */
  generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: "access",
        jti: randomUUID(),
      },
      { expiresIn: this.jwt.expiration },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh", jti: randomUUID() },
      { expiresIn: this.jwt.refreshExpiration },
    );

    return { accessToken, refreshToken };
  }
}
