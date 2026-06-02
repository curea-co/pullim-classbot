import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";

import { MAX_LOGIN_ATTEMPTS } from "../../../common/constants/security.constant";
import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

/** TypeORM 기반 인증 사용자 저장소 구현. */
@Injectable()
export class AuthUserRepository extends AuthUserRepositoryInterface {
  constructor(
    @InjectRepository(AuthUser)
    private readonly userRepository: Repository<AuthUser>,
    @InjectRepository(AuthUserProvider)
    private readonly providerRepository: Repository<AuthUserProvider>,
  ) {
    super();
  }

  /**
   * 이메일로 사용자를 조회한다. authProviders 를 함께 로드한다.
   * @param email - 이메일
   * @returns 사용자 또는 null
   */
  async findByEmailWithProviders(email: string): Promise<AuthUser | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { authProviders: true },
    });
  }

  /**
   * id 로 사용자를 조회한다.
   * @param id - 사용자 uuid
   * @returns 사용자 또는 null
   */
  async findById(id: string): Promise<AuthUser | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 이메일 사용 가능 여부(미존재)를 반환한다.
   * @param email - 이메일
   * @returns 존재하지 않으면 true
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const count = await this.userRepository.count({ where: { email } });
    return count === 0;
  }

  /**
   * 사용자와 EMAIL provider 를 한 트랜잭션으로 생성한다.
   * @param user - 저장할 사용자 엔티티
   * @param provider - 저장할 provider 엔티티(비밀번호 포함)
   * @param manager - 트랜잭션 매니저
   * @returns 저장된 사용자
   */
  async createWithProvider(
    user: AuthUser,
    provider: AuthUserProvider,
    manager: EntityManager,
  ): Promise<AuthUser> {
    const savedUser = await manager.save(AuthUser, user);
    provider.userId = savedUser.id;
    provider.user = savedUser;
    await manager.save(AuthUserProvider, provider);
    return savedUser;
  }

  /**
   * 가입한 인증 사용자에 대응하는 도메인 `users` 행을 동일 id 로 프로비저닝한다.
   * TypeORM 은 도메인 테이블을 소유하지 않으므로(비파괴) raw SQL 로 insert 하고,
   * 같은 id 가 이미 있으면 멱등하게 무시한다(ON CONFLICT DO NOTHING).
   * @param params - 도메인 사용자 id(=auth uuid)/이름/role(student|teacher)
   * @param manager - signup 트랜잭션 매니저(원자성 보장)
   */
  async provisionDomainUser(
    params: { id: string; name: string; role: UserRole },
    manager: EntityManager,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO "users" ("id", "name", "role", "profile")
       VALUES ($1, $2, $3, '{}'::jsonb)
       ON CONFLICT ("id") DO NOTHING`,
      [params.id, params.name, params.role],
    );
  }

  /**
   * provider 의 실패 횟수를 원자적으로 증가시키고, 한도 도달 시 잠근다.
   * DB atomic UPDATE 로 동시성 안전을 보장한다(본체 패턴).
   * @param providerId - provider 행 id
   */
  async incrementFailedLoginCount(providerId: string): Promise<void> {
    await this.providerRepository
      .createQueryBuilder()
      .update(AuthUserProvider)
      .set({
        failedLoginCount: () => "failed_login_count + 1",
        lockedAt: () =>
          `CASE WHEN failed_login_count + 1 >= ${MAX_LOGIN_ATTEMPTS} THEN NOW() ELSE locked_at END`,
      })
      .where("id = :id", { id: providerId })
      .execute();
  }

  /**
   * provider 의 실패 횟수를 초기화한다(잠긴 계정 제외 — 잠금 해제는 비번 재설정으로만).
   * @param providerId - provider 행 id
   */
  async resetFailedLoginCount(providerId: string): Promise<void> {
    await this.providerRepository
      .createQueryBuilder()
      .update(AuthUserProvider)
      .set({ failedLoginCount: 0 })
      .where("id = :id", { id: providerId })
      .andWhere("locked_at IS NULL")
      .execute();
  }
}
