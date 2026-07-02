/**
 * assignment 도메인 저장소 추상 — assignments / assignment_questions / submissions.
 *
 * 도메인 테이블(Drizzle 소유, spec §6.2)은 TypeORM 엔티티를 만들지 않고
 * raw SQL 로만 접근한다(classroom 모듈 패턴 미러). 구현체는
 * infrastructure/assignment.repository.ts.
 */

/**
 * 과제 한 행 — FE `AssignmentReadRow`(apps/classbot/hooks/api/read/types.ts)의
 * 상위집합(+ FE `UserAssignment` 발사 필드: targetStudentIds/dispatchedAt/
 * examTimeLimitMin/requizQuestionIds — 스키마 마이그레이션 0002).
 *
 * 대상 의미(FE 스토어 `UserAssignment.targetStudentIds` 재현):
 * - 전체 enrolled: `studentId = null` + `targetStudentIds` null/빈 배열.
 * - 단일 지정: `studentId = 그 학생`(기존 호환) + `targetStudentIds = [그 학생]`.
 * - 다중 지정: `studentId = null` + `targetStudentIds = [2명 이상]`.
 */
export interface AssignmentRow {
  id: string;
  botId: string;
  studentId: string | null;
  /** 발사 교사 — 제출 현황 접근 검증의 권위. 발사 경로는 항상 기록(schema 계약). */
  createdBy: string;
  title: string;
  scope: string;
  subject: string;
  grade: string;
  chapterFrom: string;
  chapterTo: string;
  achievementCodes: string[];
  questionCount: number;
  difficulty: "하" | "중" | "상";
  mode: "practice" | "exam" | "wrong-conquest";
  scopeOverride: number | null;
  source: "teacher-assigned" | "bot-prescribed" | "self";
  assignedBy: string;
  assignedAtLabel: string;
  dueLabel: string;
  dDay: string;
  completedCount: number;
  recentAccuracy: number | null;
  state: "todo" | "in-progress" | "submitted" | "overdue";
  reasonHint: string | null;
  solveHref: string;
  /** 지정 대상 학생 id 배열 — null/빈 배열 = 전체 enrolled (0002). */
  targetStudentIds: string[] | null;
  /** 발사 시각 — DB now() 기록. 0002 이전 레거시 행은 null 가능. */
  dispatchedAt: Date | null;
  /** 시험 모드 시간 제한(분) — exam 외엔 null. */
  examTimeLimitMin: number | null;
  /** 오답 재발사(requiz) 원 문항 id 집합 — 없으면 null. */
  requizQuestionIds: string[] | null;
}

/** 과제 신규 입력 — dispatchedAt 은 DB NOW() 가 원천이라 제외. */
export type NewAssignment = Omit<AssignmentRow, "dispatchedAt">;

/** 과제 문항 한 행 — assignment_questions 컬럼과 1:1 (mock AssignmentQuestion). */
export interface AssignmentQuestionRow {
  id: string;
  assignmentId: string;
  order: number;
  type: "mc" | "short" | "essay" | "numeric";
  prompt: string;
  options: string[] | null;
  answerIndex: number | null;
  answerKey: string | null;
  modelAnswer: string | null;
  hints: string[] | null;
}

/** 봇 참조 한 행 — 소유 검증 + 발사 파생 필드(subject/grade/assignedBy)용. */
export interface BotRefRow {
  id: string;
  name: string;
  teacherId: string | null;
  subject: string;
  grade: string;
}

/** 도메인 사용자 한 행 (역할 검증용 — classroom DomainUserRow 미러). */
export interface DomainUserRow {
  id: string;
  name: string;
  role: "student" | "teacher" | "parent";
}

/**
 * 학생 제출 한 행 — FE 스토어 `Submission`(lib/store/assignments.ts) 재현.
 * 테이블은 스키마 PR #192(마이그레이션 0002)로 인도됨 — DDL 배경은
 * proc/spec/2026-07-03_be-assignment-submissions-ddl.md.
 */
export interface SubmissionRow {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  answers: Record<string, string>;
  scorePercent: number;
}

/** 제출 upsert 입력 — submitted_at 은 DB NOW(). */
export interface SubmissionInput {
  /** 신규 삽입 시 쓸 id — 기존 행 갱신이면 무시(기존 id 유지). */
  id: string;
  assignmentId: string;
  studentId: string;
  answers: Record<string, string>;
  scorePercent: number;
}

/** upsert 결과 — created 는 컨트롤러의 201/200 분기에만 쓴다. */
export interface UpsertSubmissionResult {
  /** true 면 신규 삽입(201), false 면 기존 행 갱신 멱등(200). */
  created: boolean;
  row: SubmissionRow;
}

/**
 * assignment 저장소 추상. Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class IAssignmentRepository {
  /**
   * 학생의 내 과제 목록 — enrolled 봇 스코프 + 대상 필터
   * (student_id 일치 OR target_student_ids 포함 OR 전체(둘 다 null/빈)).
   * 정렬: dispatched_at DESC(레거시 null 은 뒤로), id DESC 타이브레이커.
   */
  abstract findAssignmentsForStudent(
    studentId: string,
  ): Promise<AssignmentRow[]>;
  /** 교사의 발사 과제 목록 — 소유 봇 스코프, dispatched_at DESC. */
  abstract findAssignmentsForTeacher(
    teacherId: string,
  ): Promise<AssignmentRow[]>;
  abstract findAssignmentById(id: string): Promise<AssignmentRow | null>;
  /** 과제 문항 — order 오름차순. 없으면 빈 배열(콘텐츠는 M3). */
  abstract findQuestions(
    assignmentId: string,
  ): Promise<AssignmentQuestionRow[]>;
  abstract findBotById(botId: string): Promise<BotRefRow | null>;
  /** 학생이 그 봇에 enrolled 인지 — 전체 대상(student_id NULL) 접근 판정. */
  abstract hasEnrollment(botId: string, studentId: string): Promise<boolean>;
  abstract findUserById(id: string): Promise<DomainUserRow | null>;
  /**
   * 과제를 삽입한다. 모든 필드는 서비스가 완성해 넘긴다.
   * dispatched_at 은 DB NOW() 로 기록된다.
   * @returns 삽입된 행의 dispatchedAt. id 충돌(PK)이면 null — 호출부가 id 재생성
   */
  abstract createAssignment(row: NewAssignment): Promise<Date | null>;
  /**
   * 같은 (assignment, student) 는 갱신하는 멱등 upsert —
   * FE recordSubmission 의미. submitted_at 은 DB NOW() 로 갱신된다.
   */
  abstract upsertSubmission(
    input: SubmissionInput,
  ): Promise<UpsertSubmissionResult>;
  /** 과제의 제출 목록 — submitted_at DESC. */
  abstract findSubmissions(assignmentId: string): Promise<SubmissionRow[]>;
}

/** DI 주입 토큰 — classroom 의 CLASSROOM_REPOSITORY_TOKEN 패턴 미러. */
export const ASSIGNMENT_REPOSITORY_TOKEN = Symbol(
  "ASSIGNMENT_REPOSITORY_TOKEN",
);
