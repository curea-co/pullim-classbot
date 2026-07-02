import { EnrollmentsController } from "./enrollments.controller";

/** express Response 더블 — status 만 검증. */
function makeResponse() {
  return { status: jest.fn() };
}

const ENROLLMENT = {
  botId: "cb_001",
  classroomId: "cr_math_a",
  classroomLabel: "고2 미적분 A반",
  assignedBy: "김수학 선생님",
  assignedAt: "2026-07-03T10:00:00.000Z",
  via: "대치프리미엄 수학학원",
};

describe("EnrollmentsController", () => {
  it("POST /enrollments — 사용자 id·본문을 use-case 에 위임하고 신규면 201", async () => {
    const useCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ created: true, enrollment: ENROLLMENT }),
    };
    const controller = new EnrollmentsController(useCase as never);
    const res = makeResponse();
    const body = { code: "MATH-2024" };

    const result = await controller.join(body, "s2", res as never);

    expect(useCase.execute).toHaveBeenCalledWith("s2", body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(result).toBe(ENROLLMENT);
  });

  it("이미 등록된 경우(멱등)면 200 으로 기존 enrollment 를 반환한다", async () => {
    const useCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ created: false, enrollment: ENROLLMENT }),
    };
    const controller = new EnrollmentsController(useCase as never);
    const res = makeResponse();

    const result = await controller.join(
      { code: "MATH-2024" },
      "s2",
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toBe(ENROLLMENT);
  });
});
