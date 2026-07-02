import type {
  ClassroomRow,
  CurriculumUnitRow,
  EnrolledBotRow,
} from "../../interface/classroom-repository.interface";

/**
 * 교사 시점 봇 한 행 — BotRow 의 응답형(createdAt ISO 문자열).
 */
export interface OwnedBotDto {
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
  createdAt: string;
}

/**
 * `GET /api/bots` 응답 봉투 — FE `BotsReadResponse`
 * (apps/classbot/hooks/api/read/types.ts)와 정확히 일치해야 한다.
 * role=student 행은 EnrolledBotRow(FE BotReadRow 1:1), role=teacher 행은 OwnedBotDto.
 */
export interface BotsReadResponseDto {
  bots: Array<EnrolledBotRow | OwnedBotDto>;
}

/** `GET /api/bots/:id` 봇 상세 — spec §4.2 (봇 + curriculum + settings). */
export interface BotDetailResponseDto extends OwnedBotDto {
  curriculumUnits: CurriculumUnitRow[];
  settings: Record<string, unknown> | null;
}

/** `GET /api/classrooms` — 반 목록 (spec §3: 배열 그대로, wrapper 없음). */
export type ClassroomsReadResponseDto = ClassroomRow[];

/**
 * enrollment 응답 — mock `resolveClassCode`(StudentEnrollment) 형태 재현.
 * assignedAt 은 spec §3 에 따라 ISO-8601 문자열.
 */
export interface EnrollmentResponseDto {
  botId: string;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  assignedAt: string;
  via: string;
}

/** `POST /api/bots/:id/join-codes` 응답 — 발급된 코드. */
export interface JoinCodeResponseDto {
  code: string;
  botId: string;
  classroomId: string;
  /** 발급 경로는 항상 non-null (M2 개정 §1). */
  teacherId: string;
  createdAt: string;
}
