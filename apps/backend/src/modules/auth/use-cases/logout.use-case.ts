import { Injectable } from "@nestjs/common";

import { AuthService } from "../service/auth.service";

/**
 * 로그아웃 use-case (Facade).
 * refresh 토큰을 블랙리스트에 등록한다. access 는 짧은 만료로 자연 소멸한다.
 */
@Injectable()
export class LogoutUseCase {
  constructor(private readonly authService: AuthService) {}

  /**
   * 로그아웃을 수행한다.
   * @param refreshToken - 무효화할 refresh 토큰
   */
  async execute(refreshToken: string): Promise<void> {
    await this.authService.blacklistToken(refreshToken);
  }
}
