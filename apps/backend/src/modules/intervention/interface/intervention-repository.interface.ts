/**
 * intervention 도메인 저장소 추상 — interventions (스키마 PR #194).
 *
 * 도메인 테이블(Drizzle 소유, spec §6.2)은 TypeORM 엔티티를 만들지 않고
 * raw SQL 로만 접근한다(assignment/classroom 모듈 패턴 미러). 구현체는
 * infrastructure/intervention.repository.ts.
 */

/** 개입 타입 — FE `InterventionType`(lib/store/interventions.ts) 1:1. */
export type InterventionType = "remind" | "requiz" | "comment" | "crisis";

/** 서버가 유효성 검증에 쓸 타입 전체 집합. */
export const INTERVENTION_TYPES: readonly InterventionType[] = [
  "remind",
  "requiz",
  "comment",
  "crisis",
];

/**
 * 개입 이벤트 한 행 — FE `InterventionEvent`
 * (apps/classbot/lib/store/interventions.ts, 개입 spec §3)의 서버판.
 *
 * FE 와의 차이(상위집합):
 * - `assignmentId` — FE 는 optional, DB 는 nullable(crisis 는 null).
 * - `createdBy` — 발신 경로는 항상 기록하는 schema 계약(교사 identity 구분은
 *   후속이지만 감사 추적은 지금부터).
 */
export interface InterventionRow {
  id: string;
  type: InterventionType;
  /** 클래스(봇) 스코프 — enrollment 스코프와 동일 문법. */
  botId: string;
  /** 수신 학생 — 제출/결과와 동일 조인 키. */
  studentId: string;
  /** remind/comment 는 대상 과제, requiz 는 새로 발사된 과제 id. crisis 는 null. */
  assignmentId: string | null;
  /** 발신 교사 — 발신 경로는 항상 기록(schema 계약). FK SET NULL 로 null 가능. */
  createdBy: string | null;
  /** 인박스에 그대로 표시할 문구 — 발신 시점에 완성해 저장(조인 불필요). */
  message: string;
  createdAt: Date;
  readAt: Date | null;
}

/** 개입 신규 입력 — createdAt 은 DB now(), readAt 은 null 이 원천이라 제외. */
export type NewIntervention = Omit<InterventionRow, "createdAt" | "readAt">;

/** 봇 참조 한 행 — 소유 검증용 (assignment BotRefRow 축소판). */
export interface BotRefRow {
  id: string;
  teacherId: string | null;
}

/** 과제 참조 한 행 — 존재·소유 봇 판정용. */
export interface AssignmentRefRow {
  id: string;
  botId: string;
}

/** 도메인 사용자 한 행 (역할 검증용 — assignment DomainUserRow 미러). */
export interface DomainUserRow {
  id: string;
  name: string;
  role: "student" | "teacher" | "parent";
}

/**
 * intervention 저장소 추상. Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class IInterventionRepository {
  /**
   * 개입 이벤트 일괄 삽입 — **전량 성공 아니면 전량 롤백**(FE 리마인드가
   * 학생별 N건을 하나의 발신으로 보내는 계약). created_at 은 DB NOW().
   * @returns 삽입된 행(입력 순서 보존). id PK 충돌이면 null — 호출부가 id 재생성
   */
  abstract createInterventions(
    rows: NewIntervention[],
  ): Promise<InterventionRow[] | null>;
  /** 학생 인박스 — created_at DESC(id DESC 타이브레이커), FE useMyInterventions 의 서버판. */
  abstract findInterventionsForStudent(
    studentId: string,
  ): Promise<InterventionRow[]>;
  abstract findInterventionById(id: string): Promise<InterventionRow | null>;
  /**
   * 읽음 기록 — read_at 이 null 일 때만 NOW() 기록(COALESCE 멱등).
   * 이미 읽음이면 기존 read_at 그대로 반환한다.
   * @returns 갱신(또는 기존) 행. 행이 없으면 null
   */
  abstract markRead(id: string): Promise<InterventionRow | null>;
  /**
   * 학생의 미읽음 전체 읽음 처리 — FE markAllRead 의 서버판.
   * @returns 갱신된 행 수
   */
  abstract markAllRead(studentId: string): Promise<number>;
  /**
   * 과제별 개입 목록 — created_at DESC. type 지정 시 그 타입만
   * (FE useRemindedStudentIds/useAssignmentComment 의 서버판).
   */
  abstract findInterventionsForAssignment(
    assignmentId: string,
    type: InterventionType | null,
  ): Promise<InterventionRow[]>;
  abstract findBotById(botId: string): Promise<BotRefRow | null>;
  /** 학생이 그 봇에 enrolled 인지 — 발신 대상 검증(400). */
  abstract hasEnrollment(botId: string, studentId: string): Promise<boolean>;
  abstract findUserById(id: string): Promise<DomainUserRow | null>;
  abstract findAssignmentRefById(id: string): Promise<AssignmentRefRow | null>;
}

/** DI 주입 토큰 — assignment 의 ASSIGNMENT_REPOSITORY_TOKEN 패턴 미러. */
export const INTERVENTION_REPOSITORY_TOKEN = Symbol(
  "INTERVENTION_REPOSITORY_TOKEN",
);
