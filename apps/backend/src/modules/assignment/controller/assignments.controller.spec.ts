import { AssignmentsController } from "./assignments.controller";

/** use-case 더블 — 컨트롤러 위임만 검증 (bots.controller.spec 패턴). */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe("AssignmentsController", () => {
  it("GET /assignments — audience 쿼리와 요청 사용자 id 를 list use-case 에 위임한다", async () => {
    const expected = { assignments: [] };
    const list = makeUseCase(expected);
    const controller = new AssignmentsController(
      list as never,
      makeUseCase(null) as never,
    );

    const result = await controller.list("student", "s2");

    expect(list.execute).toHaveBeenCalledWith("student", "s2");
    expect(result).toBe(expected);
  });

  it("GET /assignments/:id — id 와 요청 사용자 id 를 get use-case 에 위임한다", async () => {
    const expected = { assignment: { id: "as_user_a1b2c3d4" } };
    const get = makeUseCase(expected);
    const controller = new AssignmentsController(
      makeUseCase(null) as never,
      get as never,
    );

    const result = await controller.detail("as_user_a1b2c3d4", "s2");

    expect(get.execute).toHaveBeenCalledWith("as_user_a1b2c3d4", "s2");
    expect(result).toBe(expected);
  });
});
