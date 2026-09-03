/**
 * 내가 준 동의 — 읽기 + 부여 (학부모×자기주도 계약 §2).
 *
 * ## 이 라우트가 지키는 것 둘
 *
 * **1. 받는 사람은 본문이 정하지 않는다.** `parent_id` 는 `parent_child_links` 에서 읽는다.
 * 본문에서 받으면 학생이 아무 id 나 적어 **남에게 자기 기록을 넘길 수 있다.** 링크가
 * 없으면 줄 상대가 없는 것이라 400 이다 — 만들어 낼 수 있는 값이 아니다.
 *
 * **2. 기한도 본문이 정하지 않는다.** `expires_at` 은 `scope_label` 에서 파생한다
 * (`app/api/_lib/consent.ts` 의 `expiryFor`). 클라이언트가 만료를 실어 보내면 **무시가
 * 아니라 400 으로 거절**한다 — 조용히 무시하면 보낸 쪽은 자기가 정한 기한이 걸린 줄 알고,
 * 「이번 주만」이라는 약속이 라벨로만 남는다.
 *
 * 담은 봇·공부한 날 라우트와 마찬가지로 **역할 게이트가 없다.** 행이 언제나 호출자
 * 명의(`student_id`)로만 생기고 호출자 명의로만 읽히므로, 남의 동의에 닿는 경로가 없다.
 * 학생이 아닌 사람이 쳐도 링크가 없어 400 에서 멈춘다.
 */

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import {
  invalidInput,
  readJsonBody,
  readTrimmed,
  unauthorized,
} from '@/app/api/_lib/guards';
import {
  expiryFor,
  isScopeLabel,
  isStudentGrantableType,
  livingConsent,
  livingConsentOf,
  resolveGrantRecipient,
} from '@/app/api/_lib/consent';
import type {
  ConsentTypeValue,
  GrantConsentResponse,
  MyConsentRow,
  MyConsentsResponse,
} from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내가 준 **살아 있는** 동의 전부 + 받는 보호자의 이름·관계.
 *
 * 철회했거나 기한이 지난 것은 안 나온다. 살아 있음의 판정은 `livingConsent()` 로
 * **조회 조건 안**에서 하고, 학부모 라우트도 같은 술어를 쓴다 — 한쪽에만 살아 있는
 * 동의가 생기지 않게.
 *
 * `parent` 를 함께 싣는 이유는 둘이다:
 *  1. **화면이 받는 사람을 이름으로 적을 수 있어야 한다** — 「부모님께」가 아니라
 *     「어머니께 보여요」. 무엇을 주는지와 **누구에게** 주는지가 같이 보여야 한다(계약 §3).
 *  2. **`null` 이 「지금은 줄 수 없다」의 유일한 신호다** — 링크가 없으면 부여가 400 이다.
 *     이 값이 없으면 화면은 스위치를 그려 놓고 학생이 눌러서 오류를 만나게 하는 수밖에 없다.
 *
 * id 는 싣지 않는다 — 본문으로 받지 않는 값이라(머리주석 1번). 이름·관계는 되돌려 보낼 수
 * 있는 식별자가 아니라서 그 문을 열지 않는다.
 * @param req - 신원(쿠키 또는 Bearer). 역할은 보지 않는다
 * @returns 200 { parent, consents } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { id: studentId, isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return unauthorized();

  const [recipient, rows] = await Promise.all([
    // 부여 라우트와 **같은 함수**다 — 화면이 적은 이름과 실제로 grant 가 갈 보호자가
    // 같다는 보장이 여기서 나온다.
    resolveGrantRecipient(studentId),
    getDb()
      .select({
        type: consentLogs.type,
        scopeLabel: consentLogs.scopeLabel,
        grantedAt: consentLogs.grantedAt,
        expiresAt: consentLogs.expiresAt,
      })
      .from(consentLogs)
      .where(and(eq(consentLogs.studentId, studentId), livingConsent()))
      .orderBy(asc(consentLogs.grantedAt), asc(consentLogs.type)),
  ]);

  const body: MyConsentsResponse = {
    // id 를 떼고 이름·관계만 — 구조분해로 명시해서 필드가 늘어도 새 나가지 않게 한다.
    parent: recipient ? { name: recipient.name, relation: recipient.relation } : null,
    consents: rows.map(toRow),
  };
  return NextResponse.json(body);
}

/**
 * 동의를 준다 — 살아 있는 동의가 이미 있으면 **갱신**이다(멱등).
 *
 * 두 번째 부여가 새 행을 쌓지 않는 이유: 살아 있는 동의가 타입당 둘이면 학부모 쪽 조인이
 * 자녀를 두 번 돌려주고, 「지금 어떤 범위로 공유 중인가」라는 물음에 답이 둘이 된다.
 * 그래서 범위를 바꾸는 것은 **같은 행을 고쳐 쓰는 일**이다 — 새 행이 생겼을 때만 201 이고
 * 갱신이면 200 인데, **몸통은 둘 다 같다.**
 *
 * ⚠️ 갱신에서 `granted_at` 도 함께 새로 쓴다. 범위를 바꾸면 기한의 기준점이 그 순간이라
 * (「오늘부터 이번 주만」), 준 시각만 옛날에 두면 화면의 「언제부터」와 기한이 어긋난다.
 *
 * ⛔ 지난 동의를 되살리지 않는다 — 철회·만료된 행은 감사 기록으로 그대로 두고 **새 행**을
 * 만든다. 거둔 기록을 나중에 덮어쓰면 「거둔 적 있다」가 사라진다.
 * @param req - body `{ type, scopeLabel }`. 명의도 받는 사람도 본문에서 오지 않는다
 * @returns 201 { consent } | 200 { consent }(갱신) | 400 | 401
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: studentId, isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return unauthorized();

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  // 만료·받는 사람을 실어 보냈으면 **거절한다**(조용히 무시하지 않는다 — 머리주석 2번).
  if ('expiresAt' in body || 'expires_at' in body) {
    return invalidInput('공유 기한은 고른 범위에 따라 정해져요.');
  }
  if ('parentId' in body || 'parent_id' in body) {
    return invalidInput('공유 대상은 고를 수 없어요.');
  }

  const type = readTrimmed(body.type);
  if (!isStudentGrantableType(type)) return invalidInput('공유할 항목을 골라 주세요.');

  const scopeLabel = readTrimmed(body.scopeLabel);
  if (!isScopeLabel(scopeLabel)) return invalidInput('공유 범위를 골라 주세요.');

  const db = getDb();

  // 받는 사람은 **링크가 정한다.** 조회 라우트와 같은 함수라, 화면이 「어머니께」라고
  // 적어 둔 그 사람에게 실제로 간다(둘이 각자 고르면 그 일치는 우연이다).
  const recipient = await resolveGrantRecipient(studentId);
  if (!recipient) return invalidInput('공유할 보호자가 연결되어 있지 않아요.');

  const now = new Date();
  const expiresAt = expiryFor(scopeLabel, now);

  const updated = await db
    .update(consentLogs)
    .set({ scopeLabel, expiresAt, grantedAt: now, parentId: recipient.id })
    .where(livingConsentOf(studentId, type))
    .returning({
      type: consentLogs.type,
      scopeLabel: consentLogs.scopeLabel,
      grantedAt: consentLogs.grantedAt,
      expiresAt: consentLogs.expiresAt,
    });

  if (updated.length > 0) {
    const consent: GrantConsentResponse = { consent: toRow(updated[0]) };
    return NextResponse.json(consent);
  }

  try {
    const [inserted] = await db
      .insert(consentLogs)
      .values({
        id: randomUUID(),
        parentId: recipient.id,
        studentId,
        type,
        grantedAt: now,
        expiresAt,
        scopeLabel,
      })
      .returning({
        type: consentLogs.type,
        scopeLabel: consentLogs.scopeLabel,
        grantedAt: consentLogs.grantedAt,
        expiresAt: consentLogs.expiresAt,
      });

    const consent: GrantConsentResponse = { consent: toRow(inserted) };
    return NextResponse.json(consent, { status: 201 });
  } catch {
    // FK 위반(도메인 `users` 에 없는 신원) 등 쓰기 실패 — 이웃 라우트와 같게 400 으로 답한다.
    return invalidInput('공유 설정을 저장하지 못했어요.');
  }
}

/**
 * DB 행을 계약 모양(문자열 시각)으로.
 *
 * `type` 을 `string` 이 아니라 `ConsentTypeValue` 로 받는다 — 넓게 받으면 스키마 enum 이
 * 늘어나도 여기서 조용히 통과하고, 계약 union 과 갈라진 것을 화면에서야 알게 된다.
 */
function toRow(row: {
  type: ConsentTypeValue;
  scopeLabel: string;
  grantedAt: Date;
  expiresAt: Date | null;
}): MyConsentRow {
  return {
    type: row.type,
    scopeLabel: row.scopeLabel,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}
