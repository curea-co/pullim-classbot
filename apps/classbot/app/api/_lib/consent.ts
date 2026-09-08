/**
 * 동의의 술어 — **서버가 정하는 것만** 한곳에 모은다.
 *
 * ## 왜 별도 파일인가
 * 「이 동의가 살아 있는가」는 학부모 라우트와, 앞으로 올 학생의 공유 관리 화면이 **똑같이**
 * 알아야 한다. 한쪽에만 두면 다른 쪽이 자기 판본을 만들고, 그 순간 「학생 화면에는 살아
 * 있는데 학부모 화면에는 안 보이는」 동의가 생긴다.
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 App Router 의 라우트 세그먼트에서 제외된다(private folder).
 * 여기 파일은 URL 을 만들지 않는다.
 */

import { and, gt, isNull, or, sql } from 'drizzle-orm';

import { consentLogs } from '@/lib/db/schema';

/** `consent_logs.type` 이 받는 값 — 스키마의 enum 배열을 그대로 따라간다. */
export type ConsentTypeValue = (typeof consentLogs.$inferSelect)['type'];

/**
 * 학부모의 「반·과제 현황」이 서는 축. 자기주도(스스로 담은 봇·공부한 날)는 **다른 축**이라
 * 이 값 하나로 두 가지가 함께 열리지 않는다(05 § 11.4 의 표).
 */
export const CLASS_ASSIGNMENT_CONSENT: ConsentTypeValue = 'class_assignment_summary';

/**
 * **살아 있는 동의**의 술어 — 철회되지 않았고 아직 만료되지 않은 것.
 *
 * 이 술어는 언제나 **조회 조건 안**에 들어간다(`WHERE`). 읽어 온 뒤에 걸러 내면
 * 「동의가 없다」와 「활동이 없다」가 응답 모양으로 갈라지고, 그 차이 자체가 학부모에게
 * 정보가 된다(05 § 11.4 규칙 1·2).
 *
 * 철회를 `revoked_at` 으로 따로 두고 `expires_at` 을 당겨 때우지 않는 이유는
 * `lib/db/schema.ts` 의 `consentLogs` 머리주석에 있다.
 *
 * 시각 비교를 `now()`(DB 시계)로 하는 것도 의도다 — 앱 프로세스가 만든 `Date` 를 넘기면
 * 두 시계가 어긋난 만큼 만료가 밀리거나 당겨진다.
 * @returns drizzle 술어
 */
export function livingConsent() {
  return and(
    isNull(consentLogs.revokedAt),
    or(isNull(consentLogs.expiresAt), gt(consentLogs.expiresAt, sql`now()`)),
  );
}
