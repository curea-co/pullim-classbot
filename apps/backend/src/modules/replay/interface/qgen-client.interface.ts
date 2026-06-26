import type { ReplayQuestion } from "@pullim-classbot/types";

/** QgenClient 에 전달하는 입력. 좌표는 ConfigService 에서 채운다. */
export interface QgenRequizInput {
  count: number;
}

/** QgenClient 가 반환하는 결과. */
export interface QgenRequizResult {
  questions: ReplayQuestion[];
  setQuestionId: string;
}

/**
 * qgen-ai requiz 엔드포인트 추상. 구현체는 infrastructure 의 QgenClient.
 * Service 는 이 인터페이스로만 외부 AI 에 접근한다.
 */
export abstract class IQgenClient {
  abstract requiz(input: QgenRequizInput): Promise<QgenRequizResult>;
}

/** DI 주입 토큰 — auth 의 repository 토큰 패턴을 미러한다. */
export const QGEN_CLIENT_TOKEN = Symbol("QGEN_CLIENT_TOKEN");
