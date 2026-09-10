/**
 * 참여 코드 — 생성 · 정규화 · 발급의 단일 소유자 (계약 §5).
 *
 * 학생이 손으로 옮겨 적는 코드라 **혼동 문자를 뺀** 32자 집합에서 6자를 뽑는다.
 * 저장·비교는 항상 하이픈 없는 대문자 6자이고, 하이픈(`ABC-123`)은 **표시할 때만** 붙인다.
 *
 * ⚠️ 중복 방지는 애플리케이션이 아니라 **DB 가 한다**.
 * `join_codes.code` 는 PRIMARY KEY 이므로 `insert ... onConflictDoNothing()` 이
 * 0행을 돌려주면 "이미 쓰인 코드" 라는 뜻이다 — 그때만 다시 뽑는다.
 * "select 로 있나 보고 없으면 insert" 는 **절대 쓰지 않는다**: 두 요청이 같은 코드를
 * 동시에 조회하면 둘 다 "없음" 을 보고 둘 다 insert 로 달려가 한쪽이 PK 위반으로
 * 터진다(경합). 조회 없이 바로 insert 하면 그 경합 구간 자체가 사라진다.
 */

import { randomInt } from 'node:crypto';

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '@/lib/db/schema';
import { JOIN_CODE_LENGTH } from '@/lib/join-code-format';
import { joinCodes } from '@/lib/db/schema';

// 표기 규칙(길이·정규화·하이픈)은 `lib/join-code-format.ts` 가 주인이다 — 의존성이 없어
// client 컴포넌트도 그 파일만 따로 import 할 수 있다. 여기서는 다시 내보내기만 한다:
// 이 모듈은 `node:crypto` 와 DB 스키마를 물고 있어 브라우저 번들에 실리면 안 된다.
export {
  JOIN_CODE_LENGTH,
  normalizeJoinCode,
  formatJoinCode,
} from '@/lib/join-code-format';

/** 혼동 문자(I·O·0·1) 를 뺀 코드 문자 집합 — 32자. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';


/** 코드 뽑기 재시도 한도 — 이만큼 다 부딪히면 포화로 보고 409 를 준다. */
export const JOIN_CODE_MAX_ATTEMPTS = 8;

/** 코드 자리를 다 못 잡았을 때(재시도 소진) — 호출부가 409 CONFLICT 로 옮긴다. */
export class JoinCodeExhaustedError extends Error {
  constructor(
    message = '참여 코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.',
  ) {
    super(message);
    this.name = 'JoinCodeExhaustedError';
  }
}

/**
 * 코드 후보 한 개를 뽑는다 — 암호학적 난수(`randomInt`) 로 자리마다 균등 추출.
 *
 * `Math.random()` 을 쓰지 않는 이유: 참여 코드는 남의 반에 끼어드는 열쇠라
 * 예측 가능한 난수원이면 안 된다.
 * @returns 대문자 6자 코드
 */
export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** 발급이 필요로 하는 최소한의 DB 능력 — `getDb()` 도 `db.transaction(tx)` 도 그대로 들어맞는다. */
export type JoinCodeWriter = Pick<NodePgDatabase<typeof schema>, 'insert'>;

/** 발급 대상 — 봇·반·교사는 셋 다 같은 교사 소유여야 한다(복합 FK 가 DB 에서 검사). */
export interface IssueJoinCodeInput {
  botId: string;
  classroomId: string;
  /**
   * 발급 교사. **절대 비우지 마라** — `join_codes` 의 복합 FK 는 MATCH SIMPLE 이라
   * `teacher_id` 가 NULL 이면 "봇·반이 같은 교사 소유" 검사가 통째로 건너뛰어진다(계약 §1).
   */
  teacherId: string;
}

/**
 * 새 참여 코드를 발급한다 — 유일성은 PK 충돌로만 판정한다.
 *
 * @param db - `getDb()` 또는 트랜잭션 핸들
 * @param input - 봇·반·교사 id (교사 id 필수)
 * @returns 발급된 코드(하이픈 없는 대문자 6자)
 * @throws {JoinCodeExhaustedError} 재시도를 다 쓰도록 빈 코드를 못 찾았을 때
 */
export async function issueJoinCode(
  db: JoinCodeWriter,
  input: IssueJoinCodeInput,
): Promise<string> {
  for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = generateJoinCode();
    // 조회 없이 바로 insert — 충돌하면 0행이 돌아온다(경합에 안전).
    const inserted = await db
      .insert(joinCodes)
      .values({
        code,
        botId: input.botId,
        classroomId: input.classroomId,
        teacherId: input.teacherId,
      })
      .onConflictDoNothing()
      .returning({ code: joinCodes.code });

    if (inserted.length > 0) return inserted[0].code;
  }

  throw new JoinCodeExhaustedError();
}
