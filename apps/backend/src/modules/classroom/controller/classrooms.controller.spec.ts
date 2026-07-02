import { ClassroomsController } from "./classrooms.controller";

/** use-case 더블 — 컨트롤러 위임만 검증. */
function makeUseCase<T>(result: T) {
  return { execute: jest.fn().mockResolvedValue(result) };
}

/** express Response 더블 — status 만 검증. */
function makeResponse() {
  return { status: jest.fn() };
}

const ENROLLMENT = {
  botId: "cb_001",
  classroomId: "cr_math_a",
  classroomLabel: "고2 미적분 A반",
  assignedBy: "김수학 선생님",
  assignedAt: "2026-07-04T09:00:00.000Z",
  via: "대치프리미엄 수학학원",
};

describe("ClassroomsController", () => {
  it("GET /classrooms — 요청 사용자 id 를 use-case 에 위임하고 결과를 그대로 반환한다", async () => {
    const expected = [{ id: "cr_math_a" }];
    const list = makeUseCase(expected);
    const controller = new ClassroomsController(
      list as never,
      makeUseCase(null) as never,
    );

    const result = await controller.list("teacher_001");

    expect(list.execute).toHaveBeenCalledWith("teacher_001");
    expect(result).toBe(expected);
  });

  it("POST /classrooms/:id/enrollments — 교사 id·반 id·본문을 위임하고 신규면 201", async () => {
    const assign = makeUseCase({ created: true, enrollment: ENROLLMENT });
    const controller = new ClassroomsController(
      makeUseCase(null) as never,
      assign as never,
    );
    const res = makeResponse();
    const body = { studentId: "s2", botId: "cb_001" };

    const result = await controller.assign(
      "cr_math_a",
      body,
      "teacher_001",
      res as never,
    );

    expect(assign.execute).toHaveBeenCalledWith(
      "teacher_001",
      "cr_math_a",
      body,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(result).toBe(ENROLLMENT);
  });

  it("이미 배정된 경우(멱등)면 200", async () => {
    const assign = makeUseCase({ created: false, enrollment: ENROLLMENT });
    const controller = new ClassroomsController(
      makeUseCase(null) as never,
      assign as never,
    );
    const res = makeResponse();

    const result = await controller.assign(
      "cr_math_a",
      { studentId: "s2", botId: "cb_001" },
      "teacher_001",
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toBe(ENROLLMENT);
  });
});
