/**
 * me 도메인 저장소 추상 — SSO 신원 프로비저닝 (M1 spec §2.1).
 *
 * 도메인 `users` 테이블(Drizzle 소유, spec §6.2)은 TypeORM 엔티티를 만들지
 * 않고 raw SQL 로만 접근한다(assignment/classroom/intervention 모듈 패턴
 * 미러). 구현체는 infrastructure/me.repository.ts.
 */

/** 프로비저닝이 수용하는 role — 'parent' 는 SSO sync 경로 밖(400). */
export type SyncRole = "student" | "teacher";

/** 서버가 유효성 검증에 쓸 role 전체 집합. */
export const SYNC_ROLES: readonly SyncRole[] = ["student", "teacher"];

/** 도메인 사용자 한 행 — 응답 { id, name, role } 의 원천. */
export interface MeUserRow {
  /** OS SSO sub(uuid) 를 그대로 도메인 id 로 쓴다 (M1 신원 매핑). */
  id: string;
  name: string;
  /** DB enum 은 parent 포함 — 기존 행 반환 시 그대로 노출한다. */
  role: "student" | "teacher" | "parent";
}

/** 멱등 upsert 입력 — id=sub, name/role 은 검증 완료된 값. */
export interface SyncUserInput {
  id: string;
  name: string;
  role: SyncRole;
}

/** upsert 결과 — created 는 201/200 분기용(이번 문장에서 삽입됐는가). */
export interface UpsertUserResult {
  created: boolean;
  row: MeUserRow;
}

/**
 * me 저장소 추상. Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class IMeRepository {
  /**
   * 도메인 사용자 멱등 upsert — 신규면 삽입, 기존이면 name 만 갱신.
   * **role 은 절대 갱신하지 않는다** — 최초 값 유지(역할 승격 공격 방지,
   * M1 spec §2.1). 재호출의 role 변경 시도는 무시되고 기존 행이 반환된다.
   */
  abstract upsertUser(input: SyncUserInput): Promise<UpsertUserResult>;
}

/** DI 주입 토큰 — assignment 의 ASSIGNMENT_REPOSITORY_TOKEN 패턴 미러. */
export const ME_REPOSITORY_TOKEN = Symbol("ME_REPOSITORY_TOKEN");
