import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * 무효화된(블랙리스트) 토큰. 본체 pullim 은 Redis(setnx/getdel)로 블랙리스트를 관리하지만,
 * classbot 백엔드에는 Redis 가 없으므로 DB 테이블로 대체한다.
 *
 * jti(JWT ID)를 PK 로 두어 INSERT 충돌로 원자적 1회 소비를 보장한다(Refresh rotation 안전).
 * expiresAt 경과 행의 정리(GC)는 향후 배치로 수행한다(GATED).
 */
@Entity("auth_revoked_tokens")
export class AuthRevokedToken {
  @PrimaryColumn({ type: "uuid", comment: "무효화된 토큰의 jti" })
  jti: string;

  @Column({
    type: "timestamptz",
    comment: "원본 토큰 만료 시각 (이 시각 이후 GC 대상)",
  })
  expiresAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  revokedAt: Date;

  /**
   * 무효화 토큰 레코드를 생성한다.
   * @param jti - JWT ID
   * @param expiresAt - 원본 토큰 만료 시각
   * @returns 새 AuthRevokedToken 인스턴스
   */
  static create(jti: string, expiresAt: Date): AuthRevokedToken {
    const entity = new AuthRevokedToken();
    entity.jti = jti;
    entity.expiresAt = expiresAt;
    return entity;
  }
}
