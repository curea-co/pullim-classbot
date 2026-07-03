import { HttpException } from "@nestjs/common";

import type {
  IMeRepository,
  MeUserRow,
} from "../interface/me-repository.interface";
import { MeService } from "./me.service";

// ---------------------------------------------------------------------------
// 저장소 더블 + 픽스처
// ---------------------------------------------------------------------------

/** IMeRepository 더블 — 모든 메서드를 jest.fn 프로퍼티로 채운다. */
type RepositoryDouble = { [K in keyof IMeRepository]: jest.Mock };

function makeRepository(): RepositoryDouble {
  return {
    upsertUser: jest.fn(),
  };
}

/** OS SSO sub uuid 픽스처 — x-user-id 로 들어오는 신원. */
const SUB = "7f3a2b10-9c4d-4e5f-8a6b-1c2d3e4f5a6b";

/** 프로비저닝된 행 픽스처. */
const USER_ROW: MeUserRow = { id: SUB, name: "김지유", role: "teacher" };

/** HttpException 의 spec §3 봉투 { error: { code } } 를 단언한다. */
function expectEnvelope(err: unknown, status: number, code: string) {
  expect(err).toBeInstanceOf(HttpException);
  const http = err as HttpException;
  expect(http.getStatus()).toBe(status);
  expect(http.getResponse()).toMatchObject({ error: { code } });
}

// ---------------------------------------------------------------------------
// SSO 신원 프로비저닝 — syncMe
// ---------------------------------------------------------------------------

describe("MeService.syncMe", () => {
  it("신규 신원 — id=sub 로 upsert 하고 created=true(201) + { id, name, role } 를 반환한다", async () => {
    const repo = makeRepository();
    repo.upsertUser.mockResolvedValue({ created: true, row: USER_ROW });
    const service = new MeService(repo);

    const result = await service.syncMe(SUB, {
      name: "김지유",
      role: "teacher",
    });

    expect(repo.upsertUser).toHaveBeenCalledWith({
      id: SUB,
      name: "김지유",
      role: "teacher",
    });
    expect(result).toEqual({
      created: true,
      user: { id: SUB, name: "김지유", role: "teacher" },
    });
  });

  it("name 은 trim 후 저장한다 — 앞뒤 공백이 있는 입력도 수용", async () => {
    const repo = makeRepository();
    repo.upsertUser.mockResolvedValue({ created: true, row: USER_ROW });
    const service = new MeService(repo);

    await service.syncMe(SUB, { name: "  김지유  ", role: "teacher" });

    expect(repo.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "김지유" }),
    );
  });

  it("재호출 — created=false(200) + name 갱신, role 변경 시도는 무시되고 기존 role 이 반환된다", async () => {
    const repo = makeRepository();
    // DB 는 name 만 갱신하고 최초 role(student)을 유지한 행을 돌려준다.
    repo.upsertUser.mockResolvedValue({
      created: false,
      row: { id: SUB, name: "김민준(개명)", role: "student" },
    });
    const service = new MeService(repo);

    // body 는 teacher 로 승격을 시도하지만 —
    const result = await service.syncMe(SUB, {
      name: "김민준(개명)",
      role: "teacher",
    });

    // — 응답 role 은 DB 의 최초 값(student) 그대로다(역할 승격 방지).
    expect(result).toEqual({
      created: false,
      user: { id: SUB, name: "김민준(개명)", role: "student" },
    });
  });

  it.each(["parent", "admin", "", 1, null, undefined])(
    "role 이 student|teacher 밖이면 400 VALIDATION — %p",
    async (role) => {
      const repo = makeRepository();
      const service = new MeService(repo);

      const err = await service
        .syncMe(SUB, { name: "김지유", role })
        .catch((e: unknown) => e);

      expectEnvelope(err, 400, "VALIDATION");
      expect(repo.upsertUser).not.toHaveBeenCalled();
    },
  );

  it.each(["", "   ", "가".repeat(51), 1, null, undefined])(
    "name 이 trim 후 1~50자 문자열이 아니면 400 VALIDATION — %p",
    async (name) => {
      const repo = makeRepository();
      const service = new MeService(repo);

      const err = await service
        .syncMe(SUB, { name, role: "student" })
        .catch((e: unknown) => e);

      expectEnvelope(err, 400, "VALIDATION");
      expect(repo.upsertUser).not.toHaveBeenCalled();
    },
  );

  it("trim 후 정확히 50자인 name 은 수용한다 (경계값)", async () => {
    const repo = makeRepository();
    repo.upsertUser.mockResolvedValue({ created: true, row: USER_ROW });
    const service = new MeService(repo);

    await service.syncMe(SUB, {
      name: ` ${"가".repeat(50)} `,
      role: "student",
    });

    expect(repo.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: "가".repeat(50) }),
    );
  });

  it("신원(JWT/x-user-id) 이 없으면 401 UNAUTHORIZED — 무신원 mock 폴백 폐지(M2 개정 §3)", async () => {
    const repo = makeRepository();
    const service = new MeService(repo);

    const err = await service
      .syncMe(undefined, { name: "김지유", role: "teacher" })
      .catch((e: unknown) => e);

    expectEnvelope(err, 401, "UNAUTHORIZED");
    expect(repo.upsertUser).not.toHaveBeenCalled();
  });

  it("본문이 객체가 아니면 400 VALIDATION (name 부재로 수렴)", async () => {
    const repo = makeRepository();
    const service = new MeService(repo);

    const err = await service
      .syncMe(SUB, "not-an-object")
      .catch((e: unknown) => e);

    expectEnvelope(err, 400, "VALIDATION");
  });
});
