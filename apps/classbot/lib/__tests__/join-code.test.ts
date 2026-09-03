/**
 * @jest-environment node
 *
 * 참여 코드 규칙 단위 테스트 (계약 §5).
 *
 * 핵심은 **유일성을 누가 보장하나** 다. 이 모듈은 "있나 보고 없으면 넣는" 짓을 하지 않고,
 * PK 충돌(삽입 0행)만 보고 다시 뽑는다 — 그 성질을 가짜 writer 로 못박는다.
 * 가짜 writer 에는 `select` 자체가 없으므로, 조회를 하려 들면 테스트가 터진다.
 */

import {
  formatJoinCode,
  generateJoinCode,
  issueJoinCode,
  JoinCodeExhaustedError,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  JOIN_CODE_MAX_ATTEMPTS,
  normalizeJoinCode,
  type JoinCodeWriter,
} from '@/lib/join-code';

/** 삽입된 행 한 개. */
interface InsertedRow {
  code: string;
  botId: string;
  classroomId: string;
  teacherId: string | null;
}

/**
 * 가짜 writer — 앞의 `conflictCount` 번은 PK 충돌(0행), 그다음부터 성공(1행).
 * `select` 를 일부러 넣지 않는다: 구현이 조회를 시도하면 TypeError 로 드러난다.
 */
function fakeWriter(conflictCount: number) {
  const inserted: InsertedRow[] = [];
  let attempts = 0;

  const writer = {
    insert: () => ({
      values: (row: InsertedRow) => {
        inserted.push(row);
        return {
          onConflictDoNothing: () => ({
            returning: (): Promise<Array<{ code: string }>> => {
              attempts += 1;
              return Promise.resolve(
                attempts <= conflictCount ? [] : [{ code: row.code }],
              );
            },
          }),
        };
      },
    }),
  };

  return {
    writer: writer as unknown as JoinCodeWriter,
    inserted,
    attemptCount: () => attempts,
  };
}

describe('문자 집합 · 형식', () => {
  it('혼동 문자(I·O·0·1)를 쓰지 않는다', () => {
    for (const ch of ['I', 'O', '0', '1']) {
      expect(JOIN_CODE_ALPHABET).not.toContain(ch);
    }
    expect(JOIN_CODE_ALPHABET).toHaveLength(32);
  });

  it('generateJoinCode 는 집합 안 문자로만 6자를 만든다', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
    }
  });

  it('normalizeJoinCode 는 대문자화하고 하이픈·공백을 지운다', () => {
    expect(normalizeJoinCode('abc-123')).toBe('ABC123');
    expect(normalizeJoinCode(' abc 123 ')).toBe('ABC123');
    expect(normalizeJoinCode('A-B C-1 2 3')).toBe('ABC123');
    // 레거시 코드도 같은 규칙으로 접힌다.
    expect(normalizeJoinCode('math-2024')).toBe('MATH2024');
  });

  it('formatJoinCode 는 표시할 때만 하이픈을 넣는다', () => {
    expect(formatJoinCode('ABC123')).toBe('ABC-123');
    expect(formatJoinCode('abc-123')).toBe('ABC-123');
    // 6자가 아니면 원문을 대문자로만 — 레거시 코드를 망가뜨리지 않는다.
    expect(formatJoinCode('MATH-2024')).toBe('MATH2024');
  });
});

describe('issueJoinCode — 유일성은 PK 가 판정한다', () => {
  it('첫 삽입이 성공하면 그 코드를 돌려준다', async () => {
    const { writer, inserted, attemptCount } = fakeWriter(0);

    const code = await issueJoinCode(writer, {
      botId: 'cb_1',
      classroomId: 'cr_1',
      teacherId: 'teacher_001',
    });

    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    expect(attemptCount()).toBe(1);
    expect(inserted).toHaveLength(1);
  });

  it('teacher_id 를 반드시 싣는다 (NULL 이면 소유권 복합 FK 가 검사에서 빠진다)', async () => {
    const { writer, inserted } = fakeWriter(0);

    await issueJoinCode(writer, {
      botId: 'cb_1',
      classroomId: 'cr_1',
      teacherId: 'teacher_001',
    });

    expect(inserted[0]).toMatchObject({
      botId: 'cb_1',
      classroomId: 'cr_1',
      teacherId: 'teacher_001',
    });
    expect(inserted[0].teacherId).not.toBeNull();
  });

  it('삽입 0행(= 이미 쓰인 코드)이면 다른 코드로 다시 뽑는다', async () => {
    const { writer, inserted, attemptCount } = fakeWriter(3);

    const code = await issueJoinCode(writer, {
      botId: 'cb_1',
      classroomId: 'cr_1',
      teacherId: 'teacher_001',
    });

    expect(attemptCount()).toBe(4);
    expect(inserted).toHaveLength(4);
    // 재시도마다 새 코드를 뽑는다 — 같은 코드를 다시 밀어 넣지 않는다.
    expect(new Set(inserted.map((r) => r.code)).size).toBe(4);
    expect(code).toBe(inserted[3].code);
  });

  it(`${JOIN_CODE_MAX_ATTEMPTS}회 모두 충돌하면 JoinCodeExhaustedError (호출부가 409)`, async () => {
    const { writer, attemptCount } = fakeWriter(Number.MAX_SAFE_INTEGER);

    await expect(
      issueJoinCode(writer, {
        botId: 'cb_1',
        classroomId: 'cr_1',
        teacherId: 'teacher_001',
      }),
    ).rejects.toBeInstanceOf(JoinCodeExhaustedError);

    expect(attemptCount()).toBe(JOIN_CODE_MAX_ATTEMPTS);
  });
});
