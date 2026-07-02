import type { InterventionType } from "../../interface/intervention-repository.interface";

/**
 * 개입 이벤트 한 건 응답형 — FE `InterventionEvent`
 * (apps/classbot/lib/store/interventions.ts) 필드명 camelCase 1:1
 * (id/type/botId/studentId/assignmentId/message/createdAt/readAt).
 * createdAt·readAt 은 spec §3 에 따라 ISO-8601 문자열.
 * `createdBy` 는 상위집합 확장(발신 경로 기록 계약) — FE 소비자는 무시한다.
 */
export interface InterventionResponseDto {
  id: string;
  type: InterventionType;
  botId: string;
  studentId: string;
  /** crisis 는 null — FE optional 필드와 정합(null 은 부재로 소비). */
  assignmentId: string | null;
  message: string;
  createdAt: string;
  readAt: string | null;
  /** 상위집합 — 발신 교사 id (FK SET NULL 로 null 가능). */
  createdBy: string | null;
}

/**
 * `POST /api/interventions`(생성 배열) · `GET /api/interventions` ·
 * `GET /api/assignments/:id/interventions` 공용 응답 봉투.
 */
export interface InterventionsReadResponseDto {
  interventions: InterventionResponseDto[];
}

/** `PATCH /api/interventions/read-all` 응답 — 갱신된 행 수. */
export interface InterventionsReadAllResponseDto {
  updated: number;
}
