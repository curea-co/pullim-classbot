/**
 * 무효화 토큰 저장소 인터페이스(추상). Redis 블랙리스트의 DB 대체.
 */
export abstract class RevokedTokenRepositoryInterface {
  /**
   * jti 를 블랙리스트에 등록한다(멱등). logout 용.
   * @param jti - JWT ID
   * @param expiresAt - 원본 토큰 만료 시각
   */
  abstract revoke(jti: string, expiresAt: Date): Promise<void>;

  /**
   * jti 를 원자적으로 1회만 등록한다. 이미 존재하면 false.
   * Refresh rotation 동시요청 중복 사용 방지용.
   * @param jti - JWT ID
   * @param expiresAt - 원본 토큰 만료 시각
   * @returns 이번 호출에서 새로 등록되었으면 true
   */
  abstract revokeOnce(jti: string, expiresAt: Date): Promise<boolean>;

  /**
   * jti 가 블랙리스트에 있는지 확인한다.
   * @param jti - JWT ID
   * @returns 블랙리스트 등록 여부
   */
  abstract isRevoked(jti: string): Promise<boolean>;
}
