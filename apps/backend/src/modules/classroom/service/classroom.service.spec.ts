import { HttpException } from "@nestjs/common";

import type {
  BotRow,
  ClassroomRow,
  EnrolledBotRow,
  IClassroomRepository,
} from "../interface/classroom-repository.interface";
import { ClassroomService } from "./classroom.service";

// ---------------------------------------------------------------------------
// 저장소 더블 + 픽스처
// ---------------------------------------------------------------------------

/** IClassroomRepository 더블 — 모든 메서드를 jest.fn 프로퍼티로 채운다. */
type RepositoryDouble = { [K in keyof IClassroomRepository]: jest.Mock };

function makeRepository(): RepositoryDouble {
  return {
    findEnrolledBots: jest.fn(),
    findOwnedBots: jest.fn(),
    findBotById: jest.fn(),
    findCurriculumUnits: jest.fn(),
    findBotSettings: jest.fn(),
    findClassroomsByTeacher: jest.fn(),
    findClassroomById: jest.fn(),
    findUserById: jest.fn(),
    findJoinCode: jest.fn(),
    findEnrollment: jest.fn(),
    createEnrollment: jest.fn(),
    createJoinCode: jest.fn(),
  };
}

const ENROLLED_BOT: EnrolledBotRow = {
  id: "cb_001",
  name: "수학이 형",
  avatarEmoji: "🧑‍🏫",
  teacherName: "김수학 선생님",
  organization: "대치프리미엄 수학학원",
  subject: "수학Ⅱ",
  grade: "고2",
  tone: "친근",
  greeting: "안녕!",
  scope: 3,
  isLive: false,
  currentLesson: null,
  quickPrompts: [{ text: "오늘 뭐 배워?", expectedReplyKey: "today" }],
  enrolledCount: 28,
  classroomId: "cr_math_a",
  classroomLabel: "고2 미적분 A반",
  assignedBy: "김수학 선생님",
  via: "대치프리미엄 수학학원",
};

const BOT: BotRow = {
  id: "cb_001",
  name: "수학이 형",
  avatarEmoji: "🧑‍🏫",
  teacherId: "teacher_001",
  teacherName: "김수학 선생님",
  organization: "대치프리미엄 수학학원",
  subject: "수학Ⅱ",
  grade: "고2",
  tone: "친근",
  greeting: "안녕!",
  scope: 3,
  isLive: false,
  currentLesson: null,
  quickPrompts: [],
  enrolledCount: 28,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
};

const CLASSROOM: ClassroomRow = {
  id: "cr_math_a",
  label: "고2 미적분 A반",
  organization: "대치프리미엄 수학학원",
  teacherId: "teacher_001",
};

/** HttpException 의 spec §3 봉투 { error: { code } } 를 단언한다. */
function expectEnvelope(err: unknown, status: number, code: string) {
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  expect(http.getResponse()).toMatchObject({ error: { code } });
}

// ---------------------------------------------------------------------------
// 읽기 — listBots / getBot / listClassrooms
// ---------------------------------------------------------------------------

describe("ClassroomService.listBots", () => {
  it("role=student — 학생 enrollments 조인 행을 FE BotsReadResponse 봉투로 반환한다", async () => {
    const repo = makeRepository();
    repo.findEnrolledBots.mockResolvedValue([ENROLLED_BOT]);
    const service = new ClassroomService(repo);

    const result = await service.listBots("student", "s2");

    expect(repo.findEnrolledBots).toHaveBeenCalledWith("s2");
    expect(result).toEqual({ bots: [ENROLLED_BOT] });
  });

  it("role=teacher — 소유 봇 목록을 createdAt ISO 문자열로 반환한다", async () => {
    const repo = makeRepository();
    repo.findOwnedBots.mockResolvedValue([BOT]);
    const service = new ClassroomService(repo);

    const result = await service.listBots("teacher", "teacher_001");

    expect(repo.findOwnedBots).toHaveBeenCalledWith("teacher_001");
    expect(result.bots).toHaveLength(1);
    expect(result.bots[0]).toMatchObject({
      id: "cb_001",
      teacherId: "teacher_001",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("빈 목록은 빈 배열로 반환한다 (spec §3)", async () => {
    const repo = makeRepository();
    repo.findEnrolledBots.mockResolvedValue([]);
    const service = new ClassroomService(repo);

    await expect(service.listBots("student", "s2")).resolves.toEqual({
      bots: [],
    });
  });

  it("role 이 student|teacher 가 아니면 400 VALIDATION 봉투", async () => {
    const service = new ClassroomService(makeRepository());

    const err = await service.listBots("parent", "s2").catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("신원(userId)이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const service = new ClassroomService(makeRepository());

    const err = await service
      .listBots("student", undefined)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});

describe("ClassroomService.getBot", () => {
  it("봇 + 커리큘럼 + 설정을 합친 상세를 반환한다 (spec §4.2)", async () => {
    const repo = makeRepository();
    repo.findBotById.mockResolvedValue(BOT);
    repo.findCurriculumUnits.mockResolvedValue([
      {
        id: "math2-ch2-limit",
        label: "함수의 극한",
        fullPath: "수학Ⅱ > 극한 > 함수의 극한",
        achievementCodes: ["12수학02-01"],
      },
    ]);
    repo.findBotSettings.mockResolvedValue({ identity: { name: "수학이 형" } });
    const service = new ClassroomService(repo);

    const result = await service.getBot("cb_001");

    expect(result).toMatchObject({
      id: "cb_001",
      createdAt: "2026-06-01T00:00:00.000Z",
      curriculumUnits: [{ id: "math2-ch2-limit", label: "함수의 극한" }],
      settings: { identity: { name: "수학이 형" } },
    });
  });

  it("설정이 없으면 settings=null", async () => {
    const repo = makeRepository();
    repo.findBotById.mockResolvedValue(BOT);
    repo.findCurriculumUnits.mockResolvedValue([]);
    repo.findBotSettings.mockResolvedValue(null);
    const service = new ClassroomService(repo);

    const result = await service.getBot("cb_001");

    expect(result.settings).toBeNull();
    expect(result.curriculumUnits).toEqual([]);
  });

  it("없는 봇이면 404 NOT_FOUND 봉투", async () => {
    const repo = makeRepository();
    repo.findBotById.mockResolvedValue(null);
    const service = new ClassroomService(repo);

    const err = await service.getBot("cb_none").catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });
});

describe("ClassroomService.listClassrooms", () => {
  it("요청 교사의 반 목록을 배열 그대로 반환한다 (spec §3)", async () => {
    const repo = makeRepository();
    repo.findClassroomsByTeacher.mockResolvedValue([CLASSROOM]);
    const service = new ClassroomService(repo);

    const result = await service.listClassrooms("teacher_001");

    expect(repo.findClassroomsByTeacher).toHaveBeenCalledWith("teacher_001");
    expect(result).toEqual([CLASSROOM]);
  });

  it("신원이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const service = new ClassroomService(makeRepository());

    const err = await service
      .listClassrooms(undefined)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});
