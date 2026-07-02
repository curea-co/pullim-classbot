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
      makeUseCase(null) as never,
      makeUseCase(null) as never,
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
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
    );

    const result = await controller.detail("as_user_a1b2c3d4", "s2");

    expect(get.execute).toHaveBeenCalledWith("as_user_a1b2c3d4", "s2");
    expect(result).toBe(expected);
  });
});

describe("AssignmentsController.dispatch", () => {
  it("POST /assignments — 교사 id 와 본문을 dispatch use-case 에 위임한다", async () => {
    const expected = { id: "as_user_a1b2c3d4" };
    const dispatch = makeUseCase(expected);
    const controller = new AssignmentsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      dispatch as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
    );
    const body = { botId: "cb_001", title: "도함수 활용 마무리 2탄" };

    const result = await controller.dispatch(body, "teacher_001");

    expect(dispatch.execute).toHaveBeenCalledWith("teacher_001", body);
    expect(result).toBe(expected);
  });
});

describe("AssignmentsController.submissions", () => {
  it("POST /assignments/:id/submissions — 신규는 201, 응답은 submission", async () => {
    const submission = { id: "sub_11111111", scorePercent: 80 };
    const submit = makeUseCase({ created: true, submission });
    const controller = new AssignmentsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      submit as never,
      makeUseCase(null) as never,
    );
    const res = { status: jest.fn() };
    const body = { answers: { q1: "2" }, scorePercent: 80 };

    const result = await controller.submit(
      "as_user_a1b2c3d4",
      body,
      "s2",
      res as never,
    );

    expect(submit.execute).toHaveBeenCalledWith("s2", "as_user_a1b2c3d4", body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(result).toBe(submission);
  });

  it("POST /assignments/:id/submissions — 재제출(upsert)은 200", async () => {
    const submission = { id: "sub_11111111", scorePercent: 90 };
    const submit = makeUseCase({ created: false, submission });
    const controller = new AssignmentsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      submit as never,
      makeUseCase(null) as never,
    );
    const res = { status: jest.fn() };

    const result = await controller.submit(
      "as_user_a1b2c3d4",
      {},
      "s2",
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(result).toBe(submission);
  });

  it("GET /assignments/:id/submissions — id 와 교사 id 를 list-submissions use-case 에 위임한다", async () => {
    const expected = { submissions: [] };
    const listSubmissions = makeUseCase(expected);
    const controller = new AssignmentsController(
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      makeUseCase(null) as never,
      listSubmissions as never,
    );

    const result = await controller.listSubmissions(
      "as_user_a1b2c3d4",
      "teacher_001",
    );

    expect(listSubmissions.execute).toHaveBeenCalledWith(
      "teacher_001",
      "as_user_a1b2c3d4",
    );
    expect(result).toBe(expected);
  });
});
