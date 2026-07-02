import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  BotRow,
  ClassroomRow,
  CurriculumUnitRow,
  DomainUserRow,
  EnrolledBotRow,
  EnrollmentRow,
  IClassroomRepository,
  JoinCodeRow,
  NewEnrollment,
  NewJoinCode,
} from "../interface/classroom-repository.interface";

/** class_bots 공통 SELECT 컬럼 (camelCase 별칭). */
const BOT_COLUMNS = `
  b."id",
  b."name",
  b."avatar_emoji"   AS "avatarEmoji",
  b."teacher_id"     AS "teacherId",
  b."teacher_name"   AS "teacherName",
  b."organization",
  b."subject",
  b."grade",
  b."tone",
  b."greeting",
  b."scope",
  b."is_live"        AS "isLive",
  b."current_lesson" AS "currentLesson",
  b."quick_prompts"  AS "quickPrompts",
  b."enrolled_count" AS "enrolledCount",
  b."created_at"     AS "createdAt"`;

/**
 * classroom 저장소 — TypeORM DataSource + parameterized raw SQL.
 *
 * 도메인 테이블은 Drizzle(FE) 소유라 TypeORM 엔티티를 만들지 않는다(spec §6.2,
 * auth 의 provisionDomainUser 패턴). 모든 쿼리는 $n 파라미터 바인딩만 사용한다.
 */
@Injectable()
export class ClassroomRepository extends IClassroomRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /** 학생의 enrollments ⋈ class_bots — FE BotReadRow 형태 그대로 select. */
  async findEnrolledBots(studentId: string): Promise<EnrolledBotRow[]> {
    return this.dataSource.query(
      `SELECT
         b."id",
         b."name",
         b."avatar_emoji"    AS "avatarEmoji",
         b."teacher_name"    AS "teacherName",
         b."organization",
         b."subject",
         b."grade",
         b."tone",
         b."greeting",
         b."scope",
         b."is_live"         AS "isLive",
         b."current_lesson"  AS "currentLesson",
         b."quick_prompts"   AS "quickPrompts",
         b."enrolled_count"  AS "enrolledCount",
         e."classroom_id"    AS "classroomId",
         e."classroom_label" AS "classroomLabel",
         e."assigned_by"     AS "assignedBy",
         e."via"
       FROM "enrollments" e
       INNER JOIN "class_bots" b ON b."id" = e."bot_id"
       WHERE e."student_id" = $1
       ORDER BY e."assigned_at" DESC, b."id"`,
      [studentId],
    );
  }

  async findOwnedBots(teacherId: string): Promise<BotRow[]> {
    return this.dataSource.query(
      `SELECT ${BOT_COLUMNS}
       FROM "class_bots" b
       WHERE b."teacher_id" = $1
       ORDER BY b."created_at" DESC, b."id"`,
      [teacherId],
    );
  }

  async findBotById(botId: string): Promise<BotRow | null> {
    const rows: BotRow[] = await this.dataSource.query(
      `SELECT ${BOT_COLUMNS}
       FROM "class_bots" b
       WHERE b."id" = $1`,
      [botId],
    );
    return rows[0] ?? null;
  }

  async findCurriculumUnits(botId: string): Promise<CurriculumUnitRow[]> {
    return this.dataSource.query(
      `SELECT
         "id",
         "label",
         "full_path"         AS "fullPath",
         "achievement_codes" AS "achievementCodes"
       FROM "bot_curriculum_units"
       WHERE "bot_id" = $1
       ORDER BY "id"`,
      [botId],
    );
  }

  async findBotSettings(
    botId: string,
  ): Promise<Record<string, unknown> | null> {
    const rows: Array<{ settings: Record<string, unknown> }> =
      await this.dataSource.query(
        `SELECT "settings" FROM "bot_settings" WHERE "bot_id" = $1`,
        [botId],
      );
    return rows[0]?.settings ?? null;
  }

  async findClassroomsByTeacher(teacherId: string): Promise<ClassroomRow[]> {
    return this.dataSource.query(
      `SELECT "id", "label", "organization", "teacher_id" AS "teacherId"
       FROM "classrooms"
       WHERE "teacher_id" = $1
       ORDER BY "id"`,
      [teacherId],
    );
  }

  async findClassroomById(id: string): Promise<ClassroomRow | null> {
    const rows: ClassroomRow[] = await this.dataSource.query(
      `SELECT "id", "label", "organization", "teacher_id" AS "teacherId"
       FROM "classrooms"
       WHERE "id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findUserById(id: string): Promise<DomainUserRow | null> {
    const rows: DomainUserRow[] = await this.dataSource.query(
      `SELECT "id", "name", "role" FROM "users" WHERE "id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findJoinCode(code: string): Promise<JoinCodeRow | null> {
    const rows: JoinCodeRow[] = await this.dataSource.query(
      `SELECT
         "code",
         "bot_id"       AS "botId",
         "classroom_id" AS "classroomId",
         "teacher_id"   AS "teacherId",
         "created_at"   AS "createdAt"
       FROM "join_codes"
       WHERE "code" = $1`,
      [code],
    );
    return rows[0] ?? null;
  }

  async findEnrollment(
    botId: string,
    studentId: string,
  ): Promise<EnrollmentRow | null> {
    const rows: EnrollmentRow[] = await this.dataSource.query(
      `SELECT
         "bot_id"          AS "botId",
         "student_id"      AS "studentId",
         "classroom_id"    AS "classroomId",
         "classroom_label" AS "classroomLabel",
         "assigned_by"     AS "assignedBy",
         "assigned_at"     AS "assignedAt",
         "via"
       FROM "enrollments"
       WHERE "bot_id" = $1 AND "student_id" = $2`,
      [botId, studentId],
    );
    return rows[0] ?? null;
  }

  /**
   * enrollment 삽입 + enrolled_count 증가를 단일 트랜잭션으로 수행한다.
   * PK(bot_id, student_id) 충돌은 멱등 처리(null 반환, 카운트 미증가).
   */
  async createEnrollment(row: NewEnrollment): Promise<Date | null> {
    return this.dataSource.transaction(async (manager) => {
      const inserted: Array<{ assignedAt: Date }> = await manager.query(
        `INSERT INTO "enrollments"
           ("bot_id", "student_id", "classroom_id", "classroom_label",
            "assigned_by", "assigned_at", "via")
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT ("bot_id", "student_id") DO NOTHING
         RETURNING "assigned_at" AS "assignedAt"`,
        [
          row.botId,
          row.studentId,
          row.classroomId,
          row.classroomLabel,
          row.assignedBy,
          row.via,
        ],
      );
      if (inserted.length === 0) {
        return null;
      }
      await manager.query(
        `UPDATE "class_bots"
         SET "enrolled_count" = "enrolled_count" + 1
         WHERE "id" = $1`,
        [row.botId],
      );
      return inserted[0].assignedAt;
    });
  }

  /**
   * 참여 코드를 삽입한다. teacher_id 는 NOT NULL 입력만 받는다(M2 개정 §1 —
   * 발급 경로의 NULL teacher_id 금지는 타입(NewJoinCode.teacherId: string)으로 강제).
   */
  async createJoinCode(row: NewJoinCode): Promise<Date | null> {
    const inserted: Array<{ createdAt: Date }> = await this.dataSource.query(
      `INSERT INTO "join_codes" ("code", "bot_id", "classroom_id", "teacher_id")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("code") DO NOTHING
       RETURNING "created_at" AS "createdAt"`,
      [row.code, row.botId, row.classroomId, row.teacherId],
    );
    return inserted[0]?.createdAt ?? null;
  }
}
