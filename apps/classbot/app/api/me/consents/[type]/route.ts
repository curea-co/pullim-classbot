/**
 * 동의 철회 — `DELETE /api/me/consents/[type]` (학부모×자기주도 계약 §2).
 *
 * ## `DELETE` 인데 **행을 지우지 않는다**
 * `revoked_at = now()` 를 찍는다. `consent_logs` 는 감사 기록이라 「학생이 언제 무엇을
 * 줬다가 언제 거뒀는가」가 남아야 한다. 지우면 준 사실이 사라지고, `expires_at` 을 지금으로
 * 당겨 때우면 **「기간이 지났다」와 「학생이 거뒀다」가 구분되지 않는다.**
 * 메서드가 `DELETE` 인 것은 부르는 쪽의 의도(「이건 공유되지 않아야 한다」)를 말하지,
 * 저장소에서 무슨 일이 일어나는지를 말하지 않는다.
 *
 * 게이트는 목록 라우트와 같다(로그인만, 역할 무관). 고치는 술어에 **내 명의**가 함께
 * 들어가므로 경로에 남의 타입·값을 넣어도 남의 동의에는 닿지 않는다.
 *
 * ⚠️ **철회는 되돌리는 게 아니다.** 이미 보여드린 것은 학부모의 기억·스크린샷·캐시에
 * 남아 어느 설계로도 못 막는다. 그래서 화면이 그 사실을 숨기지 않고 적는다(계약 §3) —
 * 이 라우트가 끊는 것은 **오늘부터의 조회**다.
 */

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { invalidInput, unauthorized } from '@/app/api/_lib/guards';
import { isStudentGrantableType, livingConsentOf } from '@/app/api/_lib/consent';
import type { RevokeConsentResponse } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 이 타입의 공유를 거둔다.
 *
 * **줄 게 없어도 200 이다**(`revoked:false`). 부르는 쪽의 의도는 「이건 공유되지 않아야
 * 한다」이고 그건 어느 쪽이든 이미 이뤄져 있다 — 404 로 답하면 아무 일도 안 해도 되는
 * 자리에서 화면이 빨개진다(담은 봇 빼기와 같은 규약).
 *
 * 대상은 **살아 있는 동의**뿐이다(`livingConsentOf`). 이미 거둔 행의 `revoked_at` 을
 * 다시 쓰면 처음 거둔 시각이 밀려, 감사 기록이 「언제 끊겼나」에 답하지 못한다.
 *
 * ## ⛔ 살아 있는 행을 **전부** 찍는다 — 한 줄만 짚는 「최적화」를 넣지 마라
 * 부여 경합으로 `(student_id, type)` 에 살아 있는 행이 둘이 될 수 있다(그 사정은
 * `app/api/parent/children/self-study/route.ts` 의 `dedupeByChild` 주석에 있다).
 * 술어가 행을 좁히지 않으므로 한 번의 호출이 그 둘을 다 찍는다.
 *
 * **하나만 찍으면 조용히 샌다**: 학생은 스위치가 꺼지는 걸 보고 공유가 끝난 줄 아는데,
 * 남은 행으로 **학부모의 열람이 그대로 열려 있다.** 프라이버시 약속의 반대편이고 화면에는
 * 아무 표시도 나지 않는다.
 *
 * **응답으로는 그 고장을 볼 수 없다** — 한 줄만 찍어도 `revoked:true` 다. 그래서 이걸
 * 붙잡는 테스트는 응답이 아니라 **술어**를 본다(`consent-routes.test.ts`: 술어에
 * `"id" =` 가 없고 파라미터가 명의·타입 둘뿐인지). 실 DB 로도 확인했다 — 살아 있는 2행에
 * DELETE 한 번 → 살아 있는 0행, 학부모 조회 `{"children":[]}`, 두 행 모두 보존.
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ type }`
 * @returns 200 { revoked: boolean } | 400 | 401
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const { type } = await ctx.params;
  // 세그먼트는 인코딩되어 올 수 있고, 망가진 escape(`%E0%A4%A`)는 디코드가 **던진다** —
  // 여기서 받지 않으면 잘못된 URL 하나가 500 이 된다.
  let decoded: string;
  try {
    decoded = decodeURIComponent(type);
  } catch {
    return invalidInput('거둘 수 있는 항목이 아니에요.');
  }

  // 학생이 스스로 줄 수 없는 타입은 거둘 수도 없다 — 켜는 문과 끄는 문이 같은 테두리를
  // 쓰지 않으면, 다른 인가 모델 위의 동의(감정 등)를 이 라우트로 끌 수 있게 된다.
  if (!isStudentGrantableType(decoded)) {
    return invalidInput('거둘 수 있는 항목이 아니에요.');
  }

  const revoked = await getDb()
    .update(consentLogs)
    // DB 시계로 찍는다 — 앱 서버가 만든 `Date` 를 넘기면 두 시계가 어긋난 만큼
    // 철회 시각이 밀리고, 살아 있음 판정(`expires_at > now()`)과 기준이 달라진다.
    .set({ revokedAt: sql`now()` })
    .where(livingConsentOf(studentId, decoded))
    .returning({ id: consentLogs.id });

  const body: RevokeConsentResponse = { revoked: revoked.length > 0 };
  return NextResponse.json(body);
}
