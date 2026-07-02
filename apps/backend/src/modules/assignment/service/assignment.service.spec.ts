import { HttpException } from "@nestjs/common";

import type {
  AssignmentRow,
  IAssignmentRepository,
} from "../interface/assignment-repository.interface";
import { AssignmentService } from "./assignment.service";

// ---------------------------------------------------------------------------
// 저장소 더블 + 픽스처
// ---------------------------------------------------------------------------

/** IAssignmentRepository 더블 — 모든 메서드를 jest.fn 프로퍼티로 채운다. */
type RepositoryDouble = { [K in keyof IAssignmentRepository]: jest.Mock };

function makeRepository(): RepositoryDouble {
  return {
    findAssignmentsForStudent: jest.fn(),
    findAssignmentsForTeacher: jest.fn(),
    findAssignmentById: jest.fn(),
    findQuestions: jest.fn(),
    findBotById: jest.fn(),
    hasEnrollment: jest.fn(),
    findUserById: jest.fn(),
    createAssignment: jest.fn(),
    upsertSubmission: jest.fn(),
    findSubmissions: jest.fn(),
  };
}

/** FE AssignmentReadRow 형태의 과제 픽스처 — 전체 enrolled 대상(studentId null). */
const ASSIGNMENT: AssignmentRow = {
  id: "as_user_a1b2c3d4",
  botId: "cb_001",
  studentId: null,
  title: "도함수 활용 마무리 2탄",
  scope: "미적분 > 도함수의 활용",
  subject: "수학Ⅱ",
  grade: "고2",
  chapterFrom: "미적분 > 도함수의 활용",
  chapterTo: "미적분 > 도함수의 활용",
  achievementCodes: ["12수학02-09"],
  questionCount: 10,
  difficulty: "중",
  mode: "practice",
  scopeOverride: null,
  source: "teacher-assigned",
  assignedBy: "수학이 형",
  assignedAtLabel: "방금 발사",
  dueLabel: "내일 22:00",
  dDay: "D-1",
  completedCount: 0,
  recentAccuracy: null,
  state: "todo",
  reasonHint: null,
  solveHref: "/classbot/assignment/as_user_a1b2c3d4/solve?step=1",
};

/** 본인 지정 대상 과제 픽스처 — s2 단일 대상. */
const TARGETED_ASSIGNMENT: AssignmentRow = {
  ...ASSIGNMENT,
  id: "as_user_e5f6a7b8",
  studentId: "s2",
  solveHref: "/classbot/assignment/as_user_e5f6a7b8/solve?step=1",
};

/** cb_001 봇 참조 픽스처 — teacher_001 소유. */
const BOT_REF = {
  id: "cb_001",
  name: "수학이 형",
  teacherId: "teacher_001",
  subject: "수학Ⅱ",
  grade: "고2",
};

/** assignment_questions 한 행 픽스처. */
const QUESTION = {
  id: "q_as_today_1",
  assignmentId: "as_user_a1b2c3d4",
  order: 1,
  type: "mc" as const,
  prompt: "f(x)=x³-3x 의 극댓값은?",
  options: ["-2", "0", "2", "4"],
  answerIndex: 2,
  answerKey: null,
  modelAnswer: null,
  hints: null,
};

/** HttpException 의 spec §3 봉투 { error: { code } } 를 단언한다. */
function expectEnvelope(err: unknown, status: number, code: string) {
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  expect(http.getResponse()).toMatchObject({ error: { code } });
}

// ---------------------------------------------------------------------------
// 읽기 — listAssignments
// ---------------------------------------------------------------------------

describe("AssignmentService.listAssignments", () => {
  it("audience=student — 학생 스코프 행을 FE AssignmentsReadResponse 봉투로 반환한다", async () => {
    const repo = makeRepository();
    repo.findAssignmentsForStudent.mockResolvedValue([ASSIGNMENT]);
    const service = new AssignmentService(repo);

    const result = await service.listAssignments("student", "s2");

    expect(repo.findAssignmentsForStudent).toHaveBeenCalledWith("s2");
    expect(result).toEqual({ assignments: [ASSIGNMENT] });
  });

  it("audience=teacher — 소유 봇 스코프 행을 반환한다", async () => {
    const repo = makeRepository();
    repo.findAssignmentsForTeacher.mockResolvedValue([ASSIGNMENT]);
    const service = new AssignmentService(repo);

    const result = await service.listAssignments("teacher", "teacher_001");

    expect(repo.findAssignmentsForTeacher).toHaveBeenCalledWith("teacher_001");
    expect(result).toEqual({ assignments: [ASSIGNMENT] });
  });

  it("빈 목록은 빈 배열로 반환한다 (spec §3)", async () => {
    const repo = makeRepository();
    repo.findAssignmentsForStudent.mockResolvedValue([]);
    const service = new AssignmentService(repo);

    await expect(service.listAssignments("student", "s2")).resolves.toEqual({
      assignments: [],
    });
  });

  it("audience 가 student|teacher 가 아니면 400 VALIDATION 봉투", async () => {
    const service = new AssignmentService(makeRepository());

    const err = await service
      .listAssignments("parent", "s2")
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("audience 누락도 400 VALIDATION 봉투", async () => {
    const service = new AssignmentService(makeRepository());

    const err = await service
      .listAssignments(undefined, "s2")
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("신원(userId)이 없으면 401 UNAUTHORIZED — M2 개정 §3(무신원 mock 폴백 폐지)", async () => {
    const repo = makeRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .listAssignments("student", undefined)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.findAssignmentsForStudent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 읽기 — getAssignment (상세 + 문항)
// ---------------------------------------------------------------------------

describe("AssignmentService.getAssignment", () => {
  /** 상세 픽스처 — 접근 주체별 허용/차단을 함께 검증한다. */
  function makeDetailRepository(row: AssignmentRow = ASSIGNMENT) {
    const repo = makeRepository();
    repo.findAssignmentById.mockResolvedValue(row);
    repo.findBotById.mockResolvedValue(BOT_REF);
    repo.findQuestions.mockResolvedValue([QUESTION]);
    repo.hasEnrollment.mockResolvedValue(false);
    return repo;
  }

  it("전체 대상 과제 — enrolled 학생이면 FE { assignment } 봉투(+questions)로 반환한다", async () => {
    const repo = makeDetailRepository();
    repo.hasEnrollment.mockResolvedValue(true);
    const service = new AssignmentService(repo);

    const result = await service.getAssignment("as_user_a1b2c3d4", "s2");

    expect(repo.hasEnrollment).toHaveBeenCalledWith("cb_001", "s2");
    expect(result).toEqual({
      assignment: { ...ASSIGNMENT, questions: [QUESTION] },
    });
  });

  it("단일 지정 과제 — 지정 학생 본인이면 enrolled 확인 없이 반환한다", async () => {
    const repo = makeDetailRepository(TARGETED_ASSIGNMENT);
    const service = new AssignmentService(repo);

    const result = await service.getAssignment("as_user_e5f6a7b8", "s2");

    expect(result.assignment.id).toBe("as_user_e5f6a7b8");
    expect(repo.hasEnrollment).not.toHaveBeenCalled();
  });

  it("발사 교사(봇 소유자)도 접근 가능", async () => {
    const repo = makeDetailRepository(TARGETED_ASSIGNMENT);
    const service = new AssignmentService(repo);

    const result = await service.getAssignment(
      "as_user_e5f6a7b8",
      "teacher_001",
    );

    expect(result.assignment.id).toBe("as_user_e5f6a7b8");
  });

  it("문항이 없으면 questions 빈 배열 (콘텐츠는 M3)", async () => {
    const repo = makeDetailRepository();
    repo.hasEnrollment.mockResolvedValue(true);
    repo.findQuestions.mockResolvedValue([]);
    const service = new AssignmentService(repo);

    const result = await service.getAssignment("as_user_a1b2c3d4", "s2");

    expect(result.assignment.questions).toEqual([]);
  });

  it("대상 학생도 발사 교사도 아니면 403 FORBIDDEN 봉투", async () => {
    const repo = makeDetailRepository(TARGETED_ASSIGNMENT);
    const service = new AssignmentService(repo);

    const err = await service
      .getAssignment("as_user_e5f6a7b8", "s9")
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("전체 대상 과제라도 enrolled 아니면 403 FORBIDDEN 봉투", async () => {
    const repo = makeDetailRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .getAssignment("as_user_a1b2c3d4", "s9")
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("없는 과제는 404 NOT_FOUND 봉투", async () => {
    const repo = makeRepository();
    repo.findAssignmentById.mockResolvedValue(null);
    const service = new AssignmentService(repo);

    const err = await service
      .getAssignment("as_missing", "s2")
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("신원이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const repo = makeRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .getAssignment("as_user_a1b2c3d4", undefined)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.findAssignmentById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 쓰기 — dispatchAssignment (교사 발사)
// ---------------------------------------------------------------------------

describe("AssignmentService.dispatchAssignment", () => {
  const TEACHER = { id: "teacher_001", name: "김수학", role: "teacher" };
  const STUDENT = { id: "s2", name: "민준", role: "student" };

  /** FE buildAssignment 구성 필드의 유효 본문 — 전체 발사([]). */
  const BODY = {
    botId: "cb_001",
    title: "도함수 활용 마무리 2탄",
    scope: "미적분 > 도함수의 활용",
    chapterFrom: "미적분 > 도함수의 활용",
    chapterTo: "미적분 > 도함수의 활용",
    achievementCodes: ["12수학02-09"],
    questionCount: 10,
    difficulty: "중",
    mode: "practice",
    dueIso: "2099-01-01T22:00",
    targetStudentIds: [],
    reasonHint: "어제 부호 변화에서 막혔던 사람들 다시 짚자",
  };

  function makeDispatchRepository() {
    const repo = makeRepository();
    repo.findUserById.mockImplementation((id: string) => {
      if (id === TEACHER.id) return Promise.resolve(TEACHER);
      if (id === STUDENT.id) return Promise.resolve(STUDENT);
      return Promise.resolve(null);
    });
    repo.findBotById.mockResolvedValue(BOT_REF);
    repo.hasEnrollment.mockResolvedValue(true);
    repo.createAssignment.mockResolvedValue(true);
    return repo;
  }

  it("전체 발사([]) — studentId null 로 insert 하고 서버 파생 필드를 채워 반환한다", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const row = await service.dispatchAssignment("teacher_001", BODY);

    expect(row.id).toMatch(/^as_user_[0-9a-f]{8}$/);
    expect(row).toMatchObject({
      botId: "cb_001",
      studentId: null,
      title: BODY.title,
      subject: BOT_REF.subject,
      grade: BOT_REF.grade,
      questionCount: 10,
      difficulty: "중",
      mode: "practice",
      scopeOverride: null,
      source: "teacher-assigned",
      assignedBy: BOT_REF.name,
      assignedAtLabel: "방금 발사",
      completedCount: 0,
      recentAccuracy: null,
      state: "todo",
      reasonHint: BODY.reasonHint,
      solveHref: `/classbot/assignment/${row.id}/solve?step=1`,
    });
    expect(row.dueLabel).toEqual(expect.any(String));
    expect(row.dDay).toMatch(/^(오늘|D-\d+)$/);
    expect(repo.createAssignment).toHaveBeenCalledWith(row);
  });

  it("단일 지정 대상 — enrolled 학생 검증 후 studentId 로 기록한다", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const row = await service.dispatchAssignment("teacher_001", {
      ...BODY,
      targetStudentIds: ["s2"],
    });

    expect(row.studentId).toBe("s2");
    expect(repo.hasEnrollment).toHaveBeenCalledWith("cb_001", "s2");
  });

  it("exam 모드는 scopeOverride 1 (FE buildAssignment 동일)", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const row = await service.dispatchAssignment("teacher_001", {
      ...BODY,
      mode: "exam",
      examTimeLimitMin: 60,
    });

    expect(row.mode).toBe("exam");
    expect(row.scopeOverride).toBe(1);
  });

  it("title 5~50자 위반은 400 VALIDATION 봉투", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_001", { ...BODY, title: "짧다" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
    expect(repo.createAssignment).not.toHaveBeenCalled();
  });

  it("다중 지정 대상(2명 이상)은 400 — 스키마에 target_student_ids 부재(제안 DDL 참조)", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_001", {
        ...BODY,
        targetStudentIds: ["s2", "s3"],
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("과거 dueIso 는 400 VALIDATION 봉투", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_001", {
        ...BODY,
        dueIso: "2020-01-01T22:00",
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("교사가 아니면 403 FORBIDDEN 봉투", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("s2", BODY)
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("타 교사 소유 봇이면 403 FORBIDDEN 봉투", async () => {
    const repo = makeDispatchRepository();
    repo.findUserById.mockResolvedValue({
      id: "teacher_002",
      name: "박영어",
      role: "teacher",
    });
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_002", BODY)
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("없는 봇이면 404 NOT_FOUND 봉투", async () => {
    const repo = makeDispatchRepository();
    repo.findBotById.mockResolvedValue(null);
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_001", BODY)
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("대상 학생이 그 봇에 enrolled 가 아니면 400 VALIDATION 봉투", async () => {
    const repo = makeDispatchRepository();
    repo.hasEnrollment.mockResolvedValue(false);
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment("teacher_001", { ...BODY, targetStudentIds: ["s2"] })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("신원이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const repo = makeDispatchRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .dispatchAssignment(undefined, BODY)
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// 제출 — submitAssignment / listSubmissions
// ---------------------------------------------------------------------------

describe("AssignmentService.submitAssignment", () => {
  const SUBMITTED_AT = new Date("2026-07-03T05:00:00.000Z");
  const ANSWERS = { q_as_today_1: "2", q_as_today_2: "0" };

  function makeSubmitRepository(row: AssignmentRow = ASSIGNMENT) {
    const repo = makeRepository();
    repo.findAssignmentById.mockResolvedValue(row);
    repo.findBotById.mockResolvedValue(BOT_REF);
    repo.hasEnrollment.mockResolvedValue(true);
    repo.upsertSubmission.mockImplementation(
      (input: { id: string; assignmentId: string; studentId: string }) =>
        Promise.resolve({
          created: true,
          row: {
            id: input.id,
            assignmentId: input.assignmentId,
            studentId: input.studentId,
            submittedAt: SUBMITTED_AT,
            answers: ANSWERS,
            scorePercent: 80,
          },
        }),
    );
    return repo;
  }

  it("대상 학생 제출 — sub_ id 생성 + upsert, submittedAt ISO 로 반환한다", async () => {
    const repo = makeSubmitRepository();
    const service = new AssignmentService(repo);

    const result = await service.submitAssignment("s2", "as_user_a1b2c3d4", {
      answers: ANSWERS,
      scorePercent: 80,
    });

    expect(repo.upsertSubmission).toHaveBeenCalledTimes(1);
    const upsertInput = (
      repo.upsertSubmission.mock.calls[0] as unknown[]
    )[0] as {
      id: string;
      assignmentId: string;
      studentId: string;
      answers: Record<string, string>;
      scorePercent: number;
    };
    expect(upsertInput.id).toMatch(/^sub_[0-9a-f]{8}$/);
    expect(upsertInput).toMatchObject({
      assignmentId: "as_user_a1b2c3d4",
      studentId: "s2",
      answers: ANSWERS,
      scorePercent: 80,
    });
    expect(result.created).toBe(true);
    expect(result.submission).toMatchObject({
      assignmentId: "as_user_a1b2c3d4",
      studentId: "s2",
      submittedAt: SUBMITTED_AT.toISOString(),
      answers: ANSWERS,
      scorePercent: 80,
    });
  });

  it("재제출은 upsert 멱등 — created=false (FE recordSubmission upsert 의미)", async () => {
    const repo = makeSubmitRepository();
    repo.upsertSubmission.mockResolvedValue({
      created: false,
      row: {
        id: "sub_11111111",
        assignmentId: "as_user_a1b2c3d4",
        studentId: "s2",
        submittedAt: SUBMITTED_AT,
        answers: ANSWERS,
        scorePercent: 90,
      },
    });
    const service = new AssignmentService(repo);

    const result = await service.submitAssignment("s2", "as_user_a1b2c3d4", {
      answers: ANSWERS,
      scorePercent: 90,
    });

    expect(result.created).toBe(false);
    expect(result.submission.scorePercent).toBe(90);
  });

  it("대상이 아닌 학생은 403 FORBIDDEN 봉투", async () => {
    const repo = makeSubmitRepository(TARGETED_ASSIGNMENT);
    const service = new AssignmentService(repo);

    const err = await service
      .submitAssignment("s9", "as_user_e5f6a7b8", {
        answers: ANSWERS,
        scorePercent: 80,
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
    expect(repo.upsertSubmission).not.toHaveBeenCalled();
  });

  it("없는 과제는 404 NOT_FOUND 봉투", async () => {
    const repo = makeSubmitRepository();
    repo.findAssignmentById.mockResolvedValue(null);
    const service = new AssignmentService(repo);

    const err = await service
      .submitAssignment("s2", "as_missing", {
        answers: ANSWERS,
        scorePercent: 80,
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("answers 가 문자열 record 가 아니면 400 VALIDATION 봉투", async () => {
    const repo = makeSubmitRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .submitAssignment("s2", "as_user_a1b2c3d4", {
        answers: { q1: 3 },
        scorePercent: 80,
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("scorePercent 0~100 밖은 400 VALIDATION 봉투", async () => {
    const repo = makeSubmitRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .submitAssignment("s2", "as_user_a1b2c3d4", {
        answers: ANSWERS,
        scorePercent: 120,
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });

  it("신원이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const service = new AssignmentService(makeSubmitRepository());

    const err = await service
      .submitAssignment(undefined, "as_user_a1b2c3d4", {
        answers: ANSWERS,
        scorePercent: 80,
      })
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});

describe("AssignmentService.listSubmissions", () => {
  const SUBMISSION_ROW = {
    id: "sub_11111111",
    assignmentId: "as_user_a1b2c3d4",
    studentId: "s2",
    submittedAt: new Date("2026-07-03T05:00:00.000Z"),
    answers: { q_as_today_1: "2" },
    scorePercent: 80,
  };

  function makeListRepository() {
    const repo = makeRepository();
    repo.findAssignmentById.mockResolvedValue(ASSIGNMENT);
    repo.findBotById.mockResolvedValue(BOT_REF);
    repo.findSubmissions.mockResolvedValue([SUBMISSION_ROW]);
    return repo;
  }

  it("발사 교사(봇 소유자) — 제출 목록을 submittedAt ISO 로 반환한다", async () => {
    const repo = makeListRepository();
    const service = new AssignmentService(repo);

    const result = await service.listSubmissions(
      "teacher_001",
      "as_user_a1b2c3d4",
    );

    expect(repo.findSubmissions).toHaveBeenCalledWith("as_user_a1b2c3d4");
    expect(result).toEqual({
      submissions: [
        {
          id: "sub_11111111",
          assignmentId: "as_user_a1b2c3d4",
          studentId: "s2",
          submittedAt: "2026-07-03T05:00:00.000Z",
          answers: { q_as_today_1: "2" },
          scorePercent: 80,
        },
      ],
    });
  });

  it("발사 교사가 아니면(대상 학생 포함) 403 FORBIDDEN 봉투", async () => {
    const repo = makeListRepository();
    const service = new AssignmentService(repo);

    const err = await service
      .listSubmissions("s2", "as_user_a1b2c3d4")
      .catch((e: unknown) => e);

    expectEnvelope(err, 403, "FORBIDDEN");
  });

  it("없는 과제는 404 NOT_FOUND 봉투", async () => {
    const repo = makeListRepository();
    repo.findAssignmentById.mockResolvedValue(null);
    const service = new AssignmentService(repo);

    const err = await service
      .listSubmissions("teacher_001", "as_missing")
      .catch((e: unknown) => e);

    expectEnvelope(err, 404, "NOT_FOUND");
  });

  it("신원이 없으면 401 UNAUTHORIZED 봉투", async () => {
    const service = new AssignmentService(makeListRepository());

    const err = await service
      .listSubmissions(undefined, "as_user_a1b2c3d4")
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
  });
});
