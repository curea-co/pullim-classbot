import { Inject, Injectable } from "@nestjs/common";

import type {
  BotDetailResponseDto,
  BotsReadResponseDto,
  ClassroomsReadResponseDto,
  EnrollmentResponseDto,
  OwnedBotDto,
} from "../controller/dto/classroom-responses.dto";
import {
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from "../infrastructure/domain-http.error";
import {
  BotRow,
  CLASSROOM_REPOSITORY_TOKEN,
  EnrollmentRow,
  IClassroomRepository,
} from "../interface/classroom-repository.interface";

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
