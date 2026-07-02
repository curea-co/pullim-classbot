import { BotsController } from "./bots.controller";

/** use-case 더블 — 컨트롤러 위임만 검증. */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe("BotsController", () => {
  it("GET /bots — role 쿼리와 요청 사용자 id 를 list-bots use-case 에 위임한다", async () => {
    const expected = { bots: [] };
    const listBots = makeUseCase(expected);
    const controller = new BotsController(
      listBots as never,
      makeUseCase(null) as never,
    );

    const result = await controller.list("student", "s2");

    expect(listBots.execute).toHaveBeenCalledWith("student", "s2");
    expect(result).toBe(expected);
  });

  it("GET /bots/:id — id 를 get-bot use-case 에 위임한다", async () => {
    const expected = { id: "cb_001" };
    const getBot = makeUseCase(expected);
    const controller = new BotsController(
      makeUseCase(null) as never,
      getBot as never,
    );

    const result = await controller.detail("cb_001");

    expect(getBot.execute).toHaveBeenCalledWith("cb_001");
    expect(result).toBe(expected);
  });
});
