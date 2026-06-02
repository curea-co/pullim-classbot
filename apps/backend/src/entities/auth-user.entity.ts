import { Exclude, Expose } from "class-transformer";
import { Column, Entity, OneToMany } from "typeorm";

import { BaseModel } from "../common/entities/base.model";
import { UserRole } from "./enums/user-role.enum";
import { AuthUserProvider } from "./auth-user-provider.entity";

/**
 * 인증 사용자 엔티티. 본체 pullim User 정렬(uuid PK, BaseModel, name/email/role/isEmailVerified).
 *
 * 테이블명을 `auth_users` 로 분리한 이유:
 * classbot FE(Drizzle)가 이미 `users` 테이블(id text PK, ~17 FK, seed 24행)을 소유 중이므로
 * 비파괴 공존을 위해 네임스페이스를 분리한다. `auth_users` ↔ `users` 통합은 plan 의
 * Drizzle→TypeORM 이전 단계(D2~D4)에서 수행한다.
 */
@Entity("auth_users")
export class AuthUser extends BaseModel {
  @Column({ comment: "회원 이름" })
  @Expose()
  name: string;

  @Column({
    comment: "이메일 (로그인 식별자, unique index는 마이그레이션에서 관리)",
  })
  @Expose()
  email: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.STUDENT,
    comment: "역할 (student/teacher/admin)",
  })
  @Expose()
  role: UserRole;

  @Column({
    type: "boolean",
    default: false,
    comment: "이메일 인증 완료 여부",
  })
  @Expose()
  isEmailVerified: boolean;

  @Column({
    type: "timestamptz",
    nullable: true,
    comment: "마지막 비밀번호 변경 시각 (이전 발급 토큰 무효화 기준, S-5)",
  })
  @Exclude()
  passwordChangedAt: Date | null;

  @OneToMany(() => AuthUserProvider, (provider) => provider.user, {
    cascade: true,
  })
  @Exclude()
  authProviders: AuthUserProvider[];

  /**
   * 인증 사용자 엔티티를 생성한다. (비밀번호는 provider 에 별도 저장)
   * @param params - 이름/이메일/역할
   * @returns 새 AuthUser 인스턴스
   */
  static create(params: {
    name: string;
    email: string;
    role?: UserRole;
  }): AuthUser {
    const user = new AuthUser();
    user.name = params.name;
    user.email = params.email;
    user.role = params.role ?? UserRole.STUDENT;
    user.isEmailVerified = false;
    user.passwordChangedAt = null;
    return user;
  }
}
