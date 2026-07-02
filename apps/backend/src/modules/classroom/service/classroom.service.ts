import { Inject, Injectable } from "@nestjs/common";

import type {
  BotDetailResponseDto,
  BotsReadResponseDto,
  ClassroomsReadResponseDto,
  OwnedBotDto,
} from "../controller/dto/classroom-responses.dto";
import {
  notFound,
  unauthorized,
  validationError,
} from "../infrastructure/domain-http.error";
import {
  BotRow,
  CLASSROOM_REPOSITORY_TOKEN,
  IClassroomRepository,
} from "../interface/classroom-repository.interface";

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
