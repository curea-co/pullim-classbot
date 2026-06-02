/**
 * @jest-environment node
 *
 * 현재 사용자 해석기(서버용 getCurrentUserIdFromRequest) 단위 테스트.
 *
 * 핵심: 신원·역할은 **서명 검증을 통과한 토큰의 claim** 에서만 결정된다.
 *  - 올바른 secret 으로 서명된(HS256) 토큰만 인증으로 인정.
 *  - 위조(self-signed / 틀린 secret / alg=none) 토큰은 거부 → 비인증 폴백.
 *  - 만료된 토큰도 거부.
 *  - 토큰 없으면 데모 폴백(student_001, 비인증).
 * RBAC 쓰기 가드(/api/chat, /api/teacher/bots)의 신원 토대다.
 */
import { createHmac } from "node:crypto";

import {
  DEMO_FALLBACK_USER_ID,
  getCurrentUserIdFromRequest,
} from "@/lib/current-user";
import type { AccessTokenPayload } from "@pullim-classbot/types";

const SECRET = "test-jwt-secret";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

/** base64url 인코딩. */
function base64Url(input: string | Buffer): string {
  return (typeof input === "string" ? Buffer.from(input, "utf-8") : input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** HS256 서명 토큰 생성(BE @nestjs/jwt 기본값과 동일 방식). */
function signToken(
  payload: Partial<AccessTokenPayload>,
  secret: string = SECRET,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  const h = base64Url(JSON.stringify(header));
  const p = base64Url(JSON.stringify(payload));
  const sig = base64Url(createHmac("sha256", secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/chat", { headers });
}

describe("getCurrentUserIdFromRequest", () => {
  it("올바르게 서명된 access 토큰의 claim(sub/role)에서 신원을 해석한다", () => {
    const token = signToken({
      sub: "uuid-teacher-9",
      email: "t@example.com",
      role: "teacher",
      type: "access",
      jti: "j1",
      exp: future(),
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
    const token = signToken({
      sub: "uuid-1",
      email: "a@b.com",
      role: "student",
      type: "access",
      jti: "j2",
      exp: future(),
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({ Authorization: `bearer ${token}` }),
    );
    expect(result.id).toBe("uuid-1");
    expect(result.isAuthenticated).toBe(true);
  });

  it("틀린 secret 으로 서명된(위조) 토큰은 거부하고 폴백한다", () => {
    const forged = signToken(
      {
        sub: "attacker",
        email: "x@x.com",
        role: "teacher",
        type: "access",
        jti: "jf",
        exp: future(),
      },
      "wrong-secret",
    );
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${forged}` }),
    );
    expect(result.isAuthenticated).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
    expect(result.role).toBe("student");
  });

  it("alg=none 헤더의 self-signed 토큰은 거부한다", () => {
    // 서명 없이 role=teacher 를 주장하는 토큰.
    const h = base64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
    const p = base64Url(
      JSON.stringify({
        sub: "attacker",
        role: "teacher",
        type: "access",
        jti: "jn",
        exp: future(),
      }),
    );
    const token = `${h}.${p}.`;
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${token}` }),
    );
    expect(result.isAuthenticated).toBe(false);
  });

  it("만료된(서명 정상) 토큰은 거부한다", () => {
    const expired = signToken({
      sub: "uuid-1",
      email: "a@b.com",
      role: "student",
      type: "access",
      jti: "je",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${expired}` }),
    );
    expect(result.isAuthenticated).toBe(false);
  });

  it("type 이 access 가 아닌(refresh) 서명 토큰은 거부한다", () => {
    const refresh = signToken({
      sub: "uuid-1",
      role: "student",
      type: "refresh" as AccessTokenPayload["type"],
      jti: "jr",
      exp: future(),
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${refresh}` }),
    );
    expect(result.isAuthenticated).toBe(false);
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
