import { ReplayRequizResponseDto } from "./dto/requiz-response.dto";
import { ReplayController } from "./replay.controller";

/** RequizUseCase 더블 — 컨트롤러 위임만 검증. */
function makeRequizUseCase(dto: ReplayRequizResponseDto) {
  return { execute: jest.fn().mockResolvedValue(dto) };
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

describe("ReplayController", () => {
  it(":id 파라미터를 use-case 에 전달하고 DTO 를 그대로 반환한다", async () => {
    const expected = buildDto("replay-ctrl-001");
    const useCase = makeRequizUseCase(expected);
    const controller = new ReplayController(useCase as never);

    const result = await controller.requiz("replay-ctrl-001");

    expect(useCase.execute).toHaveBeenCalledWith("replay-ctrl-001");
    expect(result).toBe(expected);
  });
});
