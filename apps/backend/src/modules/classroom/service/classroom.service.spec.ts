import { HttpException } from "@nestjs/common";

import type {
  BotRow,
  ClassroomRow,
  EnrolledBotRow,
  EnrollmentRow,
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

// ---------------------------------------------------------------------------
// 코드 참여 — joinByCode (POST /api/enrollments, M2 개정 §2)
// ---------------------------------------------------------------------------

const JOIN_CODE = {
  code: "MATH-2024",
  botId: "cb_001",
  classroomId: "cr_math_a",
  teacherId: "teacher_001",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
};

const STUDENT = { id: "s2", name: "민준", role: "student" as const };

const EXISTING_ENROLLMENT: EnrollmentRow = {
  botId: "cb_001",
  studentId: "s2",
  classroomId: "cr_math_a",
  classroomLabel: "고2 미적분 A반",
  assignedBy: "김수학 선생님",
  assignedAt: new Date("2026-07-02T09:00:00.000Z"),
  via: "대치프리미엄 수학학원",
};

/** joinByCode happy path 용 저장소 상태를 구성한다. */
function makeJoinRepository() {
  const repo = makeRepository();
  repo.findUserById.mockResolvedValue(STUDENT);
  repo.findJoinCode.mockResolvedValue(JOIN_CODE);
  repo.findBotById.mockResolvedValue(BOT);
  repo.findClassroomById.mockResolvedValue(CLASSROOM);
  repo.findEnrollment.mockResolvedValue(null);
  repo.createEnrollment.mockResolvedValue(new Date("2026-07-03T10:00:00.000Z"));
  return repo;
}

describe("ClassroomService.joinByCode", () => {
  it("유효 코드 — enrollment 를 생성하고 StudentEnrollment 형태로 반환한다", async () => {
    const repo = makeJoinRepository();
    const service = new ClassroomService(repo);

    const result = await service.joinByCode("s2", { code: "MATH-2024" });

    // 파생 필드: classroomLabel=반 label, assignedBy=봇 teacherName, via=반 organization.
    expect(repo.createEnrollment).toHaveBeenCalledWith({
      botId: "cb_001",
      studentId: "s2",
      classroomId: "cr_math_a",
      classroomLabel: "고2 미적분 A반",
      assignedBy: "김수학 선생님",
      via: "대치프리미엄 수학학원",
    });
    expect(result).toEqual({
      created: true,
      enrollment: {
        botId: "cb_001",
        classroomId: "cr_math_a",
        classroomLabel: "고2 미적분 A반",
        assignedBy: "김수학 선생님",
        assignedAt: "2026-07-03T10:00:00.000Z",
        via: "대치프리미엄 수학학원",
      },
    });
  });

  it("코드는 mock resolveClassCode 와 동일하게 trim + 대문자 정규화한다", async () => {
    const repo = makeJoinRepository();
    const service = new ClassroomService(repo);

    await service.joinByCode("s2", { code: "  math-2024  " });

    expect(repo.findJoinCode).toHaveBeenCalledWith("MATH-2024");
  });

  it("이미 등록된 학생이면 멱등 — created=false 로 기존 enrollment 를 반환한다", async () => {
    const repo = makeJoinRepository();
    repo.findEnrollment.mockResolvedValue(EXISTING_ENROLLMENT);
    const service = new ClassroomService(repo);

    const result = await service.joinByCode("s2", { code: "MATH-2024" });

    expect(repo.createEnrollment).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
    expect(result.enrollment.assignedAt).toBe("2026-07-02T09:00:00.000Z");
  });

  it("동시 삽입 충돌(createEnrollment=null)도 멱등 — 기존 행으로 폴백한다", async () => {
    const repo = makeJoinRepository();
    repo.createEnrollment.mockResolvedValue(null);
    repo.findEnrollment
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(EXISTING_ENROLLMENT);
    const service = new ClassroomService(repo);

    const result = await service.joinByCode("s2", { code: "MATH-2024" });

    expect(result.created).toBe(false);
    expect(result.enrollment.botId).toBe("cb_001");
  });

  it("무효 코드는 404 NOT_FOUND 봉투", async () => {
    const repo = makeJoinRepository();
    repo.findJoinCode.mockResolvedValue(null);
    const service = new ClassroomService(repo);

    const err = await service
      .joinByCode("s2", { code: "NOPE-0000" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("code 가 비어 있으면 400 VALIDATION 봉투", async () => {
    const service = new ClassroomService(makeRepository());

    const err = await service
      .joinByCode("s2", { code: "   " })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("신원이 없으면 401, 알 수 없는 사용자도 401", async () => {
    const repo = makeJoinRepository();
    repo.findUserById.mockResolvedValue(null);
    const service = new ClassroomService(repo);

    const noIdentity = await service
      .joinByCode(undefined, { code: "MATH-2024" })
      .catch((e: unknown) => e);
    const unknownUser = await service
      .joinByCode("ghost", { code: "MATH-2024" })
      .catch((e: unknown) => e);

    expectEnvelope(noIdentity, 401, "UNAUTHORIZED");
    expectEnvelope(unknownUser, 401, "UNAUTHORIZED");
  });

  it("학생이 아닌 사용자(교사)는 403 FORBIDDEN 봉투", async () => {
    const repo = makeJoinRepository();
    repo.findUserById.mockResolvedValue({
      id: "teacher_001",
      name: "김수학",
      role: "teacher" as const,
    });
    const service = new ClassroomService(repo);

    const err = await service
      .joinByCode("teacher_001", { code: "MATH-2024" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// 코드 발급 — issueJoinCode (POST /api/bots/:id/join-codes, M2 개정 §2)
// ---------------------------------------------------------------------------

const TEACHER = { id: "teacher_001", name: "김수학", role: "teacher" as const };

/** issueJoinCode happy path 용 저장소 상태 — 봇·반 모두 teacher_001 소유. */
function makeIssueRepository() {
  const repo = makeRepository();
  repo.findUserById.mockResolvedValue(TEACHER);
  repo.findBotById.mockResolvedValue(BOT);
  repo.findClassroomById.mockResolvedValue(CLASSROOM);
  repo.createJoinCode.mockResolvedValue(new Date("2026-07-03T11:00:00.000Z"));
  return repo;
}

describe("ClassroomService.issueJoinCode", () => {
  it("코드 지정 발급 — 정규화된 코드에 teacher_id 를 필수 기록한다", async () => {
    const repo = makeIssueRepository();
    const service = new ClassroomService(repo);

    const result = await service.issueJoinCode("teacher_001", "cb_001", {
      code: " math-2026 ",
      classroomId: "cr_math_a",
    });

    // NULL teacher_id 발급 금지(M2 개정 §1) — 요청 교사를 필수 기록.
    expect(repo.createJoinCode).toHaveBeenCalledWith({
      code: "MATH-2026",
      botId: "cb_001",
      classroomId: "cr_math_a",
      teacherId: "teacher_001",
    });
    expect(result).toEqual({
      code: "MATH-2026",
      botId: "cb_001",
      classroomId: "cr_math_a",
      teacherId: "teacher_001",
      createdAt: "2026-07-03T11:00:00.000Z",
    });
  });

  it("코드 미지정 시 서버가 XXXX-XXXX 코드를 생성한다", async () => {
    const repo = makeIssueRepository();
    const service = new ClassroomService(repo);

    const result = await service.issueJoinCode("teacher_001", "cb_001", {
      classroomId: "cr_math_a",
    });

    expect(result.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(repo.createJoinCode).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: "teacher_001" }),
    );
  });

  it("생성 코드가 충돌하면 재시도한다", async () => {
    const repo = makeIssueRepository();
    repo.createJoinCode
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Date("2026-07-03T11:00:00.000Z"));
    const service = new ClassroomService(repo);

    const result = await service.issueJoinCode("teacher_001", "cb_001", {
      classroomId: "cr_math_a",
    });

    expect(repo.createJoinCode).toHaveBeenCalledTimes(2);
    expect(result.createdAt).toBe("2026-07-03T11:00:00.000Z");
  });

  it("지정 코드가 이미 존재하면 409 CONFLICT 봉투(재시도 없음)", async () => {
    const repo = makeIssueRepository();
    repo.createJoinCode.mockResolvedValue(null);
    const service = new ClassroomService(repo);

    const err = await service
      .issueJoinCode("teacher_001", "cb_001", {
        code: "MATH-2024",
        classroomId: "cr_math_a",
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 409, "CONFLICT");
    expect(repo.createJoinCode).toHaveBeenCalledTimes(1);
  });

  it("요청 교사가 봇 소유자가 아니면 403 FORBIDDEN", async () => {
    const repo = makeIssueRepository();
    repo.findUserById.mockResolvedValue({
      id: "teacher_002",
      name: "박영어",
      role: "teacher" as const,
    });
    const service = new ClassroomService(repo);

    const err = await service
      .issueJoinCode("teacher_002", "cb_001", { classroomId: "cr_math_a" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
    expect(repo.createJoinCode).not.toHaveBeenCalled();
  });

  it("반 소유자가 다르면 403 FORBIDDEN (봇·반 모두 검증)", async () => {
    const repo = makeIssueRepository();
    repo.findClassroomById.mockResolvedValue({
      ...CLASSROOM,
      teacherId: "teacher_002",
    });
    const service = new ClassroomService(repo);

    const err = await service
      .issueJoinCode("teacher_001", "cb_001", { classroomId: "cr_math_a" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
    expect(repo.createJoinCode).not.toHaveBeenCalled();
  });

  it("교사 role 이 아니면 403 FORBIDDEN", async () => {
    const repo = makeIssueRepository();
    repo.findUserById.mockResolvedValue(STUDENT);
    const service = new ClassroomService(repo);

    const err = await service
      .issueJoinCode("s2", "cb_001", { classroomId: "cr_math_a" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("없는 봇 404, 없는 반 404", async () => {
    const repoNoBot = makeIssueRepository();
    repoNoBot.findBotById.mockResolvedValue(null);
    const repoNoClassroom = makeIssueRepository();
    repoNoClassroom.findClassroomById.mockResolvedValue(null);

    const noBot = await new ClassroomService(repoNoBot)
      .issueJoinCode("teacher_001", "cb_none", { classroomId: "cr_math_a" })
      .catch((e: unknown) => e);
    const noClassroom = await new ClassroomService(repoNoClassroom)
      .issueJoinCode("teacher_001", "cb_001", { classroomId: "cr_none" })
      .catch((e: unknown) => e);

    expectEnvelope(noBot, 404, "NOT_FOUND");
    expectEnvelope(noClassroom, 404, "NOT_FOUND");
  });

  it("classroomId 누락 400 VALIDATION · 형식 불량 code 400 VALIDATION", async () => {
    const service = new ClassroomService(makeIssueRepository());

    const noClassroom = await service
      .issueJoinCode("teacher_001", "cb_001", {})
      .catch((e: unknown) => e);
    const badCode = await service
      .issueJoinCode("teacher_001", "cb_001", {
        code: "no spaces!",
        classroomId: "cr_math_a",
      })
      .catch((e: unknown) => e);

    expectEnvelope(noClassroom, 400, "VALIDATION");
    expectEnvelope(badCode, 400, "VALIDATION");
  });

  it("신원이 없으면 401 UNAUTHORIZED", async () => {
    const service = new ClassroomService(makeIssueRepository());

    const err = await service
      .issueJoinCode(undefined, "cb_001", { classroomId: "cr_math_a" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});
