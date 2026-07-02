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
