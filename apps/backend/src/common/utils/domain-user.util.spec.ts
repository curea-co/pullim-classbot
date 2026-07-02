import { resolveDomainUserId } from "./domain-user.util";

describe("resolveDomainUserId", () => {
  it("JWT 인증 사용자(request.user.id)가 있으면 그 id 를 반환한다", () => {
    const request = {
      user: { id: "auth-uuid-001" },
      headers: { "x-user-id": "header-user" },
    };

    expect(resolveDomainUserId(request)).toBe("auth-uuid-001");
  });

  it("JWT 사용자가 없으면 x-user-id 헤더로 폴백한다", () => {
    const request = { headers: { "x-user-id": "s2" } };

    expect(resolveDomainUserId(request)).toBe("s2");
  });

  it("x-user-id 헤더 앞뒤 공백은 잘라낸다", () => {
    const request = { headers: { "x-user-id": "  s2  " } };

    expect(resolveDomainUserId(request)).toBe("s2");
  });

  it("x-user-id 헤더가 배열이면 첫 값을 쓴다", () => {
    const request = { headers: { "x-user-id": ["s2", "s3"] } };

    expect(resolveDomainUserId(request)).toBe("s2");
  });

  it("JWT 사용자도 헤더도 없으면 undefined", () => {
    expect(resolveDomainUserId({ headers: {} })).toBeUndefined();
  });

  it("빈 문자열 헤더는 undefined 로 취급한다", () => {
    const request = { headers: { "x-user-id": "   " } };

    expect(resolveDomainUserId(request)).toBeUndefined();
  });

  it("user.id 가 문자열이 아니면 헤더 폴백으로 넘어간다", () => {
    const request = {
      user: { id: 42 },
      headers: { "x-user-id": "s2" },
    };

    expect(resolveDomainUserId(request)).toBe("s2");
  });
});
