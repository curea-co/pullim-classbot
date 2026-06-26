import type { ReplayQuestion } from "@pullim-classbot/types";

import { QgenClient } from "./qgen.client";
import { QgenUnavailableError } from "./qgen-unavailable.error";

// ---------------------------------------------------------------------------
// ConfigService 스텁 — qgen namespace 만 제공.
// ---------------------------------------------------------------------------

const DEMO_COORDINATE = {
  taskFamilyId: "tf-uuid",
  subjectId: "sub-uuid",
  gradeId: "grade-uuid",
  achievementStandardId: "ach-uuid",
  sourceId: "src-uuid",
};

const BASE_URL = "https://qgen.example.com";
const API_KEY = "test-api-key";

function makeConfig(
  demoCoordinate: typeof DEMO_COORDINATE | null = DEMO_COORDINATE,
) {
  return {
    get: jest.fn((key: string) => {
      if (key === "qgen.baseUrl") return BASE_URL;
      if (key === "qgen.apiKey") return API_KEY;
      if (key === "qgen.demoCoordinate") return demoCoordinate;
      throw new Error(`unexpected config key: ${key}`);
    }),
  };
}

// ---------------------------------------------------------------------------
// 유효한 qgen-ai 래핑 페이로드 fixture
// ---------------------------------------------------------------------------

function makeQgenPayload(overrides?: Partial<Record<string, unknown>>) {
  return {
    data: {
      set_question_id: "set-q-id-1",
      questions: [
        {
          stem: "다음 빈칸에 알맞은 것은?",
          passage_paragraphs: ["지문 단락 1.", "지문 단락 2."],
          boxed_lines: null,
          options: ["①선택1", "②선택2", "③선택3", "④선택4", "⑤선택5"],
          answer_index: 2,
          explanation: "정답 해설",
          subject_label: "영어 · 빈칸 추론",
          ...overrides,
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 공통 fetch mock 헬퍼
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown): jest.SpyInstance {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    // eslint-disable-next-line @typescript-eslint/require-await
    json: async () => body,
  } as Response);
}

function mockFetchError(status: number): jest.SpyInstance {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce({
    ok: false,
    status,
    // eslint-disable-next-line @typescript-eslint/require-await
    json: async () => ({ error: "server error" }),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QgenClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("(a) 정상 페이로드 → ReplayQuestion[] 매핑", () => {
    it("passage_paragraphs → passage.paragraphs, answer_index → answerIndex, subject_label → subjectLabel 이 올바르게 매핑된다", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk(makeQgenPayload());

      const result = await client.requiz({ count: 1 });

      expect(result.setQuestionId).toBe("set-q-id-1");
      expect(result.questions).toHaveLength(1);

      const q: ReplayQuestion = result.questions[0];
      expect(q.stem).toBe("다음 빈칸에 알맞은 것은?");
      expect(q.passage).toEqual({
        paragraphs: ["지문 단락 1.", "지문 단락 2."],
      });
      expect(q.boxed).toBeUndefined();
      expect(q.options).toHaveLength(5);
      expect(q.answerIndex).toBe(2);
      expect(q.explanation).toBe("정답 해설");
      expect(q.subjectLabel).toBe("영어 · 빈칸 추론");
    });

    it("boxed_lines 가 있으면 boxed.lines 로 매핑된다", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk(
        makeQgenPayload({
          passage_paragraphs: null,
          boxed_lines: ["조건 1", "조건 2"],
        }),
      );

      const result = await client.requiz({ count: 1 });
      const q = result.questions[0];
      expect(q.passage).toBeUndefined();
      expect(q.boxed).toEqual({ lines: ["조건 1", "조건 2"] });
    });

    it("올바른 URL + headers + body 로 fetch 를 호출한다", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);
      const spy = mockFetchOk(makeQgenPayload());

      await client.requiz({ count: 3 });

      expect(spy).toHaveBeenCalledTimes(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${BASE_URL}/api/v1/ai/classbot/requiz`);
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe(
        API_KEY,
      );
      expect((init.headers as Record<string, string>)["x-source-id"]).toBe(
        DEMO_COORDINATE.sourceId,
      );
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.count).toBe(3);
      expect(body.sourceId).toBe(DEMO_COORDINATE.sourceId);
    });
  });

  describe("(b) 필드 누락 페이로드 → QgenUnavailableError", () => {
    it("stem 이 없으면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      const malformed = makeQgenPayload({ stem: undefined });
      mockFetchOk(malformed);

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });

    it("answer_index 가 없으면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      const malformed = makeQgenPayload({ answer_index: undefined });
      mockFetchOk(malformed);

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });

    it("data 래퍼 자체가 없으면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk({ questions: [] }); // data 래퍼 없음

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });
  });

  describe("(c) 비-2xx 응답 → QgenUnavailableError", () => {
    it("500 응답 시 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchError(500);

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });

    it("422 응답 시 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchError(422);

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });
  });

  describe("(d) fetch 가 AbortError 로 reject → QgenUnavailableError", () => {
    it("타임아웃(AbortError) 시 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      const abortError = new DOMException("signal timed out", "AbortError");
      jest.spyOn(global, "fetch").mockRejectedValueOnce(abortError);

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });

    it("일반 네트워크 에러 시에도 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      jest
        .spyOn(global, "fetch")
        .mockRejectedValueOnce(new Error("network failure"));

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });
  });

  describe("(e) demoCoordinate null → QgenUnavailableError", () => {
    it("demoCoordinate 가 null 이면 fetch 없이 throws QgenUnavailableError", async () => {
      const config = makeConfig(null);
      const client = new QgenClient(config as never);

      const spy = jest.spyOn(global, "fetch");

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("(f) options 요소 타입 검증 → QgenUnavailableError", () => {
    it("options 배열에 non-string 요소가 있으면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk(makeQgenPayload({ options: [null, 42] }));

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });
  });

  describe("(g) answer_index 범위 검증 → QgenUnavailableError", () => {
    it("answer_index 가 options.length 과 같으면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk(
        makeQgenPayload({
          options: ["①선택1", "②선택2", "③선택3"],
          answer_index: 3, // >= options.length
        }),
      );

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });

    it("answer_index 가 음수이면 throws QgenUnavailableError", async () => {
      const config = makeConfig();
      const client = new QgenClient(config as never);

      mockFetchOk(
        makeQgenPayload({
          options: ["①선택1", "②선택2"],
          answer_index: -1,
        }),
      );

      await expect(client.requiz({ count: 1 })).rejects.toThrow(
        QgenUnavailableError,
      );
    });
  });
});
