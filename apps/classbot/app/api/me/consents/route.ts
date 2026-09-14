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
 * **3. 게이트는 학생 전용이다.** 담은 봇·공부한 날 라우트와 **같은 규약**이다
 * (`app/api/me/self-bots/route.ts` 머리주석) — `resolveActor` 가 도메인 `users.role` 을
 * 권위로 보고, 학생이 아니면 403 이다.
 *
 * ⛔ **「명의가 잠겨 있으니 역할 게이트는 없어도 된다」로 접지 마라 — 한 번 그렇게 썼다.**
 * 그 논증은 「학생이 아닌 사람은 `parent_child_links` 가 없어 400 에서 멈춘다」에 기대는데,
 * **링크가 없다는 것은 권한 검증이 아니다.** 스키마가 그 링크의 `student_id` 쪽을
 * `role='student'` 로 강제하지 않으므로, 교사·학부모 명의로도 링크가 있으면 두 동의 축이
 * 그 사람 이름으로 **생긴다.** 그러면 05 § 11.4 가 「학생 본인의 승인」을 최종 관문으로
 * 둔 계약이 깨진다. 명의 잠금은 「남의 것에 닿지 못하게」이고, 역할 게이트는 「학생 아닌
 * 사람의 동의가 아예 생기지 못하게」다 — **둘은 다른 자물쇠이고 서로를 대신하지 않는다.**
 */

import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs, users } from '@/lib/db/schema';
import {
  denyUnlessStudent,
  invalidInput,
  readJsonBody,
  readTrimmed,
  resolveActor,
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
 *
 * ## ⛔ 목록을 「지금 보호자」로 좁히지 마라 — 한 번 좁혔다가 되돌렸다
 *
 * 좁히고 싶어지는 이유는 분명하다. 링크의 주 보호자가 바뀌면 옛 보호자 대상 동의가
 * 지금 보호자의 이름과 함께 실려, 화면이 「어머니께 보여드리는 중」이라 쓰는데 실제 권한은
 * 다른 사람에게 열려 있는 것처럼 읽힌다.
 *
 * 그런데 `WHERE parent_id = <지금 보호자>` 로 막으면 **더 나쁜 것**을 얻는다. 옛 보호자의
 * 링크가 남아 있는 한 그 동의는 여전히 유효하고(학부모 조회는
 * `consent_logs.parent_id = parent_child_links.parent_id` 로 열린다), 학생 화면에서만
 * 사라진다 — **권한은 살아 있는데 학생이 보지도 끄지도 못한다.** 프라이버시 화면이
 * 낼 수 있는 최악의 결과다.
 *
 * 그래서 **살아 있는 동의는 전부 돌려주고**, 어디로 가는지를 행마다
 * `toCurrentParent` boolean 으로 싣는다. 첫 번째 거짓말(누구에게 가는지 흐린 것)은
 * 그 칸이 막고, 두 번째 사고(못 끄는 권한)는 목록에 남겨 두는 것이 막는다.
 * 화면은 이 칸으로 「지금 보호자께 보여요」와 「다른 보호자께 아직 열려 있어요」를 갈라
 * 그리고, 철회는 `(학생, 타입)` 기준이라 받는 사람과 무관하게 꺼진다.
 *
 * 받는 사람이 **없어도** 조회한다 — 링크가 끊긴 뒤에도 행은 남는다. 그때야말로 학생이
 * 그 줄을 봐야 끌 수 있다(링크가 되살아나면 열람도 되살아난다).
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { parent, consents } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  const denied = denyUnlessStudent(actor);
  if (denied) return denied;
  const studentId = actor.id;

  // 부여 라우트와 **같은 함수**다 — 화면이 적은 이름과 실제로 grant 가 갈 보호자가
  // 같다는 보장이 여기서 나온다.
  const recipient = await resolveGrantRecipient(studentId);

  const rows = await getDb()
    .select({
      type: consentLogs.type,
      scopeLabel: consentLogs.scopeLabel,
      grantedAt: consentLogs.grantedAt,
      expiresAt: consentLogs.expiresAt,
      // 응답에 싣지 않는다 — 아래에서 boolean 으로 접는다(머리주석 ⛔).
      parentId: consentLogs.parentId,
    })
    .from(consentLogs)
    .where(and(eq(consentLogs.studentId, studentId), livingConsent()))
    .orderBy(asc(consentLogs.grantedAt), asc(consentLogs.type));

  const body: MyConsentsResponse = {
    // id 를 떼고 이름·관계만 — 구조분해로 명시해서 필드가 늘어도 새 나가지 않게 한다.
    parent: recipient ? { name: recipient.name, relation: recipient.relation } : null,
    consents: rows.map((row) =>
      toRow(row, recipient !== null && row.parentId === recipient.id),
    ),
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
 * **그 멱등은 동시 요청에서도 성립한다** — 「찾아보고 없으면 넣는다」를 트랜잭션 안에 두고
 * 학생 행을 `FOR UPDATE` 로 잠근다. 잠금 없이 두면 동시 요청 둘이 각자 새 행을 넣어
 * 살아 있는 동의가 둘이 됐다. 까닭과 왜 DB 제약으로 못 막는지는 아래 잠금 옆 주석에 있다.
 *
 * ⚠️ 갱신에서 `granted_at` 도 함께 새로 쓴다. 범위를 바꾸면 기한의 기준점이 그 순간이라
 * (「오늘부터 이번 주만」), 준 시각만 옛날에 두면 화면의 「언제부터」와 기한이 어긋난다.
 *
 * ⛔ 지난 동의를 되살리지 않는다 — 철회·만료된 행은 감사 기록으로 그대로 두고 **새 행**을
 * 만든다. 거둔 기록을 나중에 덮어쓰면 「거둔 적 있다」가 사라진다.
 * @param req - body `{ type, scopeLabel }`. 명의도 받는 사람도 본문에서 오지 않는다
 * @returns 201 { consent } | 200 { consent }(갱신) | 400 | 401 | 403
 */
export async function POST(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  const denied = denyUnlessStudent(actor);
  if (denied) return denied;
  const studentId = actor.id;

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

  const returning = {
    type: consentLogs.type,
    scopeLabel: consentLogs.scopeLabel,
    grantedAt: consentLogs.grantedAt,
    expiresAt: consentLogs.expiresAt,
  };

  try {
    const outcome = await db.transaction(async (tx) => {
      /*
        학생 행을 먼저 잠근다 — **이 잠금이 「살아 있는 동의는 타입당 하나」를 지킨다.**

        「갱신할 행을 찾아보고, 없으면 넣는다」는 순서만으로는 안 된다. 부여 요청 둘이
        동시에 오면(학생이 스위치를 두 번 톡 치면) **둘 다 갱신할 행을 못 찾고 각자 새 행을
        넣어** 살아 있는 동의가 둘이 된다. 그러면 멱등이라는 이 라우트의 계약이 깨지고,
        「지금 어떤 범위로 공유 중인가」에 답이 둘이 된다.

        같은 학생의 부여는 모두 이 한 행을 놓고 줄을 서므로, 뒤 요청은 앞 요청이 커밋한
        뒤에야 UPDATE 를 시작한다 — 그 시점에는 갱신할 행이 있어서 INSERT 로 내려가지 않는다.
        `users.id` 를 고른 것은 그 행이 **언제나 있기 때문**이다: `consent_logs.student_id` 와
        `parent_child_links.student_id` 가 둘 다 그 표를 FK 로 물고, 위에서 링크를 이미
        확인했으므로 여기 도달한 학생의 행은 존재한다.

        ⚠ 잠금 범위는 **학생 하나**다(타입별이 아니다). 한 학생이 두 타입을 동시에 켜면
        직렬화되지만, 사람이 스위치를 누르는 빈도에서 그 대기는 보이지 않는다 — 대신
        타입별 키를 만들려고 잠금 대상을 쪼개면 그 키를 담을 행이 따로 필요해진다.

        ⚠ 이 잠금은 **모든 부여 경로가 여기를 지난다는 전제** 위에 있다(참여 코드 재발급이
        반 행을 잠그는 것과 같은 구조 — `teacher/classrooms/[id]/join-codes/route.ts`).
        더 튼튼한 자리는 `consent_logs` 에 부분 유니크 인덱스를 두는 것인데 **그건 불가능하다**:
        「살아 있다」에 `expires_at > now()` 가 들어 있고 부분 인덱스의 술어는 IMMUTABLE
        이어야 한다. `WHERE revoked_at IS NULL` 만으로 걸면 **정상 흐름을 막는다** —
        기간이 자연히 만료된 뒤 학생이 다시 켜는 길이 닫힌다(그 사정은
        `app/api/parent/children/self-study/route.ts` 의 `dedupeByChild` 주석).
      */
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, studentId))
        .for('update');

      const updated = await tx
        .update(consentLogs)
        .set({ scopeLabel, expiresAt, grantedAt: now, parentId: recipient.id })
        .where(livingConsentOf(studentId, type))
        .returning(returning);

      if (updated.length > 0) {
        // 갱신은 `parentId: recipient.id` 도 함께 쓴다 — 옛 보호자에게 매달려 있던 행이
        // 여기서 **지금 보호자에게 옮겨 붙는다.** 그래서 언제나 지금 보호자 것이다.
        return { row: updated[0], created: false };
      }

      const [inserted] = await tx
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
        .returning(returning);

      return { row: inserted, created: true };
    });

    // 갱신이든 삽입이든 방금 `recipient.id` 로 쓴 행이다 — 지금 보호자 것임이 자명하다.
    const consent: GrantConsentResponse = { consent: toRow(outcome.row, true) };
    return NextResponse.json(consent, outcome.created ? { status: 201 } : undefined);
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
 *
 * `parent_id` 는 **인자로 들어와 boolean 이 되어 나간다.** 행을 통째로 받아 여기서
 * 꺼내 쓰게 두면 다음 사람이 응답에 그대로 얹기 쉬운데, 그 문은 계약이 닫아 뒀다
 * (`MyConsentRow` 주석).
 * @param row - DB 행(받는 사람 id 는 담지 않는다)
 * @param toCurrentParent - 이 동의가 지금 보호자에게 가는가
 */
function toRow(
  row: {
    type: ConsentTypeValue;
    scopeLabel: string;
    grantedAt: Date;
    expiresAt: Date | null;
  },
  toCurrentParent: boolean,
): MyConsentRow {
  return {
    type: row.type,
    scopeLabel: row.scopeLabel,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    toCurrentParent,
  };
}
