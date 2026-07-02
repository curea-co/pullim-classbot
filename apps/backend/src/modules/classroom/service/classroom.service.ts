import { Inject, Injectable } from "@nestjs/common";

import type {
  BotDetailResponseDto,
  BotsReadResponseDto,
  ClassroomsReadResponseDto,
  EnrollmentResponseDto,
  JoinCodeResponseDto,
  OwnedBotDto,
} from "../controller/dto/classroom-responses.dto";
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from "../infrastructure/domain-http.error";
import {
  generateJoinCode,
  JOIN_CODE_PATTERN,
} from "../infrastructure/join-code.util";
import {
  BotRow,
  CLASSROOM_REPOSITORY_TOKEN,
  EnrollmentRow,
  IClassroomRepository,
} from "../interface/classroom-repository.interface";

/** 서버 생성 코드의 PK 충돌 시 최대 재시도 횟수. */
const GENERATED_CODE_MAX_ATTEMPTS = 5;

/** 코드 참여 결과 — created 는 컨트롤러의 201/200 분기에만 쓴다. */
export interface JoinByCodeResult {
  /** true 면 신규 enrollment(201), false 면 기존 행 멱등 반환(200). */
  created: boolean;
  enrollment: EnrollmentResponseDto;
}

/**
 * classroom 도메인 비즈니스 로직 — bots / classrooms / enrollments / join_codes.
 *
 * 응답·에러 형태는 spec §3 을 따른다: 성공은 데이터 그대로, 에러는
 * { error: { code, message } } 봉투. 시각은 ISO-8601 문자열로 변환한다.
 */
@Injectable()
export class ClassroomService {
  constructor(
    @Inject(CLASSROOM_REPOSITORY_TOKEN)
    private readonly repository: IClassroomRepository,
  ) {}

  /**
   * 내 봇 목록 (spec §4.2). 학생은 enrollments 조인(+반 메타 — FE BotReadRow),
   * 교사는 소유 봇 목록.
   * @param role - 'student' | 'teacher'
   * @param userId - 요청 사용자 id (JWT 또는 x-user-id)
   */
  async listBots(
    role: string | undefined,
    userId: string | undefined,
  ): Promise<BotsReadResponseDto> {
    if (role !== "student" && role !== "teacher") {
      throw validationError("role 쿼리는 student 또는 teacher 여야 합니다.");
    }
    const requesterId = this.requireUserId(userId);

    if (role === "student") {
      const bots = await this.repository.findEnrolledBots(requesterId);
      return { bots };
    }

    const owned = await this.repository.findOwnedBots(requesterId);
    return { bots: owned.map((bot) => this.toOwnedBotDto(bot)) };
  }

  /**
   * 봇 상세 — 봇 + curriculum units + settings (spec §4.2).
   * @param botId - 봇 id
   */
  async getBot(botId: string): Promise<BotDetailResponseDto> {
    const bot = await this.repository.findBotById(botId);
    if (!bot) {
      throw notFound("클래스봇을 찾을 수 없습니다.");
    }

    const [curriculumUnits, settings] = await Promise.all([
      this.repository.findCurriculumUnits(botId),
      this.repository.findBotSettings(botId),
    ]);

    return { ...this.toOwnedBotDto(bot), curriculumUnits, settings };
  }

  /**
   * 요청 교사의 반 목록 (spec §4.2 — `GET /api/classrooms`).
   * @param userId - 요청 사용자 id
   */
  async listClassrooms(
    userId: string | undefined,
  ): Promise<ClassroomsReadResponseDto> {
    const requesterId = this.requireUserId(userId);
    return this.repository.findClassroomsByTeacher(requesterId);
  }

  /**
   * 학생 코드 참여 — `POST /api/enrollments` (M2 개정 §2, mock resolveClassCode 실전판).
   * join_codes 해석 → 봇/반 로드 → enrollment upsert(멱등).
   * 응답은 mock StudentEnrollment 형태(botId/classroomId/classroomLabel/
   * assignedBy/assignedAt/via)를 재현한다 — FE 스토어가 그대로 소비.
   * @param userId - 요청 학생 id (JWT 또는 x-user-id)
   * @param body - { code } — 무효 코드는 404 NOT_FOUND
   */
  async joinByCode(
    userId: string | undefined,
    body: unknown,
  ): Promise<JoinByCodeResult> {
    const code = this.normalizeCode(body);
    const requesterId = this.requireUserId(userId);

    const user = await this.repository.findUserById(requesterId);
    if (!user) {
      throw unauthorized("알 수 없는 사용자입니다.");
    }
    if (user.role !== "student") {
      throw forbidden("학생만 참여 코드를 사용할 수 있습니다.");
    }

    const joinCode = await this.repository.findJoinCode(code);
    if (!joinCode) {
      throw notFound("유효하지 않은 참여 코드입니다.");
    }

    const [bot, classroom] = await Promise.all([
      this.repository.findBotById(joinCode.botId),
      this.repository.findClassroomById(joinCode.classroomId),
    ]);
    // 복합 FK ON DELETE CASCADE 로 정상 경로에선 도달 불가 — 방어적 404.
    if (!bot || !classroom) {
      throw notFound("참여 코드에 연결된 클래스봇/반이 없습니다.");
    }

    const existing = await this.repository.findEnrollment(bot.id, user.id);
    if (existing) {
      return { created: false, enrollment: this.toEnrollmentDto(existing) };
    }

    const assignedAt = await this.repository.createEnrollment({
      botId: bot.id,
      studentId: user.id,
      classroomId: classroom.id,
      classroomLabel: classroom.label,
      // mock class-codes.ts 의미 재현: assignedBy=봇 교사명, via=반 소속 기관.
      assignedBy: bot.teacherName,
      via: classroom.organization,
    });

    // PK 충돌(동시 참여)이면 멱등 — 방금 생긴 기존 행을 반환한다.
    if (!assignedAt) {
      const raced = await this.repository.findEnrollment(bot.id, user.id);
      if (!raced) {
        throw notFound("참여 처리에 실패했습니다. 다시 시도해 주세요.");
      }
      return { created: false, enrollment: this.toEnrollmentDto(raced) };
    }

    return {
      created: true,
      enrollment: {
        botId: bot.id,
        classroomId: classroom.id,
        classroomLabel: classroom.label,
        assignedBy: bot.teacherName,
        assignedAt: assignedAt.toISOString(),
        via: classroom.organization,
      },
    };
  }

  /**
   * 참여 코드 발급 — `POST /api/bots/:id/join-codes` (M2 개정 §1·§2).
   *
   * **소유권 강제 지점**: 요청 교사가 봇·반 *모두*의 소유자인지 검증하고
   * teacher_id 를 필수 기록한다 — join_codes 의 NULL teacher_id 는 발급
   * 경로에서 절대 생성되지 않는다(스키마 주석 계약).
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param botId - 코드가 연결될 봇 id (path)
   * @param body - { code?, classroomId } — code 미지정 시 서버 생성
   */
  async issueJoinCode(
    userId: string | undefined,
    botId: string,
    body: unknown,
  ): Promise<JoinCodeResponseDto> {
    const input = this.parseIssueBody(body);
    const requesterId = this.requireUserId(userId);

    const user = await this.repository.findUserById(requesterId);
    if (!user) {
      throw unauthorized("알 수 없는 사용자입니다.");
    }
    if (user.role !== "teacher") {
      throw forbidden("교사만 참여 코드를 발급할 수 있습니다.");
    }

    const bot = await this.repository.findBotById(botId);
    if (!bot) {
      throw notFound("클래스봇을 찾을 수 없습니다.");
    }
    if (bot.teacherId !== user.id) {
      throw forbidden("본인 소유의 클래스봇만 코드를 발급할 수 있습니다.");
    }

    const classroom = await this.repository.findClassroomById(
      input.classroomId,
    );
    if (!classroom) {
      throw notFound("반을 찾을 수 없습니다.");
    }
    if (classroom.teacherId !== user.id) {
      throw forbidden("본인 소유의 반만 코드에 연결할 수 있습니다.");
    }

    // 지정 코드: 1회 시도, 중복이면 409. 서버 생성 코드: 충돌 시 재생성.
    if (input.code) {
      const createdAt = await this.repository.createJoinCode({
        code: input.code,
        botId: bot.id,
        classroomId: classroom.id,
        teacherId: user.id,
      });
      if (!createdAt) {
        throw conflict("이미 사용 중인 참여 코드입니다.");
      }
      return this.toJoinCodeDto(
        input.code,
        bot.id,
        classroom.id,
        user.id,
        createdAt,
      );
    }

    for (let attempt = 0; attempt < GENERATED_CODE_MAX_ATTEMPTS; attempt += 1) {
      const code = generateJoinCode();
      const createdAt = await this.repository.createJoinCode({
        code,
        botId: bot.id,
        classroomId: classroom.id,
        teacherId: user.id,
      });
      if (createdAt) {
        return this.toJoinCodeDto(
          code,
          bot.id,
          classroom.id,
          user.id,
          createdAt,
        );
      }
    }
    // 32^8 공간에서 연속 충돌은 사실상 불가 — 방어적 종료.
    throw conflict("참여 코드 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  /** { code?, classroomId } 본문 검증 — code 는 정규화 + 패턴 검사. */
  private parseIssueBody(body: unknown): {
    code: string | null;
    classroomId: string;
  } {
    const record =
      body && typeof body === "object"
        ? (body as { code?: unknown; classroomId?: unknown })
        : {};
    if (
      typeof record.classroomId !== "string" ||
      record.classroomId.trim().length === 0
    ) {
      throw validationError(
        "classroomId 는 비어 있지 않은 문자열이어야 합니다.",
      );
    }

    if (record.code === undefined || record.code === null) {
      return { code: null, classroomId: record.classroomId.trim() };
    }
    if (typeof record.code !== "string") {
      throw validationError("code 는 문자열이어야 합니다.");
    }
    const code = record.code.trim().toUpperCase();
    if (!JOIN_CODE_PATTERN.test(code)) {
      throw validationError(
        "code 는 대문자 영숫자·하이픈 4~24자여야 합니다 (예: MATH-2024).",
      );
    }
    return { code, classroomId: record.classroomId.trim() };
  }

  /** 발급 응답형 — teacherId 필수(non-null), createdAt ISO. */
  private toJoinCodeDto(
    code: string,
    botId: string,
    classroomId: string,
    teacherId: string,
    createdAt: Date,
  ): JoinCodeResponseDto {
    return {
      code,
      botId,
      classroomId,
      teacherId,
      createdAt: createdAt.toISOString(),
    };
  }

  /** body.code 를 mock resolveClassCode 와 동일하게 정규화(trim + 대문자). */
  private normalizeCode(body: unknown): string {
    const code =
      body && typeof body === "object"
        ? (body as { code?: unknown }).code
        : undefined;
    if (typeof code !== "string" || code.trim().length === 0) {
      throw validationError("code 는 비어 있지 않은 문자열이어야 합니다.");
    }
    return code.trim().toUpperCase();
  }

  /** EnrollmentRow → 응답형 (assignedAt ISO, studentId 제외 — mock 형태). */
  private toEnrollmentDto(row: EnrollmentRow): EnrollmentResponseDto {
    return {
      botId: row.botId,
      classroomId: row.classroomId,
      classroomLabel: row.classroomLabel,
      assignedBy: row.assignedBy,
      assignedAt: row.assignedAt.toISOString(),
      via: row.via,
    };
  }

  /** 신원이 없으면 401 봉투. */
  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw unauthorized("로그인이 필요합니다.");
    }
    return userId;
  }

  /** BotRow → 응답형 (createdAt ISO 변환). */
  private toOwnedBotDto(bot: BotRow): OwnedBotDto {
    return { ...bot, createdAt: bot.createdAt.toISOString() };
  }
}
