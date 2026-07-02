import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

describe("OptionalJwtAuthGuard", () => {
  const guard = new OptionalJwtAuthGuard();

  it("유효한 JWT 사용자면 그대로 반환한다(request.user 주입)", () => {
    const user = { id: "auth-uuid-001" };

    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it("토큰이 없거나 무효면 throw 하지 않고 undefined 를 반환한다", () => {
    expect(guard.handleRequest(null, false)).toBeUndefined();
  });

  it("전략 에러가 있어도 요청을 차단하지 않는다(폴백 허용)", () => {
    expect(
      guard.handleRequest(new Error("invalid token"), false),
    ).toBeUndefined();
  });
});
