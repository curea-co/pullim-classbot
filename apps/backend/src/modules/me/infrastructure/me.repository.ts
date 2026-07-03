import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import {
  IMeRepository,
  MeUserRow,
  SyncUserInput,
  UpsertUserResult,
} from "../interface/me-repository.interface";

/**
 * me 저장소 — TypeORM DataSource + parameterized raw SQL.
 *
 * 도메인 `users` 테이블은 Drizzle(FE) 소유라 TypeORM 엔티티를 만들지
 * 않는다(spec §6.2, assignment/classroom/intervention 모듈 패턴). 모든
 * 쿼리는 $n 파라미터 바인딩만 사용한다.
 */
@Injectable()
export class MeRepository extends IMeRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * 도메인 사용자 멱등 upsert — auth 의 provisionDomainUser(ON CONFLICT)
   * 확장판. 신규면 삽입(201), 기존이면 **name 만** 갱신(200).
   *
   * ⚠ role 은 의도적으로 DO UPDATE SET 에서 제외한다 — 최초 프로비저닝
   * 값을 영구 유지해, 재호출 body 로 student→teacher 등 **역할 승격을
   * 시도해도 무시**되고 기존 행이 반환된다(M1 spec §2.1 보안 결정).
   *
   * `xmax = 0` 은 Postgres 의 "이 행이 이번 문장에서 삽입됐는가" 판별
   * 관용구 — created(201/200) 분기에 쓴다(assignment upsertSubmission 선례).
   */
  async upsertUser(input: SyncUserInput): Promise<UpsertUserResult> {
    const rows: Array<MeUserRow & { created: boolean }> =
      await this.dataSource.query(
        `INSERT INTO "users" AS u ("id", "name", "role", "profile")
         VALUES ($1, $2, $3, '{}'::jsonb)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name"
         RETURNING u."id", u."name", u."role", (u.xmax = 0) AS "created"`,
        [input.id, input.name, input.role],
      );
    const { created, ...row } = rows[0];
    return { created, row };
  }
}
