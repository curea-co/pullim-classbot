import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { AuthRevokedToken } from "../../../entities/auth-revoked-token.entity";
import { RevokedTokenRepositoryInterface } from "../interface/revoked-token-repository.interface";

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * TypeORM 기반 무효화 토큰 저장소. Redis 블랙리스트의 DB 대체.
 * jti 가 PK 이므로 INSERT 충돌로 원자적 1회 소비를 구현한다.
 */
@Injectable()
export class RevokedTokenRepository extends RevokedTokenRepositoryInterface {
  constructor(
    @InjectRepository(AuthRevokedToken)
    private readonly repository: Repository<AuthRevokedToken>,
  ) {
    super();
  }

  /**
   * jti 를 블랙리스트에 등록한다(멱등). 이미 있으면 무시한다.
   * @param jti - JWT ID
   * @param expiresAt - 원본 토큰 만료 시각
   */
  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(AuthRevokedToken)
      .values({ jti, expiresAt })
      .orIgnore()
      .execute();
  }

  /**
   * jti 를 원자적으로 1회만 등록한다. 이미 존재하면 false.
   * @param jti - JWT ID
   * @param expiresAt - 원본 토큰 만료 시각
   * @returns 이번 호출에서 새로 등록되었으면 true
   */
  async revokeOnce(jti: string, expiresAt: Date): Promise<boolean> {
    try {
      await this.repository.insert({ jti, expiresAt });
      return true;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * jti 가 블랙리스트에 있는지 확인한다.
   * @param jti - JWT ID
   * @returns 블랙리스트 등록 여부
   */
  async isRevoked(jti: string): Promise<boolean> {
    const count = await this.repository.count({ where: { jti } });
    return count > 0;
  }
}
