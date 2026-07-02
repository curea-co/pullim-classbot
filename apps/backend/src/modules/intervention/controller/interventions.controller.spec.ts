import { AssignmentInterventionsController } from "./assignment-interventions.controller";
import { InterventionsController } from "./interventions.controller";

/** use-case 더블 — 컨트롤러 위임만 검증 (assignments.controller.spec 패턴). */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

describe("InterventionsController", () => {
  it("POST /interventions — 교사 id 와 본문을 send use-case 에 위임한다 (201)", async () => {
    const expected = { interventions: [{ id: "iv_a1b2c3d4" }] };
    const send = makeUseCase(expected);
    const controller = new InterventionsController(
      send as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
    );
    const body = { events: [{ type: "remind", botId: "cb_001" }] };

    const result = await controller.send(body, "teacher_001");

    expect(send.execute).toHaveBeenCalledWith("teacher_001", body);
    expect(result).toBe(expected);
  });

  it("GET /interventions — audience 쿼리와 요청 사용자 id 를 list use-case 에 위임한다", async () => {
    const expected = { interventions: [] };
    const list = makeUseCase(expected);
    const controller = new InterventionsController(
      makeUseCase(null) as never,
      list as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
    );

    const result = await controller.list("student", "s2");

    expect(list.execute).toHaveBeenCalledWith("student", "s2");
    expect(result).toBe(expected);
  });

  it("PATCH /interventions/:id/read — id 와 요청 사용자 id 를 mark-read use-case 에 위임한다", async () => {
    const expected = { id: "iv_a1b2c3d4", readAt: "2026-07-03T05:00:00.000Z" };
    const markRead = makeUseCase(expected);
    const controller = new InterventionsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      markRead as never,
      makeUseCase(null) as never,
    );

    const result = await controller.markRead("iv_a1b2c3d4", "s2");

    expect(markRead.execute).toHaveBeenCalledWith("s2", "iv_a1b2c3d4");
    expect(result).toBe(expected);
  });

  it("PATCH /interventions/read-all — 요청 사용자 id 를 mark-all-read use-case 에 위임한다", async () => {
    const expected = { updated: 2 };
    const markAllRead = makeUseCase(expected);
    const controller = new InterventionsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      markAllRead as never,
    );

    const result = await controller.markAllRead("s2");

    expect(markAllRead.execute).toHaveBeenCalledWith("s2");
    expect(result).toBe(expected);
  });
});

describe("AssignmentInterventionsController", () => {
  it("GET /assignments/:id/interventions — 과제 id·type 쿼리·교사 id 를 use-case 에 위임한다", async () => {
    const expected = { interventions: [] };
    const list = makeUseCase(expected);
    const controller = new AssignmentInterventionsController(list as never);

    const result = await controller.list(
      "as_user_a1b2c3d4",
      "remind",
      "teacher_001",
    );

    expect(list.execute).toHaveBeenCalledWith(
      "teacher_001",
      "as_user_a1b2c3d4",
      "remind",
    );
    expect(result).toBe(expected);
  });
});
