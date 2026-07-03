import { MeController } from "./me.controller";

/** use-case 더블 — 컨트롤러 위임만 검증 (interventions.controller.spec 패턴). */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

/** @Res({ passthrough }) 더블 — status 설정만 관찰. */
function makeResponse() {
  return { status: jest.fn() };
}

const SUB = "7f3a2b10-9c4d-4e5f-8a6b-1c2d3e4f5a6b";

describe("MeController", () => {
  it("POST /me/sync — 신원 id 와 본문을 sync use-case 에 위임하고 신규면 201", async () => {
    const user = { id: SUB, name: "김지유", role: "teacher" };
    const sync = makeUseCase({ created: true, user });
    const controller = new MeController(sync as never);
    const res = makeResponse();
    const body = { name: "김지유", role: "teacher" };

    const result = await controller.sync(body, SUB, res as never);

    expect(sync.execute).toHaveBeenCalledWith(SUB, body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(result).toBe(user);
  });

  it("POST /me/sync — 기존 신원(멱등 재호출)이면 200", async () => {
    const user = { id: SUB, name: "김지유(개명)", role: "teacher" };
    const sync = makeUseCase({ created: false, user });
    const controller = new MeController(sync as never);
    const res = makeResponse();

    const result = await controller.sync(
      { name: "김지유(개명)", role: "teacher" },
      SUB,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toBe(user);
  });
});
