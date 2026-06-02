/**
 * @jest-environment node
 *
 * RBAC 쓰기 가드 라우트 단위 테스트.
 *
 * - POST /api/chat: 미로그인 401. 로그인 시 본문 studentId 를 무시하고
 *   세션 claim(sub) 명의로 저장(위조 방지).
 * - POST /api/teacher/bots: 미로그인 401, 학생 403, 교사 201(teacherId=세션 id).
 *
 * 실DB(pg) 의존을 끊기 위해 @/lib/db 를 mock 하고, 신원은 @/lib/current-user 를
 * mock 해 가드 분기만 격리 검증한다.
 */

const insertValues = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
const insert = jest.fn(() => ({ values: insertValues }));

// where(...).limit(...) 체인을 흉내내는 select 더블.
const select = jest.fn(() => ({
  from: () => ({
    where: () => ({ limit: () => Promise.resolve([{ name: "교사이름" }]) }),
  }),
}));

jest.mock("@/lib/db", () => ({
  db: { insert: () => insert(), select: () => select() },
  schema: {},
}));

jest.mock("@/lib/db/schema", () => ({
  chatMessages: {},
  classBots: {},
  users: { id: "id", name: "name" },
}));

const getCurrentUserIdFromRequest = jest.fn<
  { id: string; role: string; isAuthenticated: boolean },
  [Request]
>();
jest.mock("@/lib/current-user", () => ({
  getCurrentUserIdFromRequest: (req: Request) => getCurrentUserIdFromRequest(req),
}));

import { POST as chatPOST } from "@/app/api/chat/route";
import { POST as botsPOST } from "@/app/api/teacher/bots/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  insert.mockImplementation(() => ({ values: insertValues }));
  insertValues.mockResolvedValue(undefined);
});

describe("POST /api/chat (쓰기 가드 + 명의)", () => {
  it("미로그인이면 401 이고 저장하지 않는다", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "student_001",
      role: "student",
      isAuthenticated: false,
    });

    const res = await chatPOST(jsonRequest({ botId: "cb_1", text: "안녕" }));
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("로그인 시 본문 studentId 를 무시하고 세션 claim 명의로 저장한다", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "uuid-session-A",
      role: "student",
      isAuthenticated: true,
    });

    const res = await chatPOST(
      jsonRequest({ botId: "cb_1", text: "안녕", studentId: "victim-id" }),
    );
    expect(res.status).toBe(201);
    const saved = insertValues.mock.calls[0][0] as { studentId: string };
    // 본문의 victim-id 가 아니라 세션 id 로 저장돼야 한다(위조 방지).
    expect(saved.studentId).toBe("uuid-session-A");
  });

  it("botId/text 누락 시 400", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "uuid-A",
      role: "student",
      isAuthenticated: true,
    });
    const res = await chatPOST(jsonRequest({ botId: "", text: "" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/teacher/bots (교사 전용 RBAC)", () => {
  const validBody = {
    name: "수학봇",
    subject: "수학",
    grade: "중1",
    tone: "친근",
  };

  it("미로그인이면 401", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "student_001",
      role: "student",
      isAuthenticated: false,
    });
    const res = await botsPOST(jsonRequest(validBody));
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("학생이면 403(교사 전용 mutation 거부)", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "uuid-student",
      role: "student",
      isAuthenticated: true,
    });
    const res = await botsPOST(jsonRequest(validBody));
    expect(res.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it("교사면 201 이고 teacherId 가 세션 id 로 설정된다", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "uuid-teacher",
      role: "teacher",
      isAuthenticated: true,
    });
    const res = await botsPOST(jsonRequest(validBody));
    expect(res.status).toBe(201);
    const saved = insertValues.mock.calls[0][0] as { teacherId: string };
    expect(saved.teacherId).toBe("uuid-teacher");
    const json = (await res.json()) as { teacherId: string };
    expect(json.teacherId).toBe("uuid-teacher");
  });

  it("교사라도 필수값(name/subject/grade) 누락 시 400", async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: "uuid-teacher",
      role: "teacher",
      isAuthenticated: true,
    });
    const res = await botsPOST(jsonRequest({ name: "", subject: "", grade: "" }));
    expect(res.status).toBe(400);
  });
});
