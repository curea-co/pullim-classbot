import type { ReplayQuestion } from "@pullim-classbot/types";

/**
 * POST /api/replay/:id/requiz 응답 DTO.
 * envelope 는 BE 소유 — FE 소비 시 packages/types 로 승격(PR-6 예정).
 */
export class ReplayRequizResponseDto {
  /** 요청된 replay(수업) ID — 클라이언트가 요청에 실은 값 그대로 반환. */
  replayId: string;

  /**
   * 시도 식별자.
   * qgen 성공 시 → qgen setQuestionId.
   * mock 폴백 시 → `mock-{replayId}`.
   */
  attemptId: string;

  /** 문항 목록. */
  questions: ReplayQuestion[];

  /**
   * qgen 폴백 여부.
   * true = flag-off 또는 QgenUnavailableError 로 인해 mock 문항을 반환했음.
   * false = qgen-ai 실 문항.
   */
  degraded: boolean;

  /** ISO-8601 생성 시각. */
  generatedAt: string;
}
