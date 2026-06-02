import { Injectable } from "@nestjs/common";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthService } from "../service/auth.service";

/**
 * Refresh Token 으로 새 토큰 쌍을 발급하는 use-case (Facade).
 * 사용된 refresh 토큰을 원자적으로 블랙리스트에 등록하여 동시요청 중복 사용을 막는다(rotation).
 */
@Injectable()
export class RefreshUseCase {
  constructor(private readonly authService: AuthService) {}

  /**
   * 새 토큰 쌍을 발급한다.
   * @param user - 토큰 갱신 대상 사용자
   * @param oldRefreshToken - 사용된 refresh 토큰
   * @returns accessToken, refreshToken 쌍
   * @throws {UnauthorizedException} 이미 사용된(블랙리스트) 토큰인 경우
   */
  async execute(
    user: AuthUser,
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    await this.authService.blacklistTokenOrFail(oldRefreshToken);
    return this.authService.generateTokens(user);
  }
}
