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

import { and, eq, gt, isNull, or, sql, type SQL } from 'drizzle-orm';

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

/**
 * 「이 보호자에게 · 이 학생이 · 이 축으로 준 살아 있는 동의가 있는가」 — **EXISTS 한 조각**.
 *
 * 보호 대상(반·과제)을 읽는 질의의 `where` 에 `and` 로 그대로 붙으라고 만든 것이다.
 *
 * ## 왜 술어를 「따로 조회해 Set 으로 들고 다니기」와 나눠 놓으면 안 되는가
 *
 * 동의를 먼저 한 번 조회해 `Set` 으로 만들고, 그 뒤에 반·과제를 **조건 없이** 읽으면
 * 두 질의 사이에 틈이 생긴다. 그 틈에서 학생이 공유를 거두면(`revoked_at` 이 찍히면),
 * 이미 통과한 `Set` 이 두 번째 질의를 그대로 열어 준다 — **철회 뒤의 자료가 나간다.**
 * 학생 입장에서 「거뒀다」는 즉시 닫힌다는 뜻이어야 하므로, 이 틈은 크기 문제가 아니라
 * 규칙 위반이다(05 § 11.4 규칙 1: 조회 조건 **안**에 동의가 있어야 한다).
 *
 * 술어를 데이터 질의 안에 넣으면 동의와 자료를 **같은 스냅샷에서** 본다. 틈 자체가 없다.
 *
 * 살아 있음의 정의(`livingConsent`)를 여기서 다시 쓰지 않고 불러 쓰는 것도 같은 이유다 —
 * 두 벌이 되는 순간 한쪽만 만료를 보게 된다.
 *
 * @param parentId - 이 자료를 읽는 보호자 id
 * @param studentId - 동의를 준 학생 id
 * @param type - 동의 축(`class_assignment_summary` 등) — 축을 섞으면 학생이 켜지 않은
 *   스위치가 함께 열린다
 * @returns `where` 에 그대로 넣는 EXISTS 술어
 */
export function livingConsentExists(
  parentId: string,
  studentId: string,
  type: ConsentTypeValue,
): SQL {
  return sql`exists (select 1 from ${consentLogs} where ${and(
    eq(consentLogs.parentId, parentId),
    eq(consentLogs.studentId, studentId),
    eq(consentLogs.type, type),
    livingConsent(),
  )})`;
}
