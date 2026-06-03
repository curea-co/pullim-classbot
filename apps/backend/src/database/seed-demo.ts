import "reflect-metadata";

import { hashText } from "../common/utils/crypto.util";
import { AuthProvider } from "../entities/enums/auth-provider.enum";
import { UserRole } from "../entities/enums/user-role.enum";
import AppDataSource from "./data-source";

/**
 * 데모 로그인 계정 시드 (plan Phase 7 — D1 로그인월).
 *
 * 배경: D1 로 익명 mock 접근이 제거돼, 데모도 **시드된 계정으로 로그인**해야 한다.
 * 그런데 도메인 시드의 서연(student_001)은 도메인 `users` 행만 있고 인증 자격이
 * 없어 로그인할 수 없다(auth_users.id 는 uuid, 도메인 users.id 는 text).
 *
 * 이 스크립트는 **로그인 가능한 데모 계정**을 멱등하게 만든다:
 *  1) auth_users + auth_user_providers(EMAIL, bcrypt+pepper 해시) — 실제 로그인 경로.
 *  2) 같은 uuid 로 도메인 users 행 — 신원 단일화(D2)와 동일한 링크.
 *  3) 데모 읽기용 도메인 데이터(enrollments 5건 + assignment 1건)를 그 uuid 명의로 부여.
 *     (도메인 전체 시드는 classbot `scripts/seed.ts` 가 student_001 명의로 별도 적재한다.
 *      여기서는 "로그인한 데모 계정이 실제로 읽을 것"이 있게 하는 최소 데이터만 둔다.)
 *
 * 멱등성: 고정 uuid + ON CONFLICT DO NOTHING. 반복 실행해도 행이 중복되지 않는다.
 *
 * 실행(예):
 *   DATABASE_PORT=5447 JWT_SECRET=... PASSWORD_PEPPER=... \
 *   bunx ts-node apps/backend/src/database/seed-demo.ts
 *
 * 선행 조건: TypeORM 마이그레이션(auth 테이블) + Drizzle 마이그레이션(도메인 테이블) +
 * classbot seed(class_bots/classrooms 등 FK 대상)가 먼저 적용돼 있어야 한다.
 */

/** 데모 계정 고정 식별자(멱등 시드 키). auth_users.id == 도메인 users.id. */
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_EMAIL = "demo.student@pullim.test";
const DEMO_PASSWORD = "DemoPass123!";
const DEMO_NAME = "서연(데모)";

async function main(): Promise<void> {
  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) {
    throw new Error(
      "PASSWORD_PEPPER 가 설정되지 않았습니다(백엔드와 동일 값 필요).",
    );
  }

  await AppDataSource.initialize();
  const hashed = await hashText(DEMO_PASSWORD, pepper);

  await AppDataSource.transaction(async (manager) => {
    // 1) auth_users — 로그인 주체.
    await manager.query(
      `INSERT INTO "auth_users" ("id", "name", "email", "role")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("id") DO NOTHING`,
      [DEMO_USER_ID, DEMO_NAME, DEMO_EMAIL, UserRole.STUDENT],
    );

    // 2) EMAIL provider — 비밀번호(bcrypt+pepper) 자격.
    await manager.query(
      `INSERT INTO "auth_user_providers" ("provider", "provider_id", "password", "user_id")
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM "auth_user_providers"
         WHERE "user_id" = $4 AND "provider" = $1 AND "deleted_at" IS NULL
       )`,
      [AuthProvider.EMAIL, DEMO_EMAIL, hashed, DEMO_USER_ID],
    );

    // 3) 도메인 users — 신원 단일화(같은 uuid). signup 과 동일한 비파괴 upsert.
    await manager.query(
      `INSERT INTO "users" ("id", "name", "role", "profile")
       VALUES ($1, $2, $3, '{}'::jsonb)
       ON CONFLICT ("id") DO NOTHING`,
      [DEMO_USER_ID, DEMO_NAME, UserRole.STUDENT],
    );

    // 4) 데모 읽기 데이터 — 시드된 봇/반에 데모 계정을 enrolled 로(서연 enrollment 복제).
    await manager.query(
      `INSERT INTO "enrollments"
         ("bot_id", "student_id", "classroom_id", "classroom_label", "assigned_by", "assigned_at", "via")
       SELECT "bot_id", $1, "classroom_id", "classroom_label", "assigned_by", "assigned_at", "via"
       FROM "enrollments" WHERE "student_id" = 'student_001'
       ON CONFLICT ("bot_id", "student_id") DO NOTHING`,
      [DEMO_USER_ID],
    );

    // 데모 과제 1건 — 봇 cb_001 이 있을 때만(FK 안전).
    await manager.query(
      `INSERT INTO "assignments"
         ("id","bot_id","student_id","title","scope","subject","grade","chapter_from","chapter_to",
          "question_count","difficulty","mode","source","assigned_by","assigned_at_label","due_label",
          "d_day","state","solve_href")
       SELECT 'as_demo_'||$1,'cb_001',$1,'도함수 활용 마무리','미적분 III · 극값~변곡점','수학Ⅱ','고2',
          '미적분 III · 극값','미적분 III · 변곡점',20,'중','practice','teacher-assigned','수학이 형',
          '오늘 19:50','내일 22:00','D-1','todo','/classbot/assignment/as_demo/solve'
       WHERE EXISTS (SELECT 1 FROM "class_bots" WHERE "id" = 'cb_001')
       ON CONFLICT ("id") DO NOTHING`,
      [DEMO_USER_ID],
    );
  });

  console.log(
    `[seed-demo] 데모 계정 준비 완료 — email=${DEMO_EMAIL} password=${DEMO_PASSWORD} id=${DEMO_USER_ID}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed-demo] FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (AppDataSource.isInitialized) {
      void AppDataSource.destroy();
    }
  });
