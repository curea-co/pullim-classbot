/**
 * classroom 도메인 저장소 추상 — bots / classrooms / enrollments / join_codes.
 *
 * 도메인 테이블(Drizzle 소유, spec §6.2)은 TypeORM 엔티티를 만들지 않고
 * raw SQL 로만 접근한다. 구현체는 infrastructure/classroom.repository.ts.
 */

/** 학생 시점 봇 목록 한 행 — FE `BotReadRow`(hooks/api/read/types.ts)와 1:1. */
export interface EnrolledBotRow {
  id: string;
  name: string;
  avatarEmoji: string;
  teacherName: string;
  organization: string;
  subject: string;
  grade: string;
  tone: string;
  greeting: string;
  scope: number;
  isLive: boolean;
  currentLesson: Record<string, unknown> | null;
  quickPrompts: Array<{ text: string; expectedReplyKey: string }>;
  enrolledCount: number;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  via: string;
}

/** 봇 마스터 한 행 (교사 목록 · 상세 공용). */
export interface BotRow {
  id: string;
  name: string;
  avatarEmoji: string;
  teacherId: string | null;
  teacherName: string;
  organization: string;
  subject: string;
  grade: string;
  tone: string;
  greeting: string;
  scope: number;
  isLive: boolean;
  currentLesson: Record<string, unknown> | null;
  quickPrompts: Array<{ text: string; expectedReplyKey: string }>;
  enrolledCount: number;
  createdAt: Date;
}

/** 봇별 커리큘럼 단원 한 행. */
export interface CurriculumUnitRow {
  id: string;
  label: string;
  fullPath: string;
  achievementCodes: string[];
}

/** 반 한 행. */
export interface ClassroomRow {
  id: string;
  label: string;
  organization: string;
  teacherId: string | null;
}

/** 도메인 사용자 한 행 (역할 검증용). */
export interface DomainUserRow {
  id: string;
  name: string;
  role: "student" | "teacher" | "parent";
}

/** 참여 코드 한 행. */
export interface JoinCodeRow {
  code: string;
  botId: string;
  classroomId: string;
  teacherId: string | null;
  createdAt: Date;
}

/** enrollment 한 행. */
export interface EnrollmentRow {
  botId: string;
  studentId: string;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  assignedAt: Date;
  via: string;
}

/** enrollment 신규 입력 (assignedAt 은 DB NOW()). */
export interface NewEnrollment {
  botId: string;
  studentId: string;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  via: string;
}

/** 참여 코드 신규 입력 — teacherId 는 필수(NULL 발급 금지, M2 개정 §1). */
export interface NewJoinCode {
  code: string;
  botId: string;
  classroomId: string;
  teacherId: string;
}

/**
 * classroom 저장소 추상. Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class IClassroomRepository {
  /** 학생의 enrollments ⋈ class_bots — 내 봇 목록(+반 메타). */
  abstract findEnrolledBots(studentId: string): Promise<EnrolledBotRow[]>;
  /** 교사 소유 봇 목록. */
  abstract findOwnedBots(teacherId: string): Promise<BotRow[]>;
  abstract findBotById(botId: string): Promise<BotRow | null>;
  abstract findCurriculumUnits(botId: string): Promise<CurriculumUnitRow[]>;
  abstract findBotSettings(
    botId: string,
  ): Promise<Record<string, unknown> | null>;
  abstract findClassroomsByTeacher(teacherId: string): Promise<ClassroomRow[]>;
  abstract findClassroomById(id: string): Promise<ClassroomRow | null>;
  abstract findUserById(id: string): Promise<DomainUserRow | null>;
  abstract findJoinCode(code: string): Promise<JoinCodeRow | null>;
  abstract findEnrollment(
    botId: string,
    studentId: string,
  ): Promise<EnrollmentRow | null>;
  /**
   * enrollment 를 삽입하고 enrolled_count 를 증가시킨다(단일 트랜잭션).
   * @returns 삽입된 행의 assignedAt. 이미 존재(PK 충돌)하면 null — 멱등
   */
  abstract createEnrollment(row: NewEnrollment): Promise<Date | null>;
  /**
   * 참여 코드를 삽입한다.
   * @returns 삽입된 행의 createdAt. 코드 중복(PK 충돌)이면 null
   */
  abstract createJoinCode(row: NewJoinCode): Promise<Date | null>;
}

/** DI 주입 토큰 — replay 의 QGEN_CLIENT_TOKEN 패턴 미러. */
export const CLASSROOM_REPOSITORY_TOKEN = Symbol("CLASSROOM_REPOSITORY_TOKEN");
