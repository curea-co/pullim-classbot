import { Inject, Injectable } from "@nestjs/common";

import {
  unauthorized,
  validationError,
} from "../../classroom/infrastructure/domain-http.error";
import type { MeSyncResponseDto } from "../controller/dto/me-responses.dto";
import {
  IMeRepository,
  ME_REPOSITORY_TOKEN,
  SYNC_ROLES,
  SyncRole,
} from "../interface/me-repository.interface";

/** name 은 trim 후 1~50자 (M1 spec §2.1). */
const NAME_MAX_LENGTH = 50;

/** sync 결과 — created 는 컨트롤러의 201/200 분기용. */
export interface SyncMeResult {
  created: boolean;
  user: MeSyncResponseDto;
}

/**
 * me 도메인 비즈니스 로직 — SSO 신원 프로비저닝 (M1 spec §2.1).
 *
 * 풀림 OS SSO 로 들어온 사용자(x-user-id = OS sub uuid)를 도메인 `users`
 * 행으로 멱등 upsert 한다(id=sub). 재호출은 name 만 갱신하고 **role 은
 * 최초 값을 유지**한다 — 변경 시도는 무시하고 기존 행을 반환(역할 승격
 * 공격 방지). 프로비저닝된 행이 있어야 enrollments 등 도메인 쓰기의
 * users FK 를 통과한다(M1 핵심).
 *
 * 응답·에러 형태는 spec §3 을 따른다: 성공은 데이터 그대로, 에러는
 * { error: { code, message } } 봉투 — classroom 의 domain-http.error 재사용.
 */
@Injectable()
export class MeService {
  constructor(
    @Inject(ME_REPOSITORY_TOKEN)
    private readonly repository: IMeRepository,
  ) {}

  /**
   * SSO 신원 프로비저닝 — `POST /api/me/sync`.
   *
   * 검증: 신원 부재 401(M2 개정 §3) + role student|teacher(400) +
   * name trim 1~50자(400).
   * @param userId - OS SSO sub uuid (JWT 또는 x-user-id)
   * @param body - { name, role }
   * @returns created(신규 201/기존 200) + DB 에 저장된 { id, name, role }
   */
  async syncMe(
    userId: string | undefined,
    body: unknown,
  ): Promise<SyncMeResult> {
    const requesterId = this.requireUserId(userId);
    const { name, role } = this.parseSyncBody(body);

    const { created, row } = await this.repository.upsertUser({
      id: requesterId,
      name,
      role,
    });
    // row.role 은 DB 값 — 재호출의 role 변경 시도가 무시된 결과를 그대로 노출.
    return { created, user: { id: row.id, name: row.name, role: row.role } };
  }

  /** body 파싱 — name trim 1~50자(400), role student|teacher(400). */
  private parseSyncBody(body: unknown): { name: string; role: SyncRole } {
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
      throw validationError(
        `name 은 공백 제외 1~${NAME_MAX_LENGTH}자 문자열이어야 합니다.`,
      );
    }

    const role = record.role;
    if (!SYNC_ROLES.includes(role as SyncRole)) {
      throw validationError("role 은 student|teacher 여야 합니다.");
    }

    return { name, role: role as SyncRole };
  }

  /** 신원이 없으면 401 봉투 — M2 개정 §3 (무신원 mock 폴백 폐지). */
  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw unauthorized("로그인이 필요합니다.");
    }
    return userId;
  }
}
