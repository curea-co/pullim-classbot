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
  AssignmentsReadResponseDto,
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

    const assignments =
      audience === "student"
        ? await this.repository.findAssignmentsForStudent(requesterId)
        : await this.repository.findAssignmentsForTeacher(requesterId);
    return { assignments };
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
    return { assignment: { ...assignment, questions } };
  }

  /**
   * 과제 접근 판정 — 대상 학생 또는 발사 교사(봇 소유자)만 통과.
   * 대상 판정은 FE 스토어 필터(`targetStudentIds 빈 배열=전체 enrolled`)의
   * DB 재현: student_id NULL 이면 enrolled 여부, non-null 이면 본인 여부.
   */
  private async assertCanAccessAssignment(
    assignment: AssignmentRow,
    requesterId: string,
  ): Promise<void> {
    if (assignment.studentId === requesterId) {
      return;
    }

    const bot = await this.repository.findBotById(assignment.botId);
    if (bot?.teacherId === requesterId) {
      return;
    }

    if (
      assignment.studentId === null &&
      (await this.repository.hasEnrollment(assignment.botId, requesterId))
    ) {
      return;
    }

    throw forbidden("본인 대상이거나 발사한 과제만 조회할 수 있습니다.");
  }

  /**
   * 교사 발사 — `POST /api/assignments` (spec §4.5, FE 스토어 dispatch 재현).
   *
   * 검증: 요청자 teacher 역할 + 그 봇 소유(403), title 5~50자 등 본문(400).
   * 대상 의미: targetStudentIds 빈 배열 = 전체 enrolled(student_id NULL),
   * 1명 = 단일 지정(enrolled 학생 검증). 2명 이상은 assignments 스키마에
   * target_student_ids 컬럼이 없어 표현 불가 — 400 (FE 스키마 PR 제안 참조).
   *
   * 미영속 필드: examTimeLimitMin / requizQuestionIds / dispatchedAt 은
   * 대응 컬럼이 없어 타입 검증만 하고 저장하지 않는다(문항 콘텐츠는 M3).
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param body - FE buildAssignment 구성 필드 (dueIso 또는 dueLabel·dDay)
   * @returns 생성된 행 — FE AssignmentReadRow 형태 그대로 (201)
   */
  async dispatchAssignment(
    userId: string | undefined,
    body: unknown,
  ): Promise<AssignmentRow> {
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

    const targetStudentId = await this.resolveTargetStudent(bot, input);

    // id 는 서버 생성(as_user_<uuid 앞 8자>) — PK 충돌 시 재생성.
    for (let attempt = 0; attempt < GENERATED_ID_MAX_ATTEMPTS; attempt += 1) {
      const row = this.buildAssignmentRow(input, bot, targetStudentId);
      if (await this.repository.createAssignment(row)) {
        return row;
      }
    }
    // 16^8 공간에서 연속 충돌은 사실상 불가 — 방어적 종료.
    throw conflict("과제 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  /** 단일 지정 대상 검증 — 존재(404)·학생 역할(400)·enrolled(400). */
  private async resolveTargetStudent(
    bot: BotRefRow,
    input: DispatchInput,
  ): Promise<string | null> {
    if (input.targetStudentIds.length === 0) {
      return null;
    }
    const targetId = input.targetStudentIds[0];
    const student = await this.repository.findUserById(targetId);
    if (!student) {
      throw notFound("대상 학생을 찾을 수 없습니다.");
    }
    if (student.role !== "student") {
      throw validationError("targetStudentIds 는 학생 사용자여야 합니다.");
    }
    if (!(await this.repository.hasEnrollment(bot.id, targetId))) {
      throw validationError(
        "그 클래스봇에 enrolled 된 학생만 대상으로 지정할 수 있습니다.",
      );
    }
    return student.id;
  }

  /** 서버 파생 필드를 채운 insert 행 — FE buildAssignment 의 서버판. */
  private buildAssignmentRow(
    input: DispatchInput,
    bot: BotRefRow,
    targetStudentId: string | null,
  ): AssignmentRow {
    const id = `as_user_${randomUUID().split("-")[0]}`;
    return {
      id,
      botId: bot.id,
      studentId: targetStudentId,
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

    const targetStudentIds = this.parseTargetStudentIds(
      record.targetStudentIds,
    );
    const { dueLabel, dDay } = this.resolveDue(record);
    this.assertOptionalShapes(record);

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
    };
  }

  /** targetStudentIds — 빈 배열=전체 enrolled, 1명=단일 지정, 2명 이상=400. */
  private parseTargetStudentIds(value: unknown): string[] {
    const ids = this.parseStringArray(value, "targetStudentIds");
    if (ids.length > 1) {
      throw validationError(
        "targetStudentIds 는 현재 전체([]) 또는 1명만 지원합니다 — " +
          "assignments 스키마에 다중 대상 컬럼(target_student_ids)이 없습니다.",
      );
    }
    return ids;
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
   * 미영속 옵션 필드의 타입만 검증 — examTimeLimitMin / requizQuestionIds.
   * assignments 스키마에 대응 컬럼이 없어 저장하지 않는다(스키마 diff 제안
   * 참조). 잘못된 타입은 조용히 버리지 않고 400 으로 알린다.
   */
  private assertOptionalShapes(record: Record<string, unknown>): void {
    if (
      record.examTimeLimitMin !== undefined &&
      (typeof record.examTimeLimitMin !== "number" ||
        !Number.isInteger(record.examTimeLimitMin) ||
        record.examTimeLimitMin < 1)
    ) {
      throw validationError("examTimeLimitMin 은 양의 정수여야 합니다.");
    }
    if (record.requizQuestionIds !== undefined) {
      this.parseStringArray(record.requizQuestionIds, "requizQuestionIds");
    }
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
