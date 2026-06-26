import { QgenUnavailableError } from "../infrastructure/qgen-unavailable.error";
import type {
  IQgenClient,
  QgenRequizResult,
} from "../interface/qgen-client.interface";
import { ReplayService } from "./replay.service";

// ---------------------------------------------------------------------------
// 스텁 팩토리
// ---------------------------------------------------------------------------

/** ConfigService 스텁 — qgen.enabled 만 제공. */
function makeConfigService(enabled: boolean) {
  return {
    get: jest.fn((key: string) => {
      if (key === "qgen.enabled") return enabled;
      return undefined;
    }),
  };
}

/** IQgenClient mock — jest.fn() 으로 결과/에러를 제어. */
function makeQgenClient(): jest.Mocked<Pick<IQgenClient, "requiz">> {
  return { requiz: jest.fn() };
}

const MOCK_RESULT: QgenRequizResult = {
  questions: [
    {
      stem: "qgen-question-stem",
      options: ["①", "②", "③", "④", "⑤"],
      answerIndex: 2,
      explanation: "qgen explanation",
      subjectLabel: "영어 · 빈칸 추론",
    },
  ],
  setQuestionId: "qgen-set-id-001",
};

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function buildService(
  enabled: boolean,
  client: jest.Mocked<Pick<IQgenClient, "requiz">>,
): ReplayService {
  return new ReplayService(makeConfigService(enabled) as never, client);
}

// ---------------------------------------------------------------------------
// 테스트
// ---------------------------------------------------------------------------

describe("ReplayService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("qgen flag OFF", () => {
    it("클라이언트를 호출하지 않고 mock 문항과 degraded:true 를 반환한다", async () => {
      const client = makeQgenClient();
      const service = buildService(false, client);

      const result = await service.requiz("replay-abc");

      expect(client.requiz).not.toHaveBeenCalled();
      expect(result.replayId).toBe("replay-abc");
      expect(result.attemptId).toBe("mock-replay-abc");
      expect(result.degraded).toBe(true);
      expect(result.questions.length).toBeGreaterThan(0);
      expect(typeof result.generatedAt).toBe("string");
    });
  });

  describe("qgen flag ON + client 성공", () => {
    it("client 문항을 반환하고 degraded:false, attemptId = setQuestionId 를 설정한다", async () => {
      const client = makeQgenClient();
      client.requiz.mockResolvedValue(MOCK_RESULT);
      const service = buildService(true, client);

      const result = await service.requiz("replay-xyz");

      expect(client.requiz).toHaveBeenCalledWith({ count: 5 });
      expect(result.replayId).toBe("replay-xyz");
      expect(result.attemptId).toBe("qgen-set-id-001");
      expect(result.questions).toEqual(MOCK_RESULT.questions);
      expect(result.degraded).toBe(false);
      expect(typeof result.generatedAt).toBe("string");
    });
  });

  describe("qgen flag ON + client throws QgenUnavailableError", () => {
    it("예외를 전파하지 않고 mock 폴백으로 degrade 하며 degraded:true 를 반환한다", async () => {
      const client = makeQgenClient();
      client.requiz.mockRejectedValue(
        new QgenUnavailableError("qgen server down"),
      );
      const service = buildService(true, client);

      const result = await service.requiz("replay-deg");

      expect(client.requiz).toHaveBeenCalledTimes(1);
      expect(result.replayId).toBe("replay-deg");
      expect(result.attemptId).toBe("mock-replay-deg");
      expect(result.degraded).toBe(true);
      expect(result.questions.length).toBeGreaterThan(0);
    });
  });

  describe("qgen flag ON + client throws unexpected error", () => {
    it("QgenUnavailableError 가 아닌 예외는 전파한다", async () => {
      const client = makeQgenClient();
      client.requiz.mockRejectedValue(new Error("unexpected"));
      const service = buildService(true, client);

      await expect(service.requiz("replay-err")).rejects.toThrow("unexpected");
    });
  });
});
