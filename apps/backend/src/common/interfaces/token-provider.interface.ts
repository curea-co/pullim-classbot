import { AuthUser } from "../../entities/auth-user.entity";

/**
 * 토큰 발급 추상화. DI 토큰 겸 인터페이스 역할.
 * 서브도메인 병합 시 구현체만 교체(예: 다른 서명 전략)할 수 있도록 경계를 둔다.
 */
export abstract class TokenProvider {
  /**
   * Access Token + Refresh Token 쌍을 생성한다.
   * @param user - 토큰을 발급할 사용자 엔티티
   * @returns accessToken, refreshToken 쌍
   */
  abstract generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  };
}
