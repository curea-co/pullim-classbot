/**
 * 공부한 날 백필 — 브라우저에 쌓여 있던 날짜를 **한 번 올린다** (자기주도 계약 §2·§4).
 *
 * P1 부터 이 날짜들은 localStorage 에만 있었다. 서버가 정본이 되는 순간 그대로 두면 그
 * 사람의 기록이 **없던 일**이 된다 — 그래서 올린다. 사용자가 승인한 방향이다.
 *
 * ## 이 라우트가 받는 것은 **학생 기기의 주장**이다
 * 서버가 목격한 사실이 아니다. 그래서 거부하는 대신 **테두리를 친다**(계약 §2):
 *  - 형식이 어긋난 값 · 미래(KST 오늘 이후) · 2년보다 오래된 날 → 그 값만 **건너뛴다**.
 *    전체를 400 으로 되돌리지 않는 이유: 이관은 한 번뿐이라 한 칸이 썩었다고 전부 버리면
 *    멀쩡한 날들이 영영 못 올라온다.
 *  - 한 번에 **400개**까지. 넘으면 400 `INVALID_INPUT` — 여기서만 전체를 거절한다.
 *    개수 상한은 「이 요청이 이관인가 아니면 다른 무엇인가」를 가르는 선이라, 잘라서
 *    받아 주면 상한이 상한이 아니게 된다.
 *  - 넣는 행의 `origin` 은 **'backfill'**. 이미 있는 날은 `onConflictDoNothing` 이라
 *    **덮지 않는다** — 서버가 그날 실제로 받은 'app' 기록이 나중 올라온 전언으로
 *    바뀌면 안 된다. 신뢰도를 뒤에 남겨 두려고 만든 컬럼이 그 자리에서 무의미해진다.
 *
 * 게이트는 나머지 자기주도 라우트와 같다 — 역할 없음, 미인증 401, 명의는 신원에서만.
 */

import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { selfStudyDays } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { invalidInput, readJsonBody, unauthorized } from '@/app/api/_lib/guards';
import {
  MAX_BACKFILL_DAYS,
  isRecordableDay,
  kstToday,
} from '@/app/api/_lib/study-date';
import type { BackfillStudyDaysResponse } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 로컬에 있던 날짜를 한 번에 올린다.
 *
 * `skipped` 는 **보낸 개수에서 새로 생긴 행을 뺀 나머지 전부**다 — 걸러진 값, 요청 안의
 * 중복, 이미 서버에 있던 날이 한데 들어간다. 이유별로 세지 않는 것은 부르는 쪽이
 * 「몇 개가 남았나」만 쓰기 때문이고, 계약도 그렇게 정했다(§2).
 * @param req - body `{ days: string[] }`. 명의는 본문이 아니라 신원에서 온다
 * @returns 200 { inserted, skipped } | 400 | 401
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const days = body.days;
  if (!Array.isArray(days)) return invalidInput('올릴 날짜 목록이 없어요.');
  if (days.length > MAX_BACKFILL_DAYS) {
    return invalidInput(`한 번에 ${MAX_BACKFILL_DAYS}일까지 올릴 수 있어요.`);
  }

  const today = kstToday();
  // 걸러 낸 뒤 **요청 안의 중복도 지운다** — 같은 날이 두 줄로 실려 오면 셈이 부풀고,
  // 한 문장에 같은 키가 두 번 들어간다.
  const keep = [...new Set(days.filter((d) => isRecordableDay(d, today)))];

  // 남은 게 없으면 문장을 만들지 않는다(빈 VALUES 는 SQL 오류다).
  if (keep.length === 0) {
    const empty: BackfillStudyDaysResponse = { inserted: 0, skipped: days.length };
    return NextResponse.json(empty);
  }

  try {
    const inserted = await getDb()
      .insert(selfStudyDays)
      .values(
        keep.map((studyDate) => ({ studentId, studyDate, origin: 'backfill' as const })),
      )
      // 이미 있는 날은 그대로 둔다 — 'app' 을 'backfill' 로 되돌리지 않는 자리가 여기다.
      .onConflictDoNothing({
        target: [selfStudyDays.studentId, selfStudyDays.studyDate],
      })
      // 저장한 날짜를 되읽지 않는다(DATE 파싱 — 스키마 ⚠️). 새로 생긴 행 수만 센다.
      .returning({ studentId: selfStudyDays.studentId });

    const result: BackfillStudyDaysResponse = {
      inserted: inserted.length,
      skipped: days.length - inserted.length,
    };
    return NextResponse.json(result);
  } catch {
    // FK 위반(도메인 `users` 에 없는 신원) 등 쓰기 실패 — 500 을 흘리지 않는다.
    return invalidInput('공부한 날을 올리지 못했어요.');
  }
}
