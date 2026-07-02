/**
 * assignment 도메인 저장소 추상 — assignments / assignment_questions / submissions.
 *
 * 도메인 테이블(Drizzle 소유, spec §6.2)은 TypeORM 엔티티를 만들지 않고
 * raw SQL 로만 접근한다(classroom 모듈 패턴 미러). 구현체는
 * infrastructure/assignment.repository.ts.
 */

/**
 * 과제 한 행 — FE `AssignmentReadRow`(apps/classbot/hooks/api/read/types.ts)와 1:1.
 *
 * 대상 의미(FE 스토어 `UserAssignment.targetStudentIds` 재현):
 * `studentId = null` 은 "그 봇의 전체 enrolled 학생 대상"(빈 배열 발사),
 * non-null 은 단일 지정 대상이다. 스키마에 target_student_ids 컬럼이 없어
 * 다중 지정 대상(2명 이상)은 현재 표현 불가 — service 가 400 으로 거부한다.
 */
export interface AssignmentRow {
  id: string;
  botId: string;
  studentId: string | null;
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
}

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

/**
 * assignment 저장소 추상. Service 는 이 인터페이스로만 DB 에 접근한다.
 */
export abstract class IAssignmentRepository {
  /**
   * 학생의 내 과제 목록 — enrolled 봇 스코프 + 대상 필터
   * (student_id IS NULL = 전체 enrolled, 또는 본인 지정).
   */
  abstract findAssignmentsForStudent(
    studentId: string,
  ): Promise<AssignmentRow[]>;
  /** 교사의 발사 과제 목록 — 소유 봇 스코프. */
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
}

/** DI 주입 토큰 — classroom 의 CLASSROOM_REPOSITORY_TOKEN 패턴 미러. */
export const ASSIGNMENT_REPOSITORY_TOKEN = Symbol(
  "ASSIGNMENT_REPOSITORY_TOKEN",
);
