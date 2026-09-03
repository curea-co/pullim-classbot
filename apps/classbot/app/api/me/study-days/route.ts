/**
 * 공부한 날 — 읽기 + 기록 (자기주도 계약 §2).
 *
 * 담은 봇 라우트와 **같은 게이트**다: 역할을 보지 않고, 미인증이면 401, `student_id` 는
 * 신원 해석기에서만 온다. 행이 언제나 호출자 명의로만 생기고 호출자 명의로만 읽히므로
 * 남의 기록에 닿는 경로가 없다.
 *
 * ## 「오늘」은 서버가 KST 로 정한다
 * 날짜를 만드는 쪽은 학생의 브라우저이고 서버는 그 훅을 부를 수 없다. 두 개의 하루가
 * 같은 자리에서 시작하도록 서버도 **KST 자정**을 쓴다 — 이유와 남는 경계는
 * `app/api/_lib/study-date.ts` 머리주석에 적었다. 서버 TZ(UTC)로 오늘을 정했다면
 * 00:00~08:59 KST 에 공부한 학생의 날짜가 매일 「미래」로 버려진다.
 *
 * ## `origin` 은 **처음 쓴 값 그대로 둔다**
 * 이미 있는 날을 다시 기록해도 `origin` 을 고치지 않는다. 백필이 'app' 을 덮지 못하게 하는
 * 것은 계약이 못박은 방향(§2)이고, 반대 방향(백필로 들어온 날을 나중에 'app' 으로 올리기)도
 * 하지 않는다 — 이 라우트의 `date` 역시 **본문으로 오는 값**이라, 올려 주기 시작하면
 * 백필로 넣은 날을 한 번 더 불러 'app' 으로 세탁하는 길이 생긴다. 규칙은 하나다:
 * **`origin` 은 그 날을 처음 만든 쪽이 쓰고, 아무도 다시 쓰지 않는다.**
 */

import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { selfStudyDays } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { invalidInput, unauthorized } from '@/app/api/_lib/guards';
import { isRecordableDay, kstToday } from '@/app/api/_lib/study-date';
import type {
  MyStudyDaysResponse,
  RecordStudyDayResponse,
} from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내가 공부한 날 전부 — 오름차순.
 *
 * ⚠️ `study_date` 를 그대로 select 하지 않고 `to_char` 로 **캐스팅해서** 읽는다.
 * node-postgres 는 DATE 를 로컬시간 `Date` 객체로 파싱하므로(`postgres-date`), 그대로
 * 읽으면 타입은 `string` 인데 런타임은 `Date` 이고 서버 TZ 가 KST 가 아니면 하루가 밀린다.
 * @param req - 신원(쿠키 또는 Bearer). 역할은 보지 않는다
 * @returns 200 { days: string[] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const rows = await getDb()
    .select({ day: sql<string>`to_char(${selfStudyDays.studyDate}, 'YYYY-MM-DD')` })
    .from(selfStudyDays)
    .where(eq(selfStudyDays.studentId, studentId))
    .orderBy(asc(selfStudyDays.studyDate));

  const body: MyStudyDaysResponse = { days: rows.map((r) => r.day) };
  return NextResponse.json(body);
}

/**
 * 오늘(또는 준 날짜) 공부했다고 기록 — 같은 날을 두 번 보내도 한 줄이다(멱등).
 *
 * 두 번째 기록을 오류로 답하지 않는 이유는 담기 라우트와 같다 — 하루에 여러 번 학습한 게
 * 잘못일 리 없다. 새로 생겼을 때만 201 이고 이미 있었으면 200 인데, **몸통은 둘 다 같다.**
 *
 * 날짜를 실어 보내면 백필과 **같은 테두리**로 거른다(형식·미래·2년). 다만 여기서는 값이
 * 하나뿐이라 조용히 건너뛰지 않고 **400 으로 답한다** — 하나를 보냈는데 `recorded: true`
 * 를 받고 아무것도 안 남는 편이 더 나쁘다. 그리고 이 테두리가 여기 없으면 **백필의 방어가
 * 통째로 헛것이 된다** — 한 번에 400개를 막아 놓고 한 개짜리 요청을 400번 받아 주면
 * 막은 것이 아니다. 두 라우트가 다르게 답하는 것(건너뛰기 / 400)은 모양이지, 테두리가
 * 아니다. 테두리는 둘 다 같다.
 * @param req - body `{ date? }`. 명의는 본문이 아니라 신원에서 온다
 * @returns 201 { recorded, date } | 200 { recorded, date }(이미 있음) | 400 | 401
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const read = await readBodyAllowingEmpty(req);
  if (!read.ok) return invalidInput('요청 본문을 읽지 못했어요.');

  const today = kstToday();
  const asked = read.body.date;
  const date = asked === undefined ? today : asked;
  if (!isRecordableDay(date, today)) return invalidInput('기록할 수 없는 날짜예요.');

  try {
    const inserted = await getDb()
      .insert(selfStudyDays)
      .values({ studentId, studyDate: date, origin: 'app' })
      .onConflictDoNothing({
        target: [selfStudyDays.studentId, selfStudyDays.studyDate],
      })
      // 저장한 날짜를 되읽지 않는다 — 위 ⚠️(DATE 파싱). 새 행이 생겼는지만 길이로 본다.
      .returning({ studentId: selfStudyDays.studentId });

    const body: RecordStudyDayResponse = { recorded: true, date };
    return NextResponse.json(body, { status: inserted.length > 0 ? 201 : 200 });
  } catch {
    // FK 위반(도메인 `users` 에 없는 신원) 등 쓰기 실패 — 담기 라우트와 같게 400 으로 답한다.
    return invalidInput('공부한 날을 기록하지 못했어요.');
  }
}

/** 본문 읽기 결과 — 읽었으면 객체, 못 읽었으면 실패. */
type BodyRead = { ok: true; body: Record<string, unknown> } | { ok: false };

/**
 * 본문을 JSON 으로 읽되 **빈 본문을 정상으로 본다** — 공용 `readJsonBody` 와 다른 점.
 *
 * 이 라우트의 본문은 통째로 선택 사항이라(`{ date? }`), 아무것도 안 실어 보내는 POST 가
 * 정상 호출이다. 공용 헬퍼는 그 경우를 파싱 실패(null)로 돌려주므로 400 이 된다.
 * 그렇다고 「못 읽으면 오늘」로 뭉개지도 않는다 — **본문이 있는데 JSON 이 아니면 400** 이다.
 * @param req - Next.js Request
 * @returns 빈 본문이면 `{}`, 객체면 그 객체, 그 밖에는 실패
 */
async function readBodyAllowingEmpty(req: Request): Promise<BodyRead> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false };
  }
  if (raw.trim() === '') return { ok: true, body: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}
