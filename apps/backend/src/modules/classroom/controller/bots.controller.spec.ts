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
      makeUseCase(null) as never,
    );

    const result = await controller.list("student", "s2");

    expect(listBots.execute).toHaveBeenCalledWith("student", "s2");
    expect(result).toBe(expected);
  });

  it("GET /bots/:id — id 와 요청 사용자 id 를 get-bot use-case 에 위임한다", async () => {
    const expected = { id: "cb_001" };
    const getBot = makeUseCase(expected);
    const controller = new BotsController(
      makeUseCase(null) as never,
      getBot as never,
      makeUseCase(null) as never,
    );

    const result = await controller.detail("cb_001", "s2");

    expect(getBot.execute).toHaveBeenCalledWith("cb_001", "s2");
    expect(result).toBe(expected);
  });

  it("POST /bots/:id/join-codes — 교사 id·봇 id·본문을 issue use-case 에 위임한다", async () => {
    const expected = { code: "A7FK-3MQ9" };
    const issue = makeUseCase(expected);
    const controller = new BotsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      issue as never,
    );
    const body = { classroomId: "cr_math_a" };

    const result = await controller.issueJoinCode(
      "cb_001",
      body,
      "teacher_001",
    );

    expect(issue.execute).toHaveBeenCalledWith("teacher_001", "cb_001", body);
    expect(result).toBe(expected);
  });
});
