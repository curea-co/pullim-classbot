import { HttpException } from "@nestjs/common";

import type {
  IInterventionRepository,
  InterventionRow,
  NewIntervention,
} from "../interface/intervention-repository.interface";
import { InterventionService } from "./intervention.service";

/** createInterventions 더블의 n번째 호출 insert 배치를 꺼낸다. */
function insertedBatch(repo: RepositoryDouble, call = 0): NewIntervention[] {
  return (
    repo.createInterventions.mock.calls[call] as unknown[]
  )[0] as NewIntervention[];
}

// ---------------------------------------------------------------------------
// 저장소 더블 + 픽스처
// ---------------------------------------------------------------------------

/** IInterventionRepository 더블 — 모든 메서드를 jest.fn 프로퍼티로 채운다. */
type RepositoryDouble = { [K in keyof IInterventionRepository]: jest.Mock };

function makeRepository(): RepositoryDouble {
  return {
    createInterventions: jest.fn(),
    findInterventionsForStudent: jest.fn(),
    findInterventionById: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    findInterventionsForAssignment: jest.fn(),
    findBotById: jest.fn(),
    hasEnrollment: jest.fn(),
    findUserById: jest.fn(),
    findAssignmentRefById: jest.fn(),
  };
}

/** cb_001 봇 참조 픽스처 — teacher_001 소유. */
const BOT_REF = { id: "cb_001", teacherId: "teacher_001" };

/** 발사 교사 픽스처. */
const TEACHER = { id: "teacher_001", name: "김지유", role: "teacher" as const };

/** 수신 학생 픽스처. */
const STUDENT = { id: "s2", name: "김민준", role: "student" as const };

/** 과제 참조 픽스처 — cb_001 봇의 과제. */
const ASSIGNMENT_REF = { id: "as_user_a1b2c3d4", botId: "cb_001" };

/** remind 발신 입력 픽스처 — FE InterventionInput 형태. */
const REMIND_INPUT = {
  type: "remind",
  botId: "cb_001",
  studentId: "s2",
  assignmentId: "as_user_a1b2c3d4",
  message: "'도함수 활용 마무리 2탄' 과제가 아직 제출 전이에요.",
};

/** 저장된 remind 이벤트 한 행 픽스처. */
const REMIND_ROW: InterventionRow = {
  id: "iv_a1b2c3d4",
  type: "remind",
  botId: "cb_001",
  studentId: "s2",
  assignmentId: "as_user_a1b2c3d4",
  createdBy: "teacher_001",
  message: "'도함수 활용 마무리 2탄' 과제가 아직 제출 전이에요.",
  createdAt: new Date("2026-07-03T04:00:00.000Z"),
  readAt: null,
};

/** REMIND_ROW 의 응답형 — createdAt/readAt ISO 직렬화(spec §3). */
const REMIND_DTO = {
  ...REMIND_ROW,
  createdAt: "2026-07-03T04:00:00.000Z",
  readAt: null,
};

/** HttpException 의 spec §3 봉투 { error: { code } } 를 단언한다. */
function expectEnvelope(err: unknown, status: number, code: string) {
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  expect(http.getResponse()).toMatchObject({ error: { code } });
}

/** 발신 해피패스 저장소 상태 — teacher_001 이 cb_001 로 s2 에게 발신 가능. */
function makeSendableRepository(): RepositoryDouble {
  const repo = makeRepository();
  repo.findUserById.mockResolvedValue(TEACHER);
  repo.findBotById.mockResolvedValue(BOT_REF);
  repo.findAssignmentRefById.mockResolvedValue(ASSIGNMENT_REF);
  repo.hasEnrollment.mockResolvedValue(true);
  repo.createInterventions.mockResolvedValue([REMIND_ROW]);
  return repo;
}

// ---------------------------------------------------------------------------
// 발신 — sendInterventions
// ---------------------------------------------------------------------------

describe("InterventionService.sendInterventions", () => {
  it("bulk { events: [...] } — 검증 통과 시 일괄 insert 하고 생성 배열 봉투를 반환한다", async () => {
    const repo = makeSendableRepository();
    const service = new InterventionService(repo);

    const result = await service.sendInterventions("teacher_001", {
      events: [REMIND_INPUT],
    });

    expect(repo.createInterventions).toHaveBeenCalledTimes(1);
    const rows = insertedBatch(repo);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "remind",
      botId: "cb_001",
      studentId: "s2",
      assignmentId: "as_user_a1b2c3d4",
      createdBy: "teacher_001",
      message: REMIND_INPUT.message,
    });
    expect(rows[0].id).toMatch(/^iv_[0-9a-f]{8}$/);
    expect(result).toEqual({ interventions: [REMIND_DTO] });
  });

  it("단건 객체 본문도 수용한다 — { events } 없이 이벤트 필드 직접", async () => {
    const repo = makeSendableRepository();
    const service = new InterventionService(repo);

    const result = await service.sendInterventions("teacher_001", REMIND_INPUT);

    expect(repo.createInterventions).toHaveBeenCalledTimes(1);
    expect(insertedBatch(repo)).toHaveLength(1);
    expect(result).toEqual({ interventions: [REMIND_DTO] });
  });

  it("crisis — assignmentId 없이 발신하면 null 로 영속하고 과제 조회를 생략한다", async () => {
    const repo = makeSendableRepository();
    const crisisRow: InterventionRow = {
      ...REMIND_ROW,
      id: "iv_b2c3d4e5",
      type: "crisis",
      assignmentId: null,
      message: "요즘 힘들지? 선생님이 응원해!",
    };
    repo.createInterventions.mockResolvedValue([crisisRow]);
    const service = new InterventionService(repo);

    await service.sendInterventions("teacher_001", {
      type: "crisis",
      botId: "cb_001",
      studentId: "s2",
      message: "요즘 힘들지? 선생님이 응원해!",
    });

    expect(insertedBatch(repo)[0]).toMatchObject({
      type: "crisis",
      assignmentId: null,
    });
    expect(repo.findAssignmentRefById).not.toHaveBeenCalled();
  });

  it("무신원이면 401 UNAUTHORIZED — M2 개정 §3(무신원 mock 폴백 폐지)", async () => {
    const repo = makeSendableRepository();
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions(undefined, { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.createInterventions).not.toHaveBeenCalled();
  });

  it("알 수 없는 사용자는 401 UNAUTHORIZED", async () => {
    const repo = makeSendableRepository();
    repo.findUserById.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("ghost", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });

  it("학생이 발신하면 403 FORBIDDEN", async () => {
    const repo = makeSendableRepository();
    repo.findUserById.mockResolvedValue(STUDENT);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("s2", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("남의 봇으로 발신하면 403 FORBIDDEN", async () => {
    const repo = makeSendableRepository();
    repo.findUserById.mockResolvedValue({ ...TEACHER, id: "teacher_002" });
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_002", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("없는 봇이면 404 NOT_FOUND", async () => {
    const repo = makeSendableRepository();
    repo.findBotById.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("없는 과제를 참조하면 404 NOT_FOUND", async () => {
    const repo = makeSendableRepository();
    repo.findAssignmentRefById.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it.each(["remind", "comment", "requiz"] as const)(
    "%s 인데 assignmentId 가 없으면 400 VALIDATION (spec §3 — crisis 만 null 허용)",
    async (type) => {
      const repo = makeSendableRepository();
      const service = new InterventionService(repo);
      const withoutAssignment: Record<string, unknown> = { ...REMIND_INPUT };
      delete withoutAssignment.assignmentId;

      const err = await service
        .sendInterventions("teacher_001", {
          events: [{ ...withoutAssignment, type }],
        })
        .catch((e: unknown) => e);

      expectEnvelope(err, 400, "VALIDATION");
      expect(repo.createInterventions).not.toHaveBeenCalled();
    },
  );

  it("assignmentId 의 과제가 다른 봇 소속이면 400 VALIDATION (크로스 봇 오염 차단)", async () => {
    const repo = makeSendableRepository();
    repo.findAssignmentRefById.mockResolvedValue({
      id: "as_user_a1b2c3d4",
      botId: "cb_002",
    });
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
    expect(repo.createInterventions).not.toHaveBeenCalled();
  });

  it("그 봇에 enrolled 되지 않은 학생 대상이면 400 VALIDATION", async () => {
    const repo = makeSendableRepository();
    repo.hasEnrollment.mockResolvedValue(false);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
    expect(repo.createInterventions).not.toHaveBeenCalled();
  });

  it("type 이 enum 밖이면 400 VALIDATION", async () => {
    const service = new InterventionService(makeSendableRepository());

    const err = await service
      .sendInterventions("teacher_001", {
        events: [{ ...REMIND_INPUT, type: "nudge" }],
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("message 가 비어 있으면 400 VALIDATION", async () => {
    const service = new InterventionService(makeSendableRepository());

    const err = await service
      .sendInterventions("teacher_001", {
        events: [{ ...REMIND_INPUT, message: "   " }],
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("events 가 빈 배열이면 400 VALIDATION", async () => {
    const service = new InterventionService(makeSendableRepository());

    const err = await service
      .sendInterventions("teacher_001", { events: [] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("한 건이라도 검증 실패하면 아무것도 insert 하지 않는다 (일괄 원자성)", async () => {
    const repo = makeSendableRepository();
    // s2 는 enrolled, s3 는 미enrolled.
    repo.hasEnrollment.mockImplementation((_botId: string, sid: string) =>
      Promise.resolve(sid === "s2"),
    );
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", {
        events: [REMIND_INPUT, { ...REMIND_INPUT, studentId: "s3" }],
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
    expect(repo.createInterventions).not.toHaveBeenCalled();
  });

  it("id PK 충돌(null 반환) 시 새 id 로 재시도한다", async () => {
    const repo = makeSendableRepository();
    repo.createInterventions
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([REMIND_ROW]);
    const service = new InterventionService(repo);

    const result = await service.sendInterventions("teacher_001", {
      events: [REMIND_INPUT],
    });

    expect(repo.createInterventions).toHaveBeenCalledTimes(2);
    const firstIds = insertedBatch(repo, 0).map((r) => r.id);
    const secondIds = insertedBatch(repo, 1).map((r) => r.id);
    expect(secondIds).not.toEqual(firstIds);
    expect(result).toEqual({ interventions: [REMIND_DTO] });
  });

  it("연속 충돌이 재시도 상한을 넘으면 409 CONFLICT", async () => {
    const repo = makeSendableRepository();
    repo.createInterventions.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .sendInterventions("teacher_001", { events: [REMIND_INPUT] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 409, "CONFLICT");
  });
});

// ---------------------------------------------------------------------------
// 학생 인박스 — listInterventions
// ---------------------------------------------------------------------------

describe("InterventionService.listInterventions", () => {
  it("audience=student — 요청 학생의 이벤트를 최신순 봉투로 반환한다", async () => {
    const repo = makeRepository();
    repo.findInterventionsForStudent.mockResolvedValue([REMIND_ROW]);
    const service = new InterventionService(repo);

    const result = await service.listInterventions("student", "s2");

    expect(repo.findInterventionsForStudent).toHaveBeenCalledWith("s2");
    expect(result).toEqual({ interventions: [REMIND_DTO] });
  });

  it("빈 인박스는 빈 배열로 반환한다 (spec §3)", async () => {
    const repo = makeRepository();
    repo.findInterventionsForStudent.mockResolvedValue([]);
    const service = new InterventionService(repo);

    const result = await service.listInterventions("student", "s2");

    expect(result).toEqual({ interventions: [] });
  });

  it("audience 가 student 가 아니면 400 VALIDATION 봉투", async () => {
    const service = new InterventionService(makeRepository());

    const err = await service
      .listInterventions("teacher", "teacher_001")
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("무신원이면 401 UNAUTHORIZED — M2 개정 §3", async () => {
    const repo = makeRepository();
    const service = new InterventionService(repo);

    const err = await service
      .listInterventions("student", undefined)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.findInterventionsForStudent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 읽음 처리 — markRead / markAllRead
// ---------------------------------------------------------------------------

describe("InterventionService.markRead", () => {
  it("수신 학생 본인이면 read_at 을 기록하고 갱신 행을 반환한다", async () => {
    const repo = makeRepository();
    const readRow = {
      ...REMIND_ROW,
      readAt: new Date("2026-07-03T05:00:00.000Z"),
    };
    repo.findInterventionById.mockResolvedValue(REMIND_ROW);
    repo.markRead.mockResolvedValue(readRow);
    const service = new InterventionService(repo);

    const result = await service.markRead("s2", "iv_a1b2c3d4");

    expect(repo.markRead).toHaveBeenCalledWith("iv_a1b2c3d4");
    expect(result).toEqual({
      ...REMIND_DTO,
      readAt: "2026-07-03T05:00:00.000Z",
    });
  });

  it("이미 읽음이면 기존 read_at 그대로 200 (멱등)", async () => {
    const repo = makeRepository();
    const readRow = {
      ...REMIND_ROW,
      readAt: new Date("2026-07-03T05:00:00.000Z"),
    };
    repo.findInterventionById.mockResolvedValue(readRow);
    repo.markRead.mockResolvedValue(readRow);
    const service = new InterventionService(repo);

    const result = await service.markRead("s2", "iv_a1b2c3d4");

    expect(result.readAt).toBe("2026-07-03T05:00:00.000Z");
  });

  it("수신 학생 본인이 아니면 403 FORBIDDEN", async () => {
    const repo = makeRepository();
    repo.findInterventionById.mockResolvedValue(REMIND_ROW);
    const service = new InterventionService(repo);

    const err = await service
      .markRead("s3", "iv_a1b2c3d4")
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
    expect(repo.markRead).not.toHaveBeenCalled();
  });

  it("없는 이벤트면 404 NOT_FOUND", async () => {
    const repo = makeRepository();
    repo.findInterventionById.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .markRead("s2", "iv_missing1")
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("무신원이면 401 UNAUTHORIZED", async () => {
    const service = new InterventionService(makeRepository());

    const err = await service
      .markRead(undefined, "iv_a1b2c3d4")
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});

describe("InterventionService.markAllRead", () => {
  it("요청 학생의 미읽음 전체를 읽음 처리하고 { updated } 를 반환한다", async () => {
    const repo = makeRepository();
    repo.markAllRead.mockResolvedValue(3);
    const service = new InterventionService(repo);

    const result = await service.markAllRead("s2");

    expect(repo.markAllRead).toHaveBeenCalledWith("s2");
    expect(result).toEqual({ updated: 3 });
  });

  it("미읽음이 없으면 { updated: 0 } (멱등)", async () => {
    const repo = makeRepository();
    repo.markAllRead.mockResolvedValue(0);
    const service = new InterventionService(repo);

    const result = await service.markAllRead("s2");

    expect(result).toEqual({ updated: 0 });
  });

  it("무신원이면 401 UNAUTHORIZED", async () => {
    const repo = makeRepository();
    const service = new InterventionService(repo);

    const err = await service.markAllRead(undefined).catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.markAllRead).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 과제별 개입 목록 — listAssignmentInterventions
// ---------------------------------------------------------------------------

describe("InterventionService.listAssignmentInterventions", () => {
  /** 과제별 조회 해피패스 저장소 상태 — teacher_001 소유 봇의 과제. */
  function makeAssignmentScopedRepository(): RepositoryDouble {
    const repo = makeRepository();
    repo.findAssignmentRefById.mockResolvedValue(ASSIGNMENT_REF);
    repo.findBotById.mockResolvedValue(BOT_REF);
    repo.findInterventionsForAssignment.mockResolvedValue([REMIND_ROW]);
    return repo;
  }

  it("발사 교사 — 과제별 개입 전체를 봉투로 반환한다 (type 생략)", async () => {
    const repo = makeAssignmentScopedRepository();
    const service = new InterventionService(repo);

    const result = await service.listAssignmentInterventions(
      "teacher_001",
      "as_user_a1b2c3d4",
      undefined,
    );

    expect(repo.findInterventionsForAssignment).toHaveBeenCalledWith(
      "as_user_a1b2c3d4",
      null,
    );
    expect(result).toEqual({ interventions: [REMIND_DTO] });
  });

  it("type=remind — 리마인드만 필터한다 (FE useRemindedStudentIds 의 서버판)", async () => {
    const repo = makeAssignmentScopedRepository();
    const service = new InterventionService(repo);

    await service.listAssignmentInterventions(
      "teacher_001",
      "as_user_a1b2c3d4",
      "remind",
    );

    expect(repo.findInterventionsForAssignment).toHaveBeenCalledWith(
      "as_user_a1b2c3d4",
      "remind",
    );
  });

  it("type 이 enum 밖이면 400 VALIDATION", async () => {
    const service = new InterventionService(makeAssignmentScopedRepository());

    const err = await service
      .listAssignmentInterventions("teacher_001", "as_user_a1b2c3d4", "nudge")
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("발사 교사(봇 소유자)가 아니면 403 FORBIDDEN", async () => {
    const repo = makeAssignmentScopedRepository();
    const service = new InterventionService(repo);

    const err = await service
      .listAssignmentInterventions("teacher_002", "as_user_a1b2c3d4", "remind")
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
    expect(repo.findInterventionsForAssignment).not.toHaveBeenCalled();
  });

  it("없는 과제면 404 NOT_FOUND", async () => {
    const repo = makeAssignmentScopedRepository();
    repo.findAssignmentRefById.mockResolvedValue(null);
    const service = new InterventionService(repo);

    const err = await service
      .listAssignmentInterventions("teacher_001", "as_missing", "remind")
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("무신원이면 401 UNAUTHORIZED", async () => {
    const repo = makeAssignmentScopedRepository();
    const service = new InterventionService(repo);

    const err = await service
      .listAssignmentInterventions(undefined, "as_user_a1b2c3d4", "remind")
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.findInterventionsForAssignment).not.toHaveBeenCalled();
  });
});
