/**
 * @jest-environment node
 *
 * 현재 사용자 해석기(서버용 getCurrentUserIdFromRequest) 단위 테스트.
 *
 * 쓰기 명의가 클라이언트 입력이 아니라 JWT claim(sub)에서만 결정되는지,
 * 토큰이 없을 때 데모 폴백(student_001, 비인증)으로 떨어지는지를 검증한다.
 * RBAC 쓰기 가드(/api/chat, /api/teacher/bots)의 신원 토대다.
 */
import {
  DEMO_FALLBACK_USER_ID,
  getCurrentUserIdFromRequest,
} from "@/lib/current-user";
import type { AccessTokenPayload } from "@pullim-classbot/types";

/** base64url 인코딩(브라우저/Node 공용). */
function base64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 서명 없는(검증 안 하는 디코더용) JWT 를 만든다. */
function forgeToken(payload: Partial<AccessTokenPayload>): string {
  const header = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/chat", { headers });
}

describe("getCurrentUserIdFromRequest", () => {
  it("Bearer access 토큰의 claim(sub/role)에서 신원을 해석한다", () => {
    const token = forgeToken({
      sub: "uuid-teacher-9",
      email: "t@example.com",
      role: "teacher",
      type: "access",
      jti: "j1",
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${token}` }),
    );
    expect(result).toEqual({
      id: "uuid-teacher-9",
      role: "teacher",
      isAuthenticated: true,
    });
  });

  it("대소문자 무관 Authorization 헤더를 처리한다", () => {
    const token = forgeToken({
      sub: "uuid-1",
      email: "a@b.com",
      role: "student",
      type: "access",
      jti: "j2",
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({ Authorization: `bearer ${token}` }),
    );
    expect(result.id).toBe("uuid-1");
    expect(result.isAuthenticated).toBe(true);
  });

  it("토큰이 없으면 데모 폴백(student_001, 비인증)으로 떨어진다", () => {
    const result = getCurrentUserIdFromRequest(requestWith({}));
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
    });
  });

  it("손상된 토큰은 인증으로 인정하지 않고 폴백한다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: "Bearer not-a-jwt" }),
    );
    expect(result.isAuthenticated).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });
});
