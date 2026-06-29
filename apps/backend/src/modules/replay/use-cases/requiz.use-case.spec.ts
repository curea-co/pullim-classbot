import { ReplayRequizResponseDto } from "../controller/dto/requiz-response.dto";
import { RequizUseCase } from "./requiz.use-case";

/** ReplayService 더블 — execute 위임만 검증. */
function makeReplayService(dto: ReplayRequizResponseDto) {
  return { requiz: jest.fn().mockResolvedValue(dto) };
}

function buildDto(replayId: string): ReplayRequizResponseDto {
  const dto = new ReplayRequizResponseDto();
  dto.replayId = replayId;
  dto.attemptId = `mock-${replayId}`;
  dto.questions = [];
  dto.degraded = true;
  dto.generatedAt = new Date().toISOString();
  return dto;
}

describe("RequizUseCase", () => {
  it("replayId 를 서비스에 전달하고 DTO 를 그대로 반환한다", async () => {
    const expected = buildDto("replay-001");
    const service = makeReplayService(expected);
    const useCase = new RequizUseCase(service as never);

    const result = await useCase.execute("replay-001");

    expect(service.requiz).toHaveBeenCalledWith("replay-001");
    expect(result).toBe(expected);
  });
});
