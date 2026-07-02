import { ClassroomsController } from "./classrooms.controller";

describe("ClassroomsController", () => {
  it("GET /classrooms — 요청 사용자 id 를 use-case 에 위임하고 결과를 그대로 반환한다", async () => {
    const expected = [{ id: "cr_math_a" }];
    const useCase = { execute: jest.fn().mockResolvedValue(expected) };
    const controller = new ClassroomsController(useCase as never);

    const result = await controller.list("teacher_001");

    expect(useCase.execute).toHaveBeenCalledWith("teacher_001");
    expect(result).toBe(expected);
  });
});
