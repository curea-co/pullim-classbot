/**
 * @jest-environment node
 *
 * 현재 사용자 해석기(서버용 getCurrentUserIdFromRequest) 단위 테스트.
 *
 * 핵심 ①: 신원·역할은 **서명 검증을 통과한 토큰의 claim** 에서만 결정된다.
 *  - 올바른 secret 으로 서명된(HS256) 토큰만 인증으로 인정.
 *  - 위조(self-signed / 틀린 secret / alg=none) 토큰은 거부 → JWT 로는 인증되지 않는다.
 *  - 만료된 토큰도 거부.
 *
 * 핵심 ②: 그다음 **개발용 신원 쿠키**(lib/dev-identity.ts)가 폴백으로 온다.
 *  - prod 호스트(classbot.pullim.ai)에서는 무력.
 *  - allowlist 밖 id 는 무시.
 *  - 유효한 JWT 가 있으면 JWT 가 이긴다.
 *  - 둘 다 없으면 데모 폴백(student_001, 비인증).
 *
 * 그래서 **모든 케이스가 쿠키·호스트 상태를 명시**한다 — 폴백이 무조건이던 시절의
 * 「헤더 없음」 요청은 이제 세 갈래(JWT·쿠키·폴백)를 구분하지 못한다.
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

const LOCAL_HOST = "localhost:3032";
const PROD_HOST = "classbot.pullim.ai";
const DEV_COOKIE = "pullim_dev_identity";

/**
 * 요청 생성기 — 세 축(authorization · cookie · host)을 **항상 명시**한다.
 * undici Request 는 Host 헤더를 자동으로 채우지 않아 헤더로 직접 넣어야 한다.
 */
function requestWith(headers: {
  authorization?: string;
  Authorization?: string;
  /** 개발용 신원 쿠키 값(= 사용자 id). 생략하면 쿠키 없음. */
  devIdentity?: string;
  /** 요청 Host. 생략하면 로컬(개발용 신원이 유효한 호스트). */
  host?: string;
}): Request {
  const { devIdentity, host = LOCAL_HOST, ...rest } = headers;
  const raw: Record<string, string> = { ...rest, host };
  if (devIdentity !== undefined) raw.cookie = `${DEV_COOKIE}=${devIdentity}`;
  return new Request("http://localhost/api/chat", { headers: raw });
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
      isIdentified: true,
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
    expect(result.isIdentified).toBe(false);
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

  it("토큰도 개발용 신원 쿠키도 없으면 데모 폴백(student_001, 비인증)으로 떨어진다", () => {
    const result = getCurrentUserIdFromRequest(requestWith({ host: LOCAL_HOST }));
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });

  it("손상된 토큰은 인증으로 인정하지 않고 폴백한다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: "Bearer not-a-jwt" }),
    );
    expect(result.isAuthenticated).toBe(false);
    expect(result.isIdentified).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });
});

describe("getCurrentUserIdFromRequest — 개발용 신원 쿠키 폴백", () => {
  it("로컬 호스트에서 allowlist 안의 쿠키는 그 데모 사용자 명의로 인정된다 — 단 인증은 아니다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "teacher_001", host: LOCAL_HOST }),
    );
    // isAuthenticated 는 JWT 세션만 가리킨다. 개발 쿠키가 이 이름을 얻으면
    // client 훅(useCurrentUser)이 같은 쿠키를 false 로 보는 것과 계약이 갈라진다.
    expect(result).toEqual({
      id: "teacher_001",
      role: "teacher",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("학부모 데모 사용자는 packages/types 에 없는 'parent' role 로 온다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "parent_001", host: LOCAL_HOST }),
    );
    expect(result).toEqual({
      id: "parent_001",
      role: "parent",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("같은 쿠키라도 prod 호스트에서는 인정하지 않는다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "teacher_001", host: PROD_HOST }),
    );
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });

  it("포트가 붙은 prod 호스트에서도 인정하지 않는다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "teacher_001", host: `${PROD_HOST}:443` }),
    );
    expect(result.isAuthenticated).toBe(false);
    expect(result.isIdentified).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });

  it("dev preview 호스트에서는 인정한다 (NODE_ENV 가 아니라 호스트로 가른다)", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "s2", host: "dev-classbot.pullim.ai" }),
    );
    expect(result).toEqual({
      id: "s2",
      role: "student",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("allowlist 밖 id 는 무시하고 데모 폴백으로 떨어진다 — 임의 사칭 불가", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "teacher_999", host: LOCAL_HOST }),
    );
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });

  it("유효한 JWT 가 있으면 쿠키를 이긴다", () => {
    const token = signToken({
      sub: "uuid-teacher-9",
      email: "t@example.com",
      role: "teacher",
      type: "access",
      jti: "jc",
      exp: future(),
    });
    const result = getCurrentUserIdFromRequest(
      requestWith({
        authorization: `Bearer ${token}`,
        devIdentity: "parent_001",
        host: LOCAL_HOST,
      }),
    );
    expect(result).toEqual({
      id: "uuid-teacher-9",
      role: "teacher",
      isAuthenticated: true,
      isIdentified: true,
    });
  });

  it("위조 토큰은 여전히 신원이 되지 못한다 — 쿠키가 있어도 쿠키 쪽 사용자로만 간다", () => {
    const forged = signToken(
      {
        sub: "attacker",
        email: "x@x.com",
        role: "teacher",
        type: "access",
        jti: "jfc",
        exp: future(),
      },
      "wrong-secret",
    );
    const result = getCurrentUserIdFromRequest(
      requestWith({
        authorization: `Bearer ${forged}`,
        devIdentity: "s2",
        host: LOCAL_HOST,
      }),
    );
    // 공격자가 주장한 sub/role 은 어디에도 반영되지 않는다.
    expect(result).toEqual({
      id: "s2",
      role: "student",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("다른 쿠키가 섞여 있어도 신원 쿠키만 골라 읽는다", () => {
    const req = new Request("http://localhost/api/chat", {
      headers: {
        host: LOCAL_HOST,
        cookie: "theme=dark; pullim_dev_identity=teacher_002; sid=abc=def",
      },
    });
    expect(getCurrentUserIdFromRequest(req)).toEqual({
      id: "teacher_002",
      role: "teacher",
      isAuthenticated: false,
      isIdentified: true,
    });
  });
});
