import { Injectable } from "@nestjs/common";

import { LoginDto } from "../controller/dto/login.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

/**
 * 이메일/비밀번호 로그인 use-case (Facade).
 * 사용자 조회 → 잠금/비번 검증 → 실패카운트 갱신 → 토큰 발급을 조합한다.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: AuthUserRepositoryInterface,
  ) {}

  /**
   * 로그인을 수행한다.
   * @param dto - 로그인 요청 데이터
   * @returns accessToken, refreshToken 쌍
   */
  async execute(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rawUser = await this.userRepository.findByEmailWithProviders(
      dto.email,
    );
    const { user, emailProvider } =
      this.authService.findEmailLoginUserOrFail(rawUser);
    this.authService.validateLoginPreConditions(emailProvider);

    try {
      await this.authService.verifyPasswordOrFail(emailProvider, dto.password);
    } catch (error) {
      await this.userRepository.incrementFailedLoginCount(emailProvider.id);
      throw error;
    }

    await this.userRepository.resetFailedLoginCount(emailProvider.id);

    return this.authService.generateTokens(user);
  }
}
