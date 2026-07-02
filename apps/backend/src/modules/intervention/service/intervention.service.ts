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
  InterventionResponseDto,
  InterventionsReadAllResponseDto,
  InterventionsReadResponseDto,
} from "../controller/dto/intervention-responses.dto";
import {
  AssignmentRefRow,
  BotRefRow,
  IInterventionRepository,
  INTERVENTION_REPOSITORY_TOKEN,
  INTERVENTION_TYPES,
  InterventionRow,
  InterventionType,
  NewIntervention,
} from "../interface/intervention-repository.interface";

/** 서버 생성 id 의 PK 충돌 시 최대 재시도 횟수 (assignment 패턴). */
const GENERATED_ID_MAX_ATTEMPTS = 5;

/** 파싱된 발신 이벤트 1건 — FE `InterventionInput` 의 서버 수용형. */
interface SendEventInput {
  type: InterventionType;
  botId: string;
  studentId: string;
  assignmentId: string | null;
  message: string;
}

/**
 * intervention 도메인 비즈니스 로직 — interventions (개입 spec §3 + M2 개정 §3).
 *
 * FE 스토어(lib/store/interventions.ts)가 의미의 권위:
 * send/markRead/markAllRead 쓰기와 useMyInterventions(최신순)/useUnreadCount/
 * useAssignmentComment/useRemindedStudentIds 읽기의 실전판.
 *
 * 응답·에러 형태는 spec §3 을 따른다: 성공은 데이터 그대로, 에러는
 * { error: { code, message } } 봉투 — classroom 의 domain-http.error 재사용.
 */
@Injectable()
export class InterventionService {
  constructor(
    @Inject(INTERVENTION_REPOSITORY_TOKEN)
    private readonly repository: IInterventionRepository,
  ) {}

  /**
   * 교사 발신 — `POST /api/interventions` (FE 스토어 send 의 실전판).
   *
   * **bulk 배열 입력이 1차 계약**: `{ events: InterventionInput[] }` 이면
   * 검증 후 트랜잭션으로 일괄 insert (FE 리마인드가 학생별 N건을 하나의
   * 발신으로 보내는 계약). 단건 객체 본문도 1건짜리 배열로 수용한다.
   *
   * 검증: 요청자 teacher(403) + 각 봇 소유(403) + 각 studentId 그 봇
   * enrolled(400) + type enum(400) + message 비어있지 않음(400).
   * created_by 는 요청 교사로 기록(발신 경로 항상 기록 계약).
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param body - { events: [...] } 또는 이벤트 단건 객체
   * @returns 생성 이벤트 배열 봉투 (201)
   */
  async sendInterventions(
    userId: string | undefined,
    body: unknown,
  ): Promise<InterventionsReadResponseDto> {
    const inputs = this.parseSendBody(body);
    const requesterId = this.requireUserId(userId);

    const user = await this.repository.findUserById(requesterId);
    if (!user) {
      throw unauthorized("알 수 없는 사용자입니다.");
    }
    if (user.role !== "teacher") {
      throw forbidden("교사만 개입 이벤트를 발신할 수 있습니다.");
    }

    await this.assertSendTargets(user.id, inputs);

    // id 는 서버 생성(iv_<uuid 앞 8자>) — PK 충돌 시 배치 전체 재생성.
    for (let attempt = 0; attempt < GENERATED_ID_MAX_ATTEMPTS; attempt += 1) {
      const rows: NewIntervention[] = inputs.map((input) => ({
        id: `iv_${randomUUID().split("-")[0]}`,
        type: input.type,
        botId: input.botId,
        studentId: input.studentId,
        assignmentId: input.assignmentId,
        createdBy: user.id,
        message: input.message,
      }));
      const created = await this.repository.createInterventions(rows);
      if (created) {
        return { interventions: created.map((row) => this.toDto(row)) };
      }
    }
    // 16^8 공간에서 연속 충돌은 사실상 불가 — 방어적 종료.
    throw conflict("개입 이벤트 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  /**
   * 학생 인박스 — `GET /api/interventions?audience=student`
   * (FE useMyInterventions 의 서버판, created_at DESC 최신순).
   * 미읽음 수(useUnreadCount)는 이 목록의 readAt null 로 FE 가 파생한다.
   * @param audience - 'student' 만 허용 (교사 읽기는 과제별 라우트 소관)
   * @param userId - 요청 학생 id (JWT 또는 x-user-id)
   */
  async listInterventions(
    audience: string | undefined,
    userId: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    if (audience !== "student") {
      throw validationError("audience 쿼리는 student 여야 합니다.");
    }
    const requesterId = this.requireUserId(userId);

    const rows = await this.repository.findInterventionsForStudent(requesterId);
    return { interventions: rows.map((row) => this.toDto(row)) };
  }

  /**
   * 읽음 처리 — `PATCH /api/interventions/:id/read` (FE markRead 의 실전판).
   * **수신 학생 본인만**(403) 허용, read_at 은 멱등 기록 — 이미 읽음이면
   * 기존 시각 그대로 200.
   * @param userId - 요청 학생 id (JWT 또는 x-user-id)
   * @param id - 개입 이벤트 id (path)
   */
  async markRead(
    userId: string | undefined,
    id: string,
  ): Promise<InterventionResponseDto> {
    const requesterId = this.requireUserId(userId);

    const row = await this.repository.findInterventionById(id);
    if (!row) {
      throw notFound("개입 이벤트를 찾을 수 없습니다.");
    }
    if (row.studentId !== requesterId) {
      throw forbidden("수신 학생 본인만 읽음 처리할 수 있습니다.");
    }

    const updated = await this.repository.markRead(id);
    if (!updated) {
      // 조회와 갱신 사이 삭제된 경합 — 존재 부재로 통일.
      throw notFound("개입 이벤트를 찾을 수 없습니다.");
    }
    return this.toDto(updated);
  }

  /**
   * 전체 읽음 처리 — `PATCH /api/interventions/read-all`
   * (FE markAllRead 의 실전판). 요청 학생의 미읽음 전체에 read_at 기록 —
   * 자기 인박스만 만질 수 있어 별도 역할 검증이 필요 없다.
   * @param userId - 요청 학생 id (JWT 또는 x-user-id)
   * @returns { updated: 갱신 행 수 } — 미읽음 없으면 0 (멱등)
   */
  async markAllRead(
    userId: string | undefined,
  ): Promise<InterventionsReadAllResponseDto> {
    const requesterId = this.requireUserId(userId);
    const updated = await this.repository.markAllRead(requesterId);
    return { updated };
  }

  /**
   * 과제별 개입 목록 — `GET /api/assignments/:id/interventions?type=`
   * (FE useRemindedStudentIds — 리마인드 dedup / useAssignmentComment —
   * 코멘트 존재 확인의 서버판). **발사 교사(봇 소유자)만**(403) —
   * assignment listSubmissions 의 접근 규약 미러.
   * @param userId - 요청 교사 id (JWT 또는 x-user-id)
   * @param assignmentId - 과제 id (path)
   * @param type - 지정 시 그 타입만 필터 (enum 밖이면 400)
   */
  async listAssignmentInterventions(
    userId: string | undefined,
    assignmentId: string,
    type: string | undefined,
  ): Promise<InterventionsReadResponseDto> {
    const typeFilter = this.parseTypeFilter(type);
    const requesterId = this.requireUserId(userId);

    const assignment =
      await this.repository.findAssignmentRefById(assignmentId);
    if (!assignment) {
      throw notFound("과제를 찾을 수 없습니다.");
    }

    const bot = await this.repository.findBotById(assignment.botId);
    if (bot?.teacherId !== requesterId) {
      throw forbidden("발사한 교사만 개입 목록을 조회할 수 있습니다.");
    }

    const rows = await this.repository.findInterventionsForAssignment(
      assignmentId,
      typeFilter,
    );
    return { interventions: rows.map((row) => this.toDto(row)) };
  }

  /** type 쿼리 필터 — 생략 시 null(전체), enum 밖이면 400. */
  private parseTypeFilter(type: string | undefined): InterventionType | null {
    if (type === undefined) {
      return null;
    }
    if (!INTERVENTION_TYPES.includes(type as InterventionType)) {
      throw validationError(
        "type 쿼리는 remind|requiz|comment|crisis 여야 합니다.",
      );
    }
    return type as InterventionType;
  }

  /**
   * 발신 대상 일괄 검증 — 봇 존재(404)·소유(403)·과제 존재(404)·과제-봇
   * 스코프 일치(400)·enrolled(400). 한 건이라도 실패하면 전체 발신을
   * 거부한다(일괄 원자성 — insert 는 검증 전량 통과 후에만).
   * 같은 봇/과제/학생 반복 조회는 캐시로 1회화.
   */
  private async assertSendTargets(
    teacherId: string,
    inputs: SendEventInput[],
  ): Promise<void> {
    const botCache = new Map<string, BotRefRow | null>();
    const assignmentCache = new Map<string, AssignmentRefRow>();
    const enrollmentSeen = new Set<string>();

    for (const input of inputs) {
      if (!botCache.has(input.botId)) {
        botCache.set(
          input.botId,
          await this.repository.findBotById(input.botId),
        );
      }
      const bot = botCache.get(input.botId);
      if (!bot) {
        throw notFound(`클래스봇(${input.botId})을 찾을 수 없습니다.`);
      }
      if (bot.teacherId !== teacherId) {
        throw forbidden(
          "본인 소유의 클래스봇으로만 개입을 발신할 수 있습니다.",
        );
      }

      if (input.assignmentId) {
        let assignment = assignmentCache.get(input.assignmentId);
        if (!assignment) {
          const found = await this.repository.findAssignmentRefById(
            input.assignmentId,
          );
          if (!found) {
            throw notFound(`과제(${input.assignmentId})를 찾을 수 없습니다.`);
          }
          assignmentCache.set(input.assignmentId, found);
          assignment = found;
        }
        // 과제-봇 스코프 일치 — 교사가 봇을 여럿 소유해도 다른 봇의 과제를
        // 이 봇 이벤트에 붙이는 크로스 오염을 차단한다.
        if (assignment.botId !== input.botId) {
          throw validationError(
            "assignmentId 는 그 클래스봇(botId)의 과제여야 합니다.",
          );
        }
      }

      const enrollmentKey = `${input.botId} ${input.studentId}`;
      if (!enrollmentSeen.has(enrollmentKey)) {
        if (
          !(await this.repository.hasEnrollment(input.botId, input.studentId))
        ) {
          throw validationError(
            "그 클래스봇에 enrolled 된 학생에게만 개입을 발신할 수 있습니다.",
          );
        }
        enrollmentSeen.add(enrollmentKey);
      }
    }
  }

  /**
   * 발신 본문 파싱 — `{ events: [...] }`(1차 계약) 또는 단건 객체.
   * events 키가 있으면 배열이어야 하고 1건 이상(400).
   */
  private parseSendBody(body: unknown): SendEventInput[] {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    let rawEvents: unknown[];
    if (record.events !== undefined) {
      if (!Array.isArray(record.events)) {
        throw validationError("events 는 개입 이벤트 배열이어야 합니다.");
      }
      rawEvents = record.events;
    } else {
      rawEvents = [record];
    }
    if (rawEvents.length === 0) {
      throw validationError("events 는 1건 이상이어야 합니다.");
    }

    return rawEvents.map((raw) => this.parseEvent(raw));
  }

  /** 이벤트 1건 파싱 — type enum·botId/studentId·message 비어있지 않음(400). */
  private parseEvent(raw: unknown): SendEventInput {
    const record =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    const type = record.type;
    if (!INTERVENTION_TYPES.includes(type as InterventionType)) {
      throw validationError(
        "type 은 remind|requiz|comment|crisis 여야 합니다.",
      );
    }

    const botId = this.requireString(record.botId, "botId");
    const studentId = this.requireString(record.studentId, "studentId");
    const message =
      typeof record.message === "string" ? record.message.trim() : "";
    if (message.length === 0) {
      throw validationError("message 는 비어 있지 않은 문자열이어야 합니다.");
    }

    let assignmentId: string | null = null;
    if (record.assignmentId !== undefined && record.assignmentId !== null) {
      assignmentId = this.requireString(record.assignmentId, "assignmentId");
    }
    // spec §3 — remind/comment 는 대상 과제, requiz 는 새 과제가 반드시 있다.
    // crisis 만 과제 무관(null 허용).
    if (type !== "crisis" && assignmentId === null) {
      throw validationError(`${String(type)} 은 assignmentId 가 필요합니다.`);
    }

    return {
      type: type as InterventionType,
      botId,
      studentId,
      assignmentId,
      message,
    };
  }

  /** InterventionRow → 응답형 (createdAt/readAt ISO 변환, spec §3). */
  private toDto(row: InterventionRow): InterventionResponseDto {
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
    };
  }

  /** 비어 있지 않은 문자열 필수 필드. */
  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw validationError(`${field} 는 비어 있지 않은 문자열이어야 합니다.`);
    }
    return value.trim();
  }

  /** 신원이 없으면 401 봉투 — M2 개정 §3 (무신원 mock 폴백 폐지). */
  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw unauthorized("로그인이 필요합니다.");
    }
    return userId;
  }
}
