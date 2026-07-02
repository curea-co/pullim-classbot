import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  AssignmentQuestionRow,
  AssignmentRow,
  BotRefRow,
  DomainUserRow,
  IAssignmentRepository,
  NewAssignment,
  SubmissionInput,
  SubmissionRow,
  UpsertSubmissionResult,
} from "../interface/assignment-repository.interface";

/** submissions 공통 SELECT 컬럼 (camelCase 별칭) — FE 스토어 Submission 1:1. */
const SUBMISSION_COLUMNS = `
  s."id",
  s."assignment_id" AS "assignmentId",
  s."student_id"    AS "studentId",
  s."submitted_at"  AS "submittedAt",
  s."answers",
  s."score_percent" AS "scorePercent"`;

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
  a."solve_href"        AS "solveHref",
  a."target_student_ids"  AS "targetStudentIds",
  a."dispatched_at"       AS "dispatchedAt",
  a."exam_time_limit_min" AS "examTimeLimitMin",
  a."requiz_question_ids" AS "requizQuestionIds"`;

/** 정렬 — 발사 시각 역순(0002 이전 레거시 null 은 뒤), id 타이브레이커. */
const ASSIGNMENT_ORDER = `ORDER BY a."dispatched_at" DESC NULLS LAST, a."id" DESC`;

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
   * 학생 스코프 — enrolled 봇의 과제 중 (a) 단일 지정 본인(student_id 일치),
   * (b) 다중 지정 포함(target_student_ids jsonb 포함), (c) 전체 대상
   * (student_id·targets 모두 null/빈) 인 행. 정렬은 dispatched_at DESC.
   */
  async findAssignmentsForStudent(studentId: string): Promise<AssignmentRow[]> {
    return this.dataSource.query(
      `SELECT ${ASSIGNMENT_COLUMNS}
       FROM "assignments" a
       WHERE EXISTS (
         SELECT 1 FROM "enrollments" e
         WHERE e."bot_id" = a."bot_id" AND e."student_id" = $1
       )
         AND (
           a."student_id" = $1
           OR a."target_student_ids" @> jsonb_build_array($1::text)
           OR (
             a."student_id" IS NULL
             AND (
               a."target_student_ids" IS NULL
               OR a."target_student_ids" = '[]'::jsonb
             )
           )
         )
       ${ASSIGNMENT_ORDER}`,
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
       ${ASSIGNMENT_ORDER}`,
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

  async findUserById(id: string): Promise<DomainUserRow | null> {
    const rows: DomainUserRow[] = await this.dataSource.query(
      `SELECT "id", "name", "role" FROM "users" WHERE "id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * 과제를 삽입한다. dispatched_at 은 NOW() 기록 후 반환(응답 구성용).
   * id PK 충돌은 DO NOTHING → null (호출부가 id 재생성).
   * jsonb 컬럼은 문자열화해 $n::jsonb 로 바인딩한다(null 은 NULL 그대로).
   */
  async createAssignment(row: NewAssignment): Promise<Date | null> {
    const inserted: Array<{ dispatchedAt: Date }> = await this.dataSource.query(
      `INSERT INTO "assignments"
         ("id", "bot_id", "student_id", "title", "scope", "subject", "grade",
          "chapter_from", "chapter_to", "achievement_codes", "question_count",
          "difficulty", "mode", "scope_override", "source", "assigned_by",
          "assigned_at_label", "due_label", "d_day", "completed_count",
          "recent_accuracy", "state", "reason_hint", "solve_href",
          "target_student_ids", "dispatched_at", "exam_time_limit_min",
          "requiz_question_ids", "created_by")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13,
               $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
               $25::jsonb, NOW(), $26, $27::jsonb, $28)
       ON CONFLICT ("id") DO NOTHING
       RETURNING "dispatched_at" AS "dispatchedAt"`,
      [
        row.id,
        row.botId,
        row.studentId,
        row.title,
        row.scope,
        row.subject,
        row.grade,
        row.chapterFrom,
        row.chapterTo,
        JSON.stringify(row.achievementCodes),
        row.questionCount,
        row.difficulty,
        row.mode,
        row.scopeOverride,
        row.source,
        row.assignedBy,
        row.assignedAtLabel,
        row.dueLabel,
        row.dDay,
        row.completedCount,
        row.recentAccuracy,
        row.state,
        row.reasonHint,
        row.solveHref,
        JSON.stringify(row.targetStudentIds ?? []),
        row.examTimeLimitMin,
        row.requizQuestionIds === null
          ? null
          : JSON.stringify(row.requizQuestionIds),
        row.createdBy,
      ],
    );
    return inserted[0]?.dispatchedAt ?? null;
  }

  /**
   * 제출 멱등 upsert — (assignment_id, student_id) unique 충돌 시 갱신
   * (기존 id 유지, submitted_at NOW() 갱신). `xmax = 0` 은 Postgres 의
   * "이 행이 이번 문장에서 삽입됐는가" 판별 관용구 — created 분기에 쓴다.
   *
   * ⚠ `submissions` 테이블은 Drizzle 스키마 PR(FE 레이어)로 별도 인도
   * (proc/spec/2026-07-03_be-assignment-submissions-ddl.md 의 DDL).
   */
  async upsertSubmission(
    input: SubmissionInput,
  ): Promise<UpsertSubmissionResult> {
    const rows: Array<SubmissionRow & { created: boolean }> =
      await this.dataSource.query(
        `INSERT INTO "submissions" AS s
           ("id", "assignment_id", "student_id", "submitted_at", "answers",
            "score_percent")
         VALUES ($1, $2, $3, NOW(), $4::jsonb, $5)
         ON CONFLICT ("assignment_id", "student_id") DO UPDATE SET
           "submitted_at"  = NOW(),
           "answers"       = EXCLUDED."answers",
           "score_percent" = EXCLUDED."score_percent"
         RETURNING ${SUBMISSION_COLUMNS}, (s.xmax = 0) AS "created"`,
        [
          input.id,
          input.assignmentId,
          input.studentId,
          JSON.stringify(input.answers),
          input.scorePercent,
        ],
      );
    const { created, ...row } = rows[0];
    return { created, row };
  }

  async findSubmissions(assignmentId: string): Promise<SubmissionRow[]> {
    return this.dataSource.query(
      `SELECT ${SUBMISSION_COLUMNS}
       FROM "submissions" s
       WHERE s."assignment_id" = $1
       ORDER BY s."submitted_at" DESC, s."id"`,
      [assignmentId],
    );
  }
}
