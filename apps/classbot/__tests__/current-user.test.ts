/**
 * @jest-environment node
 *
 * 현재 사용자 해석기(서버용 getCurrentUserIdFromRequest) 단위 테스트.
 *
 * 핵심 ①: route handler 가 세울 수 있는 신원은 **개발용 신원 쿠키**
 * (`lib/dev-identity.ts`) 하나다.
 *  - prod 호스트(classbot.pullim.ai)·배포 호스트에서는 무력.
 *  - allowlist 밖 id 는 무시.
 *  - 없으면 데모 폴백(student_001, 비신원).
 *
 * 핵심 ②: **`Authorization` 헤더는 신원이 되지 못한다.** 클래스봇 자체 인증이 걷히며
 * 토큰 서명 검증 경로도 함께 걷혔다 — 그 토큰을 발급하던 주체가 자체 인증 BE 뿐이었다
 * (`05 § 11.1`). 아래 그 회귀를 못 박는다: 토큰처럼 생긴 것을 실어 보내도 명의가 서지
 * 않는다. 다시 들이려면 **이 테스트를 지워야** 하므로, 지우는 사람이 그것을 보게 된다.
 *
 * 그래서 **모든 케이스가 쿠키·호스트 상태를 명시**한다.
 * RBAC 쓰기 가드(/api/teacher/bots 등)의 신원 토대다.
 */
import { createHmac } from "node:crypto";

import {
  DEMO_FALLBACK_USER_ID,
  getCurrentUserIdFromRequest,
} from "@/lib/current-user";

/**
 * HS256 서명 토큰 — **걷힌 검증 경로를 되살리면 통과할** 토큰을 만들기 위해 남긴다.
 *
 * 무효 서명으로는 회귀를 잡지 못한다: 검증 코드를 되돌려도 그 토큰은 거부되어 결국
 * 같은 폴백으로 떨어지므로 테스트가 그대로 통과한다. 그래서 **종전 코드가 실제로 믿었을**
 * 서명(같은 `JWT_SECRET`, `type:"access"`, 미만료)을 만들어 그것조차 신원이 안 됨을 본다.
 */
const SECRET = "test-jwt-secret";

beforeAll(() => {
  // 종전 코드는 secret 이 비면 검증을 건너뛰었다 — 비워 두면 잠금이 헛돈다.
  process.env.JWT_SECRET = SECRET;
});

function base64Url(input: string | Buffer): string {
  return (typeof input === "string" ? Buffer.from(input, "utf-8") : input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signToken(payload: Record<string, unknown>): string {
  const h = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = base64Url(JSON.stringify(payload));
  const sig = base64Url(createHmac("sha256", SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

/** 종전 검증 경로가 통과시켰을 토큰 — sub/role 을 주장한다. */
const VALID_SIGNED = signToken({
  sub: "attacker",
  email: "x@x.com",
  role: "teacher",
  type: "access",
  jti: "jlock",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

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
  it("쿠키도 없으면 데모 폴백(student_001, 비신원)으로 떨어진다", () => {
    const result = getCurrentUserIdFromRequest(requestWith({ host: LOCAL_HOST }));
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });
});

/*
  자체 인증이 걷힌 뒤의 회귀 잠금.

  종전에는 `Authorization: Bearer <HS256>` 을 **서명까지 검증**해 claim(sub/role)으로 명의를
  세웠다. 그 토큰의 발급처가 클래스봇 자체 인증 BE 뿐이었고, 그것이 걷히며 검증 경로도 함께
  걷혔다. 지금 OS 세션은 `Domain=.pullim.ai` 쿠키이고 **pullim-api 가** 검증한다(ES256) —
  클래스봇 route handler 에는 그 서명을 풀 열쇠가 없다.

  그래서 헤더로 명의를 주장하는 길은 **없어야 한다.** 아래가 그것을 못 박는다.
*/
describe("getCurrentUserIdFromRequest — Authorization 헤더는 신원이 되지 못한다", () => {
  /** 형식만 토큰인 문자열 — 서명이 무효라 이것만으로는 회귀를 못 잡는다(아래 VALID_SIGNED 가 잡는다). */
  const TOKEN_SHAPED =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiJhdHRhY2tlciIsInJvbGUiOiJ0ZWFjaGVyIn0.c2ln";

  it("**유효하게 서명된** access 토큰조차 신원이 되지 못한다 — 이것이 회귀 잠금이다", () => {
    /*
      종전 코드(`verifyAccessToken(token, process.env.JWT_SECRET)`)를 그대로 되살리면
      이 토큰은 **검증을 통과해** { id:"attacker", role:"teacher", isAuthenticated:true }
      를 만든다. 그래서 이 단정이 깨진다 — 되살리는 사람이 그것을 보게 된다.
      무효 서명 토큰으로는 이 회귀가 안 잡힌다(거부되어 같은 폴백으로 떨어지므로).
    */
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${VALID_SIGNED}`, host: LOCAL_HOST }),
    );
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });

  it("유효 서명 토큰 + 쿠키면 쿠키 쪽 사용자다 — 토큰의 teacher 주장은 무시된다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({
        authorization: `Bearer ${VALID_SIGNED}`,
        devIdentity: "s2",
        host: LOCAL_HOST,
      }),
    );
    expect(result).toEqual({
      id: "s2",
      role: "student",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("유효 서명 토큰도 prod 호스트의 닫힘을 열지 못한다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${VALID_SIGNED}`, host: PROD_HOST }),
    );
    expect(result.isIdentified).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });

  it("Bearer 토큰만 있으면 데모 폴백이다 — sub·role 을 주장해도 반영되지 않는다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ authorization: `Bearer ${TOKEN_SHAPED}`, host: LOCAL_HOST }),
    );
    expect(result).toEqual({
      id: DEMO_FALLBACK_USER_ID,
      role: "student",
      isAuthenticated: false,
      isIdentified: false,
    });
  });

  it("쿠키와 함께 와도 쿠키 쪽 사용자로만 간다 — 헤더는 무시된다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({
        authorization: `Bearer ${TOKEN_SHAPED}`,
        devIdentity: "s2",
        host: LOCAL_HOST,
      }),
    );
    expect(result).toEqual({
      id: "s2",
      role: "student",
      isAuthenticated: false,
      isIdentified: true,
    });
  });

  it("헤더는 prod 호스트의 닫힘도 열지 못한다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({
        authorization: `Bearer ${TOKEN_SHAPED}`,
        devIdentity: "teacher_001",
        host: PROD_HOST,
      }),
    );
    expect(result.isIdentified).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });

  it("isAuthenticated 는 어떤 경로로도 true 가 되지 않는다", () => {
    for (const req of [
      requestWith({ host: LOCAL_HOST }),
      requestWith({ devIdentity: "teacher_001", host: LOCAL_HOST }),
      requestWith({ authorization: `Bearer ${TOKEN_SHAPED}`, host: LOCAL_HOST }),
      requestWith({ authorization: `Bearer ${VALID_SIGNED}`, host: LOCAL_HOST }),
    ]) {
      expect(getCurrentUserIdFromRequest(req).isAuthenticated).toBe(false);
    }
  });
});

describe("getCurrentUserIdFromRequest — 개발용 신원 쿠키 폴백", () => {
  it("로컬 호스트에서 allowlist 안의 쿠키는 그 데모 사용자 명의로 인정된다 — 단 인증은 아니다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "teacher_001", host: LOCAL_HOST }),
    );
    // 개발 쿠키는 **인증이 아니다** — 명의(isIdentified)로만 쓴다. 이 쿠키가
    // isAuthenticated 를 얻으면 client 훅(useCurrentUser)과 계약이 갈라진다.
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

  /*
    종전에는 dev preview 호스트(`dev-classbot.pullim.ai`)에서도 이 쿠키를 신원으로 인정했다.
    지금은 **로컬에서만** 인정한다 — 배포에는 DB 가 없어 신원을 세우면 라우트가 500 만 낸다
    (`lib/dev-identity.ts` 머리주석의 실측). 배포는 익명 mock 경로로 돈다.
  */
  it("배포 호스트에서는 인정하지 않는다 — 신원을 세워도 DB 가 없다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "s2", host: "dev-classbot.pullim.ai" }),
    );
    expect(result.isIdentified).toBe(false);
    expect(result.id).toBe(DEMO_FALLBACK_USER_ID);
  });

  it("로컬 호스트에서는 인정한다 — 이 도구가 사는 곳이다", () => {
    const result = getCurrentUserIdFromRequest(
      requestWith({ devIdentity: "s2", host: "localhost:3032" }),
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
