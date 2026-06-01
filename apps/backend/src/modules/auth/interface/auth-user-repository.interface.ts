import { EntityManager } from "typeorm";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";

/**
 * 인증 사용자 저장소 인터페이스(추상). 구현체는 infrastructure 의 TypeORM Adapter.
 * Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class AuthUserRepositoryInterface {
  /**
   * 이메일로 사용자를 조회한다. authProviders 를 함께 로드한다.
   * @param email - 이메일
   * @returns 사용자 또는 null
   */
  abstract findByEmailWithProviders(email: string): Promise<AuthUser | null>;

  /**
   * id 로 사용자를 조회한다.
   * @param id - 사용자 uuid
   * @returns 사용자 또는 null
   */
  abstract findById(id: string): Promise<AuthUser | null>;

  /**
   * 이메일 사용 가능 여부(미존재)를 반환한다.
   * @param email - 이메일
   * @returns 존재하지 않으면 true
   */
  abstract isEmailAvailable(email: string): Promise<boolean>;

  /**
   * 사용자와 EMAIL provider 를 한 트랜잭션으로 생성한다.
   * @param user - 저장할 사용자 엔티티
   * @param provider - 저장할 provider 엔티티(비밀번호 포함)
   * @param manager - 트랜잭션 매니저
   * @returns 저장된 사용자
   */
  abstract createWithProvider(
    user: AuthUser,
    provider: AuthUserProvider,
    manager: EntityManager,
  ): Promise<AuthUser>;

  /**
   * 가입한 인증 사용자에 대응하는 **도메인 `users` 행**을 동일 id 로 프로비저닝한다.
   *
   * 신원 단일화: `auth_users.id`(uuid) 를 정본으로, classbot 도메인(Drizzle `users`,
   * id text PK)에 같은 id 행을 만들어 로그인 사용자가 도메인 FK 주체가 되게 한다.
   * TypeORM 은 도메인 테이블을 소유하지 않으므로(비파괴 제약) raw SQL 로 insert 한다.
   * 같은 id 가 이미 있으면 멱등하게 무시한다(ON CONFLICT DO NOTHING).
   *
   * @param params - 도메인 사용자 id(=auth uuid)/이름/role
   * @param manager - signup 트랜잭션 매니저(원자성 보장)
   */
  abstract provisionDomainUser(
    params: { id: string; name: string; role: UserRole },
    manager: EntityManager,
  ): Promise<void>;

  /**
   * provider 의 실패 횟수를 원자적으로 증가시키고, 한도 도달 시 잠근다.
   * @param providerId - provider 행 id
   */
  abstract incrementFailedLoginCount(providerId: string): Promise<void>;

  /**
   * provider 의 실패 횟수를 초기화한다(잠긴 계정 제외).
   * @param providerId - provider 행 id
   */
  abstract resetFailedLoginCount(providerId: string): Promise<void>;
}
