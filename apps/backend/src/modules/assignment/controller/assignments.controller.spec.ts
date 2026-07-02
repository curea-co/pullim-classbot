import { AssignmentsController } from "./assignments.controller";

/** use-case 더블 — 컨트롤러 위임만 검증 (bots.controller.spec 패턴). */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

function makeController(overrides: Partial<Record<"list", unknown>> = {}) {
  const list =
    (overrides.list as ReturnType<typeof makeUseCase>) ?? makeUseCase(null);
  return {
    controller: new AssignmentsController(list as never),
    list,
  };
}

describe("AssignmentsController", () => {
  it("GET /assignments — audience 쿼리와 요청 사용자 id 를 list use-case 에 위임한다", async () => {
    const expected = { assignments: [] };
    const list = makeUseCase(expected);
    const { controller } = makeController({ list });

    const result = await controller.list("student", "s2");

    expect(list.execute).toHaveBeenCalledWith("student", "s2");
    expect(result).toBe(expected);
  });
});
