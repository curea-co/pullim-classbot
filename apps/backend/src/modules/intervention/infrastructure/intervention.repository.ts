import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  AssignmentRefRow,
  BotRefRow,
  DomainUserRow,
  IInterventionRepository,
  InterventionRow,
  InterventionType,
  NewIntervention,
} from "../interface/intervention-repository.interface";

/** interventions 공통 SELECT 컬럼 (camelCase 별칭) — FE InterventionEvent 1:1. */
const INTERVENTION_COLUMNS = `
  i."id",
  i."type",
  i."bot_id"        AS "botId",
  i."student_id"    AS "studentId",
  i."assignment_id" AS "assignmentId",
  i."created_by"    AS "createdBy",
  i."message",
  i."created_at"    AS "createdAt",
  i."read_at"       AS "readAt"`;

/** 정렬 — 최신순(FE useMyInterventions reverse 재현), id 타이브레이커. */
const INTERVENTION_ORDER = `ORDER BY i."created_at" DESC, i."id" DESC`;

/** 이벤트 한 행의 INSERT 파라미터 수 — id/type/bot/student/assignment/created_by/message. */
const INSERT_PARAMS_PER_ROW = 7;

/** 배치 내 id PK 충돌 신호 — 트랜잭션 롤백 후 호출부(서비스)가 id 재생성. */
class InterventionIdConflictError extends Error {
  constructor() {
    super("intervention id conflict");
  }
}

/**
 * intervention 저장소 — TypeORM DataSource + parameterized raw SQL.
 *
 * 도메인 테이블은 Drizzle(FE) 소유라 TypeORM 엔티티를 만들지 않는다(spec §6.2,
 * assignment/classroom 모듈 패턴). 모든 쿼리는 $n 파라미터 바인딩만 사용한다.
 */
@Injectable()
export class InterventionRepository extends IInterventionRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * 개입 이벤트 일괄 삽입 — **단일 트랜잭션, 전량 아니면 전무**.
   * created_at 은 DB now() 디폴트. id PK 충돌(ON CONFLICT DO NOTHING 으로
   * 삽입 수 부족)이면 롤백 후 null — 호출부가 배치 id 재생성.
   */
  async createInterventions(
    rows: NewIntervention[],
  ): Promise<InterventionRow[] | null> {
    const values: string[] = [];
    const params: unknown[] = [];
    rows.forEach((row, index) => {
      const base = index * INSERT_PARAMS_PER_ROW;
      values.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`,
      );
      params.push(
        row.id,
        row.type,
        row.botId,
        row.studentId,
        row.assignmentId,
        row.createdBy,
        row.message,
      );
    });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const inserted: InterventionRow[] = await manager.query(
          `INSERT INTO "interventions" AS i
             ("id", "type", "bot_id", "student_id", "assignment_id",
              "created_by", "message")
           VALUES ${values.join(", ")}
           ON CONFLICT ("id") DO NOTHING
           RETURNING ${INTERVENTION_COLUMNS}`,
          params,
        );
        if (inserted.length !== rows.length) {
          // 일부 id 가 기존 행과 충돌 — throw 로 트랜잭션 전체 롤백.
          throw new InterventionIdConflictError();
        }
        // RETURNING 순서에 기대지 않고 id 로 입력 순서를 복원한다.
        const byId = new Map(inserted.map((row) => [row.id, row]));
        return rows.map((row) => byId.get(row.id) as InterventionRow);
      });
    } catch (error) {
      if (error instanceof InterventionIdConflictError) {
        return null;
      }
      throw error;
    }
  }

  /** 학생 인박스 — created_at DESC (FE useMyInterventions 최신순). */
  async findInterventionsForStudent(
    studentId: string,
  ): Promise<InterventionRow[]> {
    return this.dataSource.query(
      `SELECT ${INTERVENTION_COLUMNS}
       FROM "interventions" i
       WHERE i."student_id" = $1
       ${INTERVENTION_ORDER}`,
      [studentId],
    );
  }

  async findInterventionById(id: string): Promise<InterventionRow | null> {
    const rows: InterventionRow[] = await this.dataSource.query(
      `SELECT ${INTERVENTION_COLUMNS}
       FROM "interventions" i
       WHERE i."id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  /** read_at 멱등 기록 — null 일 때만 NOW(), 이미 읽음이면 기존 값 유지. */
  async markRead(id: string): Promise<InterventionRow | null> {
    // postgres 드라이버의 UPDATE 반환형은 [rows, affectedCount].
    const result: [InterventionRow[], number] = await this.dataSource.query(
      `UPDATE "interventions" AS i
       SET "read_at" = COALESCE(i."read_at", NOW())
       WHERE i."id" = $1
       RETURNING ${INTERVENTION_COLUMNS}`,
      [id],
    );
    return result[0][0] ?? null;
  }

  /** 학생 미읽음 전체 읽음 처리 — 갱신 행 수 반환 (FE markAllRead). */
  async markAllRead(studentId: string): Promise<number> {
    const result: [unknown[], number] = await this.dataSource.query(
      `UPDATE "interventions"
       SET "read_at" = NOW()
       WHERE "student_id" = $1 AND "read_at" IS NULL`,
      [studentId],
    );
    return result[1] ?? 0;
  }

  /** 과제별 개입 목록 — type null 이면 전체 (interventions_assignment_idx). */
  async findInterventionsForAssignment(
    assignmentId: string,
    type: InterventionType | null,
  ): Promise<InterventionRow[]> {
    return this.dataSource.query(
      `SELECT ${INTERVENTION_COLUMNS}
       FROM "interventions" i
       WHERE i."assignment_id" = $1
         AND ($2::text IS NULL OR i."type" = $2)
       ${INTERVENTION_ORDER}`,
      [assignmentId, type],
    );
  }

  async findBotById(botId: string): Promise<BotRefRow | null> {
    const rows: BotRefRow[] = await this.dataSource.query(
      `SELECT b."id", b."teacher_id" AS "teacherId"
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

  async findAssignmentRefById(id: string): Promise<AssignmentRefRow | null> {
    const rows: AssignmentRefRow[] = await this.dataSource.query(
      `SELECT a."id", a."bot_id" AS "botId"
       FROM "assignments" a
       WHERE a."id" = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
}
