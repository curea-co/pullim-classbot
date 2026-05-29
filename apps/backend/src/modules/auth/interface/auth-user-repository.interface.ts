import { EntityManager } from "typeorm";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";

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
