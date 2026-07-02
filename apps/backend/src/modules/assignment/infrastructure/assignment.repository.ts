import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  AssignmentQuestionRow,
  AssignmentRow,
  BotRefRow,
  IAssignmentRepository,
} from "../interface/assignment-repository.interface";

/** assignments 공통 SELECT 컬럼 (camelCase 별칭) — FE AssignmentReadRow 1:1. */
const ASSIGNMENT_COLUMNS = `
  a."id",
  a."bot_id"            AS "botId",
  a."student_id"        AS "studentId",
  a."title",
  a."scope",
  a."subject",
  a."grade",
  a."chapter_from"      AS "chapterFrom",
  a."chapter_to"        AS "chapterTo",
  a."achievement_codes" AS "achievementCodes",
  a."question_count"    AS "questionCount",
  a."difficulty",
  a."mode",
  a."scope_override"    AS "scopeOverride",
  a."source",
  a."assigned_by"       AS "assignedBy",
  a."assigned_at_label" AS "assignedAtLabel",
  a."due_label"         AS "dueLabel",
  a."d_day"             AS "dDay",
  a."completed_count"   AS "completedCount",
  a."recent_accuracy"   AS "recentAccuracy",
  a."state",
  a."reason_hint"       AS "reasonHint",
  a."solve_href"        AS "solveHref"`;

/**
 * assignment 저장소 — TypeORM DataSource + parameterized raw SQL.
 *
 * 도메인 테이블은 Drizzle(FE) 소유라 TypeORM 엔티티를 만들지 않는다(spec §6.2,
 * classroom 모듈 패턴). 모든 쿼리는 $n 파라미터 바인딩만 사용한다.
 */
@Injectable()
export class AssignmentRepository extends IAssignmentRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * 학생 스코프 — enrolled 봇의 과제 중 전체 대상(student_id NULL)이거나
   * 본인 지정(student_id = 학생)인 행. 정렬은 id DESC(기존 FE Stage 1 라우트
   * 정합 — assignments 에 created_at 컬럼이 없어 id 가 유일한 정렬 키).
   */
  async findAssignmentsForStudent(studentId: string): Promise<AssignmentRow[]> {
    return this.dataSource.query(
      `SELECT ${ASSIGNMENT_COLUMNS}
       FROM "assignments" a
       WHERE EXISTS (
         SELECT 1 FROM "enrollments" e
         WHERE e."bot_id" = a."bot_id" AND e."student_id" = $1
       )
         AND (a."student_id" IS NULL OR a."student_id" = $1)
       ORDER BY a."id" DESC`,
      [studentId],
    );
  }

  /** 교사 스코프 — 소유 봇(class_bots.teacher_id)의 과제 전체. */
  async findAssignmentsForTeacher(teacherId: string): Promise<AssignmentRow[]> {
    return this.dataSource.query(
      `SELECT ${ASSIGNMENT_COLUMNS}
       FROM "assignments" a
       INNER JOIN "class_bots" b ON b."id" = a."bot_id"
       WHERE b."teacher_id" = $1
       ORDER BY a."id" DESC`,
      [teacherId],
    );
  }

  async findAssignmentById(id: string): Promise<AssignmentRow | null> {
    const rows: AssignmentRow[] = await this.dataSource.query(
      `SELECT ${ASSIGNMENT_COLUMNS}
       FROM "assignments" a
       WHERE a."id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** 과제 문항 — "order" 오름차순 (assignment_questions_order_uq). */
  async findQuestions(assignmentId: string): Promise<AssignmentQuestionRow[]> {
    return this.dataSource.query(
      `SELECT
         q."id",
         q."assignment_id" AS "assignmentId",
         q."order",
         q."type",
         q."prompt",
         q."options",
         q."answer_index"  AS "answerIndex",
         q."answer_key"    AS "answerKey",
         q."model_answer"  AS "modelAnswer",
         q."hints"
       FROM "assignment_questions" q
       WHERE q."assignment_id" = $1
       ORDER BY q."order"`,
      [assignmentId],
    );
  }

  async findBotById(botId: string): Promise<BotRefRow | null> {
    const rows: BotRefRow[] = await this.dataSource.query(
      `SELECT
         b."id",
         b."name",
         b."teacher_id" AS "teacherId",
         b."subject",
         b."grade"
       FROM "class_bots" b
       WHERE b."id" = $1`,
      [botId],
    );
    return rows[0] ?? null;
  }

  async hasEnrollment(botId: string, studentId: string): Promise<boolean> {
    const rows: Array<{ exists: boolean }> = await this.dataSource.query(
      `SELECT TRUE AS "exists"
       FROM "enrollments"
       WHERE "bot_id" = $1 AND "student_id" = $2`,
      [botId, studentId],
    );
    return rows.length > 0;
  }
}
