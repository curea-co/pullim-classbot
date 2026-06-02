import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 인증 테이블 생성. classbot FE(Drizzle)의 `users` 테이블과 충돌하지 않도록
 * 모두 `auth_` 프리픽스로 분리한다. 이 마이그레이션은 Drizzle 자산을 일절 건드리지 않는다.
 *
 * - auth_users: 인증 사용자 (uuid PK, role student/teacher/admin)
 * - auth_user_providers: 사용자별 인증 제공자 (이메일 비밀번호 보관)
 * - auth_revoked_tokens: 토큰 블랙리스트 (Redis 대체)
 */
export class CreateAuthTables1748476800000 implements MigrationInterface {
  name = "CreateAuthTables1748476800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() 는 pgcrypto 확장에 의존한다. fresh Postgres/CI 에서
    // 첫 run 부터 깨지지 않도록 확장 존재를 명시적으로 보장한다(멱등).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TYPE "auth_users_role_enum" AS ENUM ('student', 'teacher', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "auth_user_providers_provider_enum" AS ENUM ('email', 'kakao', 'naver')
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "role" "auth_users_role_enum" NOT NULL DEFAULT 'student',
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "password_changed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_auth_users" PRIMARY KEY ("id")
      )
    `);
    // soft delete 재가입 허용 — 살아있는 행에 대해서만 이메일 unique.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_auth_users_email_active"
      ON "auth_users" ("email") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_user_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "provider" "auth_user_providers_provider_enum" NOT NULL,
        "provider_id" character varying NOT NULL,
        "password" character varying,
        "user_id" uuid NOT NULL,
        "failed_login_count" integer NOT NULL DEFAULT 0,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_auth_user_providers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_auth_user_providers_user"
          FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE
      )
    `);
    // 동일 사용자 + provider 중복 방지 (살아있는 행 기준).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_auth_user_providers_user_provider_active"
      ON "auth_user_providers" ("user_id", "provider") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_revoked_tokens" (
        "jti" uuid NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_revoked_tokens" PRIMARY KEY ("jti")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_auth_revoked_tokens_expires_at"
      ON "auth_revoked_tokens" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_revoked_tokens"`);
    await queryRunner.query(`DROP TABLE "auth_user_providers"`);
    await queryRunner.query(`DROP TABLE "auth_users"`);
    await queryRunner.query(`DROP TYPE "auth_user_providers_provider_enum"`);
    await queryRunner.query(`DROP TYPE "auth_users_role_enum"`);
  }
}
