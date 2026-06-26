import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReplayQuestion } from "@pullim-classbot/types";

import type {
  IQgenClient,
  QgenRequizInput,
  QgenRequizResult,
} from "../interface/qgen-client.interface";
import { QgenUnavailableError } from "./qgen-unavailable.error";

// ---------------------------------------------------------------------------
// qgen-ai 내부 응답 형태 — apps/backend 소유(공유 패키지에 노출 안 함).
// ---------------------------------------------------------------------------

interface QgenRawQuestion {
  stem: string;
  passage_paragraphs?: string[] | null;
  boxed_lines?: string[] | null;
  options: string[];
  answer_index: number;
  explanation: string;
  subject_label: string;
}

interface QgenApiResponse {
  data: {
    questions: QgenRawQuestion[];
    set_question_id: string;
  };
}

// ---------------------------------------------------------------------------
// 경계 런타임 검증 가드
// ---------------------------------------------------------------------------

/**
 * qgen-ai 가 내려준 개별 문항 형태를 런타임에 검증한다.
 * 필수 필드가 하나라도 타입 불일치/누락이면 QgenUnavailableError 를 throw.
 */
function assertQgenQuestion(q: unknown): asserts q is QgenRawQuestion {
  if (typeof q !== "object" || q === null) {
    throw new QgenUnavailableError("qgen response: question is not an object");
  }

  const obj = q as Record<string, unknown>;

  if (typeof obj["stem"] !== "string") {
    throw new QgenUnavailableError(
      "qgen response: question.stem must be string",
    );
  }
  if (!Array.isArray(obj["options"])) {
    throw new QgenUnavailableError(
      "qgen response: question.options must be array",
    );
  }

  // options 배열의 모든 요소가 string 이어야 하고, 비어있지 않아야 함.
  const options = obj["options"] as unknown[];
  if (options.length === 0) {
    throw new QgenUnavailableError(
      "qgen response: question.options must not be empty",
    );
  }
  for (let i = 0; i < options.length; i++) {
    if (typeof options[i] !== "string") {
      throw new QgenUnavailableError(
        "qgen response: question.options must contain only strings",
      );
    }
  }

  if (typeof obj["answer_index"] !== "number") {
    throw new QgenUnavailableError(
      "qgen response: question.answer_index must be number",
    );
  }

  // answer_index 가 정수이며 0 <= answer_index < options.length 범위 내여야 함.
  const answerIndex = obj["answer_index"];
  if (!Number.isInteger(answerIndex)) {
    throw new QgenUnavailableError(
      "qgen response: question.answer_index must be an integer",
    );
  }
  if (answerIndex < 0 || answerIndex >= options.length) {
    throw new QgenUnavailableError(
      "qgen response: question.answer_index must be within bounds of options array",
    );
  }

  // passage_paragraphs 가 존재하면 모든 요소가 string 이어야 함.
  if (obj["passage_paragraphs"] != null) {
    if (!Array.isArray(obj["passage_paragraphs"])) {
      throw new QgenUnavailableError(
        "qgen response: question.passage_paragraphs must be array",
      );
    }
    const paragraphs = obj["passage_paragraphs"] as unknown[];
    for (let i = 0; i < paragraphs.length; i++) {
      if (typeof paragraphs[i] !== "string") {
        throw new QgenUnavailableError(
          "qgen response: question.passage_paragraphs must contain only strings",
        );
      }
    }
  }

  // boxed_lines 가 존재하면 모든 요소가 string 이어야 함.
  if (obj["boxed_lines"] != null) {
    if (!Array.isArray(obj["boxed_lines"])) {
      throw new QgenUnavailableError(
        "qgen response: question.boxed_lines must be array",
      );
    }
    const lines = obj["boxed_lines"] as unknown[];
    for (let i = 0; i < lines.length; i++) {
      if (typeof lines[i] !== "string") {
        throw new QgenUnavailableError(
          "qgen response: question.boxed_lines must contain only strings",
        );
      }
    }
  }

  if (typeof obj["explanation"] !== "string") {
    throw new QgenUnavailableError(
      "qgen response: question.explanation must be string",
    );
  }
  if (typeof obj["subject_label"] !== "string") {
    throw new QgenUnavailableError(
      "qgen response: question.subject_label must be string",
    );
  }
}

/**
 * qgen-ai ApiResponse 래퍼({ data: { questions, set_question_id } })를 검증.
 */
function assertQgenApiResponse(body: unknown): asserts body is QgenApiResponse {
  if (typeof body !== "object" || body === null) {
    throw new QgenUnavailableError("qgen response: body is not an object");
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj["data"] !== "object" || obj["data"] === null) {
    throw new QgenUnavailableError("qgen response: missing data wrapper");
  }

  const data = obj["data"] as Record<string, unknown>;

  if (!Array.isArray(data["questions"])) {
    throw new QgenUnavailableError(
      "qgen response: data.questions must be array",
    );
  }
  if (typeof data["set_question_id"] !== "string") {
    throw new QgenUnavailableError(
      "qgen response: data.set_question_id must be string",
    );
  }

  for (const q of data["questions"] as unknown[]) {
    assertQgenQuestion(q);
  }
}

// ---------------------------------------------------------------------------
// 매핑 함수
// ---------------------------------------------------------------------------

function mapQgenQuestion(raw: QgenRawQuestion): ReplayQuestion {
  return {
    stem: raw.stem,
    passage:
      raw.passage_paragraphs && raw.passage_paragraphs.length > 0
        ? { paragraphs: raw.passage_paragraphs }
        : undefined,
    boxed:
      raw.boxed_lines && raw.boxed_lines.length > 0
        ? { lines: raw.boxed_lines }
        : undefined,
    options: raw.options,
    answerIndex: raw.answer_index,
    explanation: raw.explanation,
    subjectLabel: raw.subject_label,
  };
}

// ---------------------------------------------------------------------------
// QgenClient
// ---------------------------------------------------------------------------

/**
 * qgen-ai requiz 엔드포인트 클라이언트.
 * native fetch + 30s AbortSignal 타임아웃 사용 — 외부 의존성 추가 없음.
 * 응답은 경계에서 assertQgenApiResponse 로 런타임 검증 후 ReplayQuestion 으로 매핑.
 * 비-2xx / malformed / 타임아웃 / 좌표 미설정 → QgenUnavailableError.
 */
@Injectable()
export class QgenClient implements IQgenClient {
  constructor(private readonly configService: ConfigService) {}

  async requiz(input: QgenRequizInput): Promise<QgenRequizResult> {
    const baseUrl = this.configService.get<string>("qgen.baseUrl");
    const apiKey = this.configService.get<string>("qgen.apiKey");
    const demoCoordinate = this.configService.get<{
      taskFamilyId: string;
      subjectId: string;
      gradeId: string;
      achievementStandardId: string;
      sourceId: string;
    } | null>("qgen.demoCoordinate");

    if (!demoCoordinate) {
      throw new QgenUnavailableError(
        "QGen demo coordinate is not configured (QGEN_DEMO_* env vars missing)",
      );
    }

    const url = `${baseUrl}/api/v1/ai/classbot/requiz`;
    const body = JSON.stringify({
      taskFamilyId: demoCoordinate.taskFamilyId,
      subjectId: demoCoordinate.subjectId,
      gradeId: demoCoordinate.gradeId,
      achievementStandardId: demoCoordinate.achievementStandardId,
      sourceId: demoCoordinate.sourceId,
      count: input.count,
    });

    const fetchOptions = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey ?? "",
        "x-source-id": demoCoordinate.sourceId,
      },
      body,
      signal: AbortSignal.timeout(30000),
    };

    // 일시적 실패(fetch reject 또는 5xx) 시 한 번 재시도한다.
    // 4xx / validation 실패 / null demoCoordinate 는 즉시 throw (재시도 없음).
    const attemptFetch = async (): Promise<
      { response: Response; transient: false } | { transient: true }
    > => {
      let response: Response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          signal: AbortSignal.timeout(30000),
        });
      } catch {
        return { transient: true };
      }

      // 5xx → transient; 4xx → non-transient (즉시 throw)
      if (!response.ok) {
        if (response.status >= 500) {
          return { transient: true };
        }
        throw new QgenUnavailableError(
          `QGen responded with non-2xx status: ${response.status}`,
        );
      }

      return { response, transient: false };
    };

    let attempt = await attemptFetch();
    if (attempt.transient) {
      // 한 번만 재시도
      attempt = await attemptFetch();
      if (attempt.transient) {
        throw new QgenUnavailableError("QGen request failed (network/timeout)");
      }
    }

    const response = attempt.response;

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new QgenUnavailableError("QGen response body is not valid JSON");
    }

    assertQgenApiResponse(parsed);

    const questions = parsed.data.questions.map(mapQgenQuestion);
    return { questions, setQuestionId: parsed.data.set_question_id };
  }
}
