import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from "../../classroom/infrastructure/domain-http.error";
import type {
  AssignmentDetailResponseDto,
  AssignmentResponseDto,
  AssignmentsReadResponseDto,
  SubmissionResponseDto,
  SubmissionsReadResponseDto,
} from "../controller/dto/assignment-responses.dto";
import {
  computeDDay,
  formatDueLabel,
  parseDueIsoAsKst,
} from "../infrastructure/due-label.util";
import {
  ASSIGNMENT_REPOSITORY_TOKEN,
  AssignmentRow,
  BotRefRow,
  IAssignmentRepository,
  NewAssignment,
  SubmissionRow,
} from "../interface/assignment-repository.interface";

/** 서버 생성 id 의 PK 충돌 시 최대 재시도 횟수 (classroom join-code 패턴). */
const GENERATED_ID_MAX_ATTEMPTS = 5;

/** FE 발사 폼 제약 — 제목 5~50자, 문항 수 1~60(시험 모드 상한). */
const TITLE_MIN = 5;
const TITLE_MAX = 50;
const QUESTION_COUNT_MAX = 60;

/** 파싱된 발사 본문 — FE buildAssignment 구성 필드의 서버 수용형. */
interface DispatchInput {
  botId: string;
  title: string;
  scope: string;
  chapterFrom: string;
  chapterTo: string;
  achievementCodes: string[];
  questionCount: number;
  difficulty: AssignmentRow["difficulty"];
  mode: AssignmentRow["mode"];
  targetStudentIds: string[];
  dueLabel: string;
  dDay: string;
  reasonHint: string | null;
  examTimeLimitMin: number | null;
  requizQuestionIds: string[] | null;
}

/** 제출 결과 — created 는 컨트롤러의 201/200 분기에만 쓴다. */
export interface SubmitAssignmentResult {
  /** true 면 신규 제출(201), false 면 기존 제출 갱신 멱등(200). */
  created: boolean;
  submission: SubmissionResponseDto;
}

/**
 * assignment 도메인 비즈니스 로직 — assignments / assignment_questions /
 * submissions (spec §4.5 + M2 개정 §3).
 *
 * 응답·에러 형태는 spec §3 을 따른다: 성공은 데이터 그대로, 에러는
 * { error: { code, message } } 봉투 — 봉투 헬퍼는 classroom 의
 * domain-http.error 를 재사용한다(순수 함수라 모듈 결합 없음, 봉투 구현
 * 이중화 방지).
 */
@Injectable()
export class AssignmentService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY_TOKEN)
    private readonly repository: IAssignmentRepository,
  ) {}

  /**
   * 내 과제 목록 (spec §4.5 — `GET /api/assignments?audience=student|teacher`).
   *
   * 학생: enrolled 봇 스코프 + 대상 필터(student_id NULL=전체 enrolled, 또는 본인).
   * 교사: 소유 봇 스코프의 발사 과제 전체.
   * @param audience - 'student' | 'teacher'
   * @param userId - 요청 사용자 id (JWT 또는 x-user-id)
   */
  async listAssignments(
    audience: string | undefined,
    userId: string | undefined,
  ): Promise<AssignmentsReadResponseDto> {
    if (audience !== "student" && audience !== "teacher") {
      throw validationError(
        "audience 쿼리는 student 또는 teacher 여야 합니다.",
      );
    }
    const requesterId = this.requireUserId(userId);

    const rows =
      audience === "student"
        ? await this.repository.findAssignmentsForStudent(requesterId)
        : await this.repository.findAssignmentsForTeacher(requesterId);
    return { assignments: rows.map((row) => this.toAssignmentDto(row)) };
  }

  /**
   * 과제 상세 — 과제 + 문항(assignment_questions 조인) (spec §4.5).
   *
   * **접근 스코프**: 대상 학생(단일 지정 본인, 또는 전체 대상 과제의 enrolled
   * 학생)이거나 발사 교사(봇 소유자)만 허용, 아니면 403.
   * @param id - 과제 id
   * @param userId - 요청 사용자 id (JWT 또는 x-user-id)
   */
  async getAssignment(
    id: string,
    userId: string | undefined,
  ): Promise<AssignmentDetailResponseDto> {
    const requesterId = this.requireUserId(userId);

    const assignment = await this.repository.findAssignmentById(id);
    if (!assignment) {
      throw notFound("과제를 찾을 수 없습니다.");
    }

    await this.assertCanAccessAssignment(assignment, requesterId);

    const questions = await this.repository.findQuestions(id);
    return { assignment: { ...this.toAssignmentDto(assignment), questions } };
  }

  /**
   * 과제 접근 판정 — 대상 학생 또는 발사 교사(봇 소유자)만 통과.
   * 대상 판정은 FE 스토어 필터(`targetStudentIds 빈 배열=전체 enrolled`)의
   * DB 재현: 직접 지정(student_id 일치 또는 target_student_ids 포함) 또는
   * 전체 대상(둘 다 null/빈)의 enrolled 학생.
   */
  private async assertCanAccessAssignment(
    assignment: AssignmentRow,
    requesterId: string,
  ): Promise<void> {
    if (this.isDirectTarget(assignment, requesterId)) {
      return;
    }

    const bot = await this.repository.findBotById(assignment.botId);
    if (bot?.teacherId === requesterId) {
      return;
    }

    if (await this.isEnrolledForAllTarget(assignment, requesterId)) {
      return;
    }

    throw forbidden("본인 대상이거나 발사한 과제만 조회할 수 있습니다.");
  }

  /** 직접 지정 대상 — student_id 일치(단일 호환) 또는 target_student_ids 포함. */
  private isDirectTarget(assignment: AssignmentRow, userId: string): boolean {
    return (
      assignment.studentId === userId ||
      (assignment.targetStudentIds ?? []).includes(userId)
    );
  }

  /** 전체 대상 과제(student_id·targets 모두 null/빈)의 enrolled 학생인지. */
  private async isEnrolledForAllTarget(
    assignment: AssignmentRow,
    userId: string,
  ): Promise<boolean> {
    const isAllTarget =
      assignment.studentId === null &&
      (assignment.targetStudentIds ?? []).length === 0;
    if (!isAllTarget) {
      return false;
    }
    return this.repository.hasEnrollment(assignment.botId, userId);
  }

  /**
   * 교사 발사 — `POST /api/assignments` (spec §4.5, FE 스토어 dispatch 재현).
   *
   * 검증: 요청자 teacher 역할 + 그 봇 소유(403), title 5~50자 등 본문(400).
   * 대상 의미(스키마 0002): targetStudentIds 빈 배열 = 전체 enrolled
   * (student_id NULL + targets []), 1명 = 단일 지정(student_id 호환 병기),
   * 2명 이상 = target_student_ids jsonb 영속. 대상 전원 enrolled 검증(400).
   * examTimeLimitMin / requizQuestionIds 도 영속하며, dispatched_at 은
   * DB NOW() 로 기록해 목록 정렬 키로 쓴다.
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param body - FE buildAssignment 구성 필드 (dueIso 또는 dueLabel·dDay)
   * @returns 생성된 행 — FE AssignmentReadRow 상위집합 (201)
   */
  async dispatchAssignment(
    userId: string | undefined,
    body: unknown,
  ): Promise<AssignmentResponseDto> {
    const input = this.parseDispatchBody(body);
    const requesterId = this.requireUserId(userId);

    const user = await this.repository.findUserById(requesterId);
    if (!user) {
      throw unauthorized("알 수 없는 사용자입니다.");
    }
    if (user.role !== "teacher") {
      throw forbidden("교사만 과제를 발사할 수 있습니다.");
    }

    const bot = await this.repository.findBotById(input.botId);
    if (!bot) {
      throw notFound("클래스봇을 찾을 수 없습니다.");
    }
    if (bot.teacherId !== user.id) {
      throw forbidden("본인 소유의 클래스봇으로만 과제를 발사할 수 있습니다.");
    }

    const targets = await this.resolveTargetStudents(bot, input);

    // id 는 서버 생성(as_user_<uuid 앞 8자>) — PK 충돌 시 재생성.
    for (let attempt = 0; attempt < GENERATED_ID_MAX_ATTEMPTS; attempt += 1) {
      const row = this.buildAssignmentRow(input, bot, targets, user.id);
      const dispatchedAt = await this.repository.createAssignment(row);
      if (dispatchedAt) {
        return this.toAssignmentDto({ ...row, dispatchedAt });
      }
    }
    // 16^8 공간에서 연속 충돌은 사실상 불가 — 방어적 종료.
    throw conflict("과제 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  /**
   * 학생 제출 — `POST /api/assignments/:id/submissions`.
   *
   * 대상 학생 검증(403) 후 **같은 (assignment, student) 는 갱신하는 멱등
   * upsert** — FE 스토어 recordSubmission 의미 재현. submitted_at 은 DB NOW().
   * @param userId - 요청 학생 id (JWT 또는 x-user-id)
   * @param assignmentId - 과제 id (path)
   * @param body - { answers: Record<string,string>, scorePercent: 0~100 }
   */
  async submitAssignment(
    userId: string | undefined,
    assignmentId: string,
    body: unknown,
  ): Promise<SubmitAssignmentResult> {
    const input = this.parseSubmissionBody(body);
    const requesterId = this.requireUserId(userId);

    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw notFound("과제를 찾을 수 없습니다.");
    }

    const isTarget =
      this.isDirectTarget(assignment, requesterId) ||
      (await this.isEnrolledForAllTarget(assignment, requesterId));
    if (!isTarget) {
      throw forbidden("본인 대상 과제에만 제출할 수 있습니다.");
    }

    const { created, row } = await this.repository.upsertSubmission({
      id: `sub_${randomUUID().split("-")[0]}`,
      assignmentId: assignment.id,
      studentId: requesterId,
      answers: input.answers,
      scorePercent: input.scorePercent,
    });
    return { created, submission: this.toSubmissionDto(row) };
  }

  /**
   * 제출 목록 — `GET /api/assignments/:id/submissions`.
   * **발사 교사(봇 소유자)만** 조회 가능(403) — 교사 제출 현황 시트 소비용.
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param assignmentId - 과제 id (path)
   */
  async listSubmissions(
    userId: string | undefined,
    assignmentId: string,
  ): Promise<SubmissionsReadResponseDto> {
    const requesterId = this.requireUserId(userId);

    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw notFound("과제를 찾을 수 없습니다.");
    }

    const bot = await this.repository.findBotById(assignment.botId);
    if (bot?.teacherId !== requesterId) {
      throw forbidden("발사한 교사만 제출 현황을 조회할 수 있습니다.");
    }

    const rows = await this.repository.findSubmissions(assignmentId);
    return { submissions: rows.map((row) => this.toSubmissionDto(row)) };
  }

  /** SubmissionRow → 응답형 (submittedAt ISO 변환, spec §3). */
  private toSubmissionDto(row: SubmissionRow): SubmissionResponseDto {
    return {
      id: row.id,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      submittedAt: row.submittedAt.toISOString(),
      answers: row.answers,
      scorePercent: row.scorePercent,
    };
  }

  /** { answers, scorePercent } 본문 검증 — FE computeMockScore 산출 계약. */
  private parseSubmissionBody(body: unknown): {
    answers: Record<string, string>;
    scorePercent: number;
  } {
    const record =
      body && typeof body === "object"
        ? (body as { answers?: unknown; scorePercent?: unknown })
        : {};

    const answers = record.answers;
    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers) ||
      Object.values(answers).some((v) => typeof v !== "string")
    ) {
      throw validationError(
        "answers 는 { [questionId]: answer(string) } 객체여야 합니다.",
      );
    }

    const scorePercent = record.scorePercent;
    if (
      typeof scorePercent !== "number" ||
      !Number.isFinite(scorePercent) ||
      scorePercent < 0 ||
      scorePercent > 100
    ) {
      throw validationError("scorePercent 는 0~100 숫자여야 합니다.");
    }

    return {
      answers: answers as Record<string, string>,
      scorePercent: Math.round(scorePercent),
    };
  }

  /**
   * 지정 대상 전원 검증 — 각각 존재(404)·학생 역할(400)·enrolled(400).
   * @returns 중복 제거된 대상 id 배열 (빈 배열 = 전체 enrolled)
   */
  private async resolveTargetStudents(
    bot: BotRefRow,
    input: DispatchInput,
  ): Promise<string[]> {
    const targetIds = [...new Set(input.targetStudentIds)];
    for (const targetId of targetIds) {
      const student = await this.repository.findUserById(targetId);
      if (!student) {
        throw notFound(`대상 학생(${targetId})을 찾을 수 없습니다.`);
      }
      if (student.role !== "student") {
        throw validationError("targetStudentIds 는 학생 사용자여야 합니다.");
      }
      if (!(await this.repository.hasEnrollment(bot.id, targetId))) {
        throw validationError(
          "그 클래스봇에 enrolled 된 학생만 대상으로 지정할 수 있습니다.",
        );
      }
    }
    return targetIds;
  }

  /**
   * 서버 파생 필드를 채운 insert 행 — FE buildAssignment 의 서버판.
   * student_id 는 단일 지정일 때만 채워 기존 소비자와 호환을 유지하고,
   * target_student_ids 에는 항상 대상 배열을 병기해 일관화한다.
   */
  private buildAssignmentRow(
    input: DispatchInput,
    bot: BotRefRow,
    targets: string[],
    createdBy: string,
  ): NewAssignment {
    const id = `as_user_${randomUUID().split("-")[0]}`;
    return {
      id,
      botId: bot.id,
      studentId: targets.length === 1 ? targets[0] : null,
      createdBy,
      title: input.title,
      scope: input.scope,
      subject: bot.subject,
      grade: bot.grade,
      chapterFrom: input.chapterFrom,
      chapterTo: input.chapterTo,
      achievementCodes: input.achievementCodes,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      mode: input.mode,
      scopeOverride: input.mode === "exam" ? 1 : null,
      source: "teacher-assigned",
      assignedBy: bot.name,
      assignedAtLabel: "방금 발사",
      dueLabel: input.dueLabel,
      dDay: input.dDay,
      completedCount: 0,
      recentAccuracy: null,
      state: "todo",
      reasonHint: input.reasonHint,
      solveHref: `/classbot/assignment/${id}/solve?step=1`,
      targetStudentIds: targets,
      examTimeLimitMin: input.examTimeLimitMin,
      requizQuestionIds: input.requizQuestionIds,
    };
  }

  /** AssignmentRow → 응답형 (dispatchedAt ISO 변환, spec §3). */
  private toAssignmentDto(row: AssignmentRow): AssignmentResponseDto {
    return {
      ...row,
      dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
    };
  }

  /** 발사 본문 검증 — FE assignment-form 의 canDispatch 제약을 서버 강제. */
  private parseDispatchBody(body: unknown): DispatchInput {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    const botId = this.requireString(record.botId, "botId");
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      throw validationError(`title 은 ${TITLE_MIN}~${TITLE_MAX}자여야 합니다.`);
    }

    const mode = record.mode;
    if (mode !== "practice" && mode !== "exam" && mode !== "wrong-conquest") {
      throw validationError(
        "mode 는 practice|exam|wrong-conquest 여야 합니다.",
      );
    }
    const difficulty = record.difficulty;
    if (difficulty !== "하" && difficulty !== "중" && difficulty !== "상") {
      throw validationError("difficulty 는 하|중|상 이어야 합니다.");
    }

    const questionCount = record.questionCount;
    if (
      typeof questionCount !== "number" ||
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > QUESTION_COUNT_MAX
    ) {
      throw validationError(
        `questionCount 는 1~${QUESTION_COUNT_MAX} 정수여야 합니다.`,
      );
    }

    const targetStudentIds = this.parseStringArray(
      record.targetStudentIds,
      "targetStudentIds",
    );
    const { dueLabel, dDay } = this.resolveDue(record);
    const { examTimeLimitMin, requizQuestionIds } =
      this.parseDispatchOptions(record);

    const scope =
      typeof record.scope === "string" && record.scope.trim().length > 0
        ? record.scope.trim()
        : "단원 미정";

    return {
      botId,
      title,
      scope,
      chapterFrom:
        typeof record.chapterFrom === "string" && record.chapterFrom.trim()
          ? record.chapterFrom.trim()
          : scope,
      chapterTo:
        typeof record.chapterTo === "string" && record.chapterTo.trim()
          ? record.chapterTo.trim()
          : scope,
      achievementCodes: this.parseStringArray(
        record.achievementCodes,
        "achievementCodes",
      ),
      questionCount,
      difficulty,
      mode,
      targetStudentIds,
      dueLabel,
      dDay,
      reasonHint:
        typeof record.reasonHint === "string" && record.reasonHint.trim()
          ? record.reasonHint.trim().slice(0, 200)
          : null,
      examTimeLimitMin,
      requizQuestionIds,
    };
  }

  /** dueIso(미래 시각, KST 해석) 또는 dueLabel·dDay 직접 지정. */
  private resolveDue(record: Record<string, unknown>): {
    dueLabel: string;
    dDay: string;
  } {
    if (typeof record.dueIso === "string" && record.dueIso.trim().length > 0) {
      const due = parseDueIsoAsKst(record.dueIso.trim());
      if (Number.isNaN(due.getTime())) {
        throw validationError("dueIso 는 유효한 ISO-8601 시각이어야 합니다.");
      }
      if (due.getTime() <= Date.now()) {
        throw validationError("dueIso 는 미래 시각이어야 합니다.");
      }
      return { dueLabel: formatDueLabel(due), dDay: computeDDay(due) };
    }
    if (
      typeof record.dueLabel === "string" &&
      record.dueLabel.trim().length > 0 &&
      typeof record.dDay === "string" &&
      record.dDay.trim().length > 0
    ) {
      return {
        dueLabel: record.dueLabel.trim(),
        dDay: record.dDay.trim(),
      };
    }
    throw validationError("dueIso 또는 dueLabel·dDay 가 필요합니다.");
  }

  /**
   * 발사 옵션 필드 — examTimeLimitMin / requizQuestionIds (스키마 0002 영속).
   * 잘못된 타입은 조용히 버리지 않고 400 으로 알린다.
   */
  private parseDispatchOptions(record: Record<string, unknown>): {
    examTimeLimitMin: number | null;
    requizQuestionIds: string[] | null;
  } {
    let examTimeLimitMin: number | null = null;
    if (record.examTimeLimitMin !== undefined) {
      if (
        typeof record.examTimeLimitMin !== "number" ||
        !Number.isInteger(record.examTimeLimitMin) ||
        record.examTimeLimitMin < 1
      ) {
        throw validationError("examTimeLimitMin 은 양의 정수여야 합니다.");
      }
      examTimeLimitMin = record.examTimeLimitMin;
    }

    let requizQuestionIds: string[] | null = null;
    if (record.requizQuestionIds !== undefined) {
      const ids = this.parseStringArray(
        record.requizQuestionIds,
        "requizQuestionIds",
      );
      requizQuestionIds = ids.length > 0 ? ids : null;
    }

    return { examTimeLimitMin, requizQuestionIds };
  }

  /** 비어 있지 않은 문자열 필수 필드. */
  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw validationError(`${field} 는 비어 있지 않은 문자열이어야 합니다.`);
    }
    return value.trim();
  }

  /** 문자열 배열(생략 시 빈 배열) — 원소는 비어 있지 않은 문자열. */
  private parseStringArray(value: unknown, field: string): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    if (
      !Array.isArray(value) ||
      value.some((v) => typeof v !== "string" || v.trim().length === 0)
    ) {
      throw validationError(`${field} 는 문자열 배열이어야 합니다.`);
    }
    return (value as string[]).map((v) => v.trim());
  }

  /** 신원이 없으면 401 봉투 — M2 개정 §3 (무신원 mock 폴백 폐지). */
  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw unauthorized("로그인이 필요합니다.");
    }
    return userId;
  }
}
