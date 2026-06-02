import { Exclude, Expose } from "class-transformer";
import { Column, Entity, ManyToOne } from "typeorm";

import { BaseModel } from "../common/entities/base.model";
import { AuthProvider } from "./enums/auth-provider.enum";
import { AuthUser } from "./auth-user.entity";

/**
 * 사용자별 인증 제공자. 본체 pullim UserAuthProvider 정렬.
 * 비밀번호를 user 가 아닌 provider 테이블에 두어 소셜 확장(KAKAO/NAVER)을 대비한다.
 * (EMAIL provider 만 password/failedLoginCount/lockedAt 을 사용)
 */
@Entity("auth_user_providers")
export class AuthUserProvider extends BaseModel {
  @Column({
    type: "enum",
    enum: AuthProvider,
    comment: "인증 제공자 (email/kakao/naver)",
  })
  @Expose()
  provider: AuthProvider;

  @Column({ comment: "제공자별 고유 식별자 (이메일 제공자는 이메일 주소)" })
  @Expose()
  providerId: string;

  @Exclude()
  @Column({
    type: "varchar",
    nullable: true,
    comment: "해싱된 비밀번호 (이메일 제공자만, bcrypt+pepper)",
  })
  password: string | null;

  @ManyToOne(() => AuthUser, (user) => user.authProviders, {
    onDelete: "CASCADE",
  })
  @Exclude()
  user: AuthUser;

  @Column({ type: "uuid", comment: "사용자 FK" })
  @Expose()
  userId: string;

  @Column({
    type: "int",
    default: 0,
    comment: "연속 로그인 실패 횟수 (이메일 제공자만)",
  })
  @Exclude()
  failedLoginCount: number;

  @Column({
    type: "timestamptz",
    nullable: true,
    comment: "계정 잠금 시점 (null이면 잠금 아님, 이메일 제공자만)",
  })
  @Exclude()
  lockedAt: Date | null;

  /**
   * 인증 제공자를 생성한다.
   * @param params - 제공자/식별자/해시 비밀번호/사용자
   * @returns 새 AuthUserProvider 인스턴스
   */
  static create(params: {
    provider: AuthProvider;
    providerId: string;
    password?: string | null;
    user: AuthUser;
  }): AuthUserProvider {
    const entity = new AuthUserProvider();
    entity.provider = params.provider;
    entity.providerId = params.providerId;
    entity.password = params.password ?? null;
    entity.user = params.user;
    entity.failedLoginCount = 0;
    entity.lockedAt = null;
    return entity;
  }
}
