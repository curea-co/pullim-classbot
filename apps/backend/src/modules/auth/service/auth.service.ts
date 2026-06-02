import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { MAX_LOGIN_ATTEMPTS } from "../../../common/constants/security.constant";
import { TokenProvider } from "../../../common/interfaces/token-provider.interface";
import { hashText, verifyHash } from "../../../common/utils/crypto.util";
import {
  extractJtiAndExpiry,
  DecodedTokenPayload,
} from "../../../common/utils/token.util";
import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { RevokedTokenRepositoryInterface } from "../interface/revoked-token-repository.interface";

/**
 * 인증 도메인 비즈니스 로직 + 토큰 발급/검증. 본체 pullim AuthService 정렬.
 * 모든 예외는 이 레이어에서만 throw 한다(Controller/UseCase 에서 throw 금지).
 */
@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenProvider: TokenProvider,
    private readonly jwtService: JwtService,
    private readonly revokedTokenRepository: RevokedTokenRepositoryInterface,
  ) {
    this.pepper = this.configService.getOrThrow<string>("PASSWORD_PEPPER");
  }

  /**
   * 비밀번호와 비밀번호 확인의 일치를 검증한다.
   * @param password - 비밀번호
   * @param passwordConfirm - 비밀번호 확인
   * @throws {BadRequestException} 불일치
   */
  validatePasswordConfirm(password: string, passwordConfirm: string): void {
    if (password !== passwordConfirm) {
      throw new BadRequestException(ErrorMessages.AUTH_PASSWORD_MISMATCH);
    }
  }

  /**
   * 비밀번호를 bcrypt+pepper 로 해싱한다.
   * @param password - 평문 비밀번호
   * @returns 해시 문자열
   */
  async hashPassword(password: string): Promise<string> {
    return hashText(password, this.pepper);
  }

  /**
   * 이메일 로그인용 사용자와 EMAIL provider 를 검증하여 반환한다.
   * 계정 열거 방지를 위해 사용자/제공자 부재를 동일 에러로 처리한다.
   * @param user - authProviders 가 로드된 사용자(null 가능)
   * @returns user 와 emailProvider
   * @throws {UnauthorizedException} 사용자 없음 또는 EMAIL provider 없음
   */
  findEmailLoginUserOrFail(user: AuthUser | null): {
    user: AuthUser;
    emailProvider: AuthUserProvider;
  } {
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
    }
    const emailProvider = user.authProviders?.find(
      (provider) => provider.provider === AuthProvider.EMAIL,
    );
    if (!emailProvider) {
      throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
    }
    return { user, emailProvider };
  }

  /**
   * 로그인 사전 조건(계정 잠금)을 검증한다.
   * @param emailProvider - EMAIL provider
   * @throws {ForbiddenException} 계정 잠금
   */
  validateLoginPreConditions(emailProvider: AuthUserProvider): void {
    if (emailProvider.lockedAt) {
      throw new ForbiddenException(ErrorMessages.AUTH_ACCOUNT_LOCKED);
    }
  }

  /**
   * 비밀번호 일치 여부를 반환한다(예외 없음).
   * @param emailProvider - EMAIL provider
   * @param password - 평문 비밀번호
   * @returns 일치 여부
   */
  async isPasswordMatch(
    emailProvider: AuthUserProvider,
    password: string,
  ): Promise<boolean> {
    if (!emailProvider.password) {
      return false;
    }
    return verifyHash(password, emailProvider.password, this.pepper);
  }

  /**
   * 비밀번호 검증 실패 시 예외를 던진다. 한도 도달 시 잠금 에러로 구분한다.
   * @param emailProvider - EMAIL provider
   * @param password - 평문 비밀번호
   * @throws {UnauthorizedException} 비밀번호 불일치
   * @throws {ForbiddenException} 한도 도달
   */
  async verifyPasswordOrFail(
    emailProvider: AuthUserProvider,
    password: string,
  ): Promise<void> {
    const isMatch = await this.isPasswordMatch(emailProvider, password);
    if (isMatch) {
      return;
    }
    const nextCount = emailProvider.failedLoginCount + 1;
    if (nextCount >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(ErrorMessages.AUTH_ACCOUNT_LOCKED);
    }
    throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
  }

  /**
   * Access + Refresh 토큰 쌍을 생성한다.
   * @param user - 토큰을 발급할 사용자
   * @returns accessToken, refreshToken 쌍
   */
  generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    return this.tokenProvider.generateTokens(user);
  }

  /**
   * 토큰을 블랙리스트에 등록한다(멱등). logout 용.
   * @param token - 무효화할 JWT
   */
  async blacklistToken(token: string): Promise<void> {
    const { jti, expiresAt } = this.decodeOrFail(token);
    await this.revokedTokenRepository.revoke(jti, expiresAt);
  }

  /**
   * 토큰을 원자적으로 1회만 블랙리스트에 등록한다. 이미 등록된 경우 예외.
   * Refresh rotation 동시요청 중복 사용을 차단한다(본체 setnx 대체).
   * @param token - 무효화할 JWT
   * @throws {UnauthorizedException} 이미 블랙리스트에 등록된 경우
   */
  async blacklistTokenOrFail(token: string): Promise<void> {
    const { jti, expiresAt } = this.decodeOrFail(token);
    const wasSet = await this.revokedTokenRepository.revokeOnce(jti, expiresAt);
    if (!wasSet) {
      throw new UnauthorizedException(ErrorMessages.AUTH_TOKEN_BLACKLISTED);
    }
  }

  /**
   * 토큰이 블랙리스트에 있는지 확인하고, 있으면 예외를 던진다.
   * @param token - 확인할 JWT
   * @throws {UnauthorizedException} 블랙리스트 등록된 경우
   */
  async validateTokenNotBlacklisted(token: string): Promise<void> {
    const { jti } = this.decodeOrFail(token);
    if (await this.revokedTokenRepository.isRevoked(jti)) {
      throw new UnauthorizedException(ErrorMessages.AUTH_TOKEN_BLACKLISTED);
    }
  }

  /**
   * JWT 를 디코드하여 jti/만료 시각을 추출한다(서명 검증은 Guard 가 수행).
   * @param token - JWT
   * @returns jti 와 만료 시각
   * @throws {UnauthorizedException} jti 추출 실패
   */
  private decodeOrFail(token: string): { jti: string; expiresAt: Date } {
    try {
      const payload = this.jwtService.decode<DecodedTokenPayload | null>(token);
      return extractJtiAndExpiry(payload);
    } catch {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }
  }
}
