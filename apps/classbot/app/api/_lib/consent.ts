/**
 * 동의의 술어 — **서버가 정하는 것만** 한곳에 모은다.
 *
 * ## 왜 별도 파일인가
 * 「이 동의가 살아 있는가」는 학부모 라우트와 학생의 공유 관리 라우트가 **똑같이** 알아야
 * 한다. 한쪽에만 두면 다른 쪽이 자기 판본을 만들고, 그 순간 「학생 화면에는 살아 있는데
 * 학부모 화면에는 안 보이는」 동의가 생긴다.
 *
 * ## 여기 있는 값은 전부 **클라이언트가 주장할 수 없는 것**이다
 * `expires_at` 을 본문으로 받지 않는 이유가 이 파일이 커진 이유다 — 만료를 클라이언트가
 * 정할 수 있으면 서기 3000년을 적어 보내면 그만이고, 그러면 「이번 주만」이라는 약속이
 * 라벨로만 남는다. 라벨은 학생이 고르고 **기한은 서버가 파생한다**(`expiryFor`).
 * 받는 보호자도 같다 — 본문이 아니라 링크가 정한다(`resolveGrantRecipient`).
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 App Router 의 라우트 세그먼트에서 제외된다(private folder).
 * 여기 파일은 URL 을 만들지 않는다.
 */

import { and, asc, desc, eq, gt, isNull, or, sql, type SQL } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs, parentChildLinks, users } from '@/lib/db/schema';
import type { ConsentTypeValue as ContractConsentType } from './contract-types';

/** `consent_logs.type` 이 받는 값 — 스키마의 enum 배열을 그대로 따라간다. */
export type ConsentTypeValue = (typeof consentLogs.$inferSelect)['type'];

/**
 * 계약 타입과 스키마가 **갈라지면 typecheck 가 깨진다**.
 *
 * `contract-types.ts` 는 「런타임 코드 없음 · 서버 모듈이 딸려 오지 않음」이 파일의 약속이라
 * (그 머리주석), 거기서 스키마를 `import type` 으로도 끌어오지 않는다 — 지금은 지워지지만
 * 다음 사람이 그 옆에 값 import 를 붙이면 약속이 조용히 깨진다. 그래서 union 을 양쪽에
 * **따로 적고**, 갈라짐은 이 파일(이미 스키마를 읽는 서버 파일)이 잡는다.
 *
 * 양방향으로 확인한다 — 한쪽만 보면 한쪽이 넓어지는 것을 놓친다.
 */
/**
 * `Narrow` 가 `Wide` 에 들지 않으면 **인스턴스화 자리에서** 제약 위반으로 깨진다.
 *
 * 본문이 `Narrow` 인 것은 결과를 쓰려는 게 아니라 두 인자를 **둘 다 쓰기** 위해서다
 * (`= true` 로 두면 `Narrow` 가 미사용 인자가 되어 lint 가 경고한다).
 */
type Assert<Narrow extends Wide, Wide> = Narrow;
export type ContractMatchesSchema = [
  Assert<ConsentTypeValue, ContractConsentType>,
  Assert<ContractConsentType, ConsentTypeValue>,
];

/**
 * 학부모의 「반·과제 현황」이 서는 축. 자기주도(스스로 담은 봇·공부한 날)는 **다른 축**이라
 * 이 값 하나로 두 가지가 함께 열리지 않는다(05 § 11.4 의 표).
 */
export const CLASS_ASSIGNMENT_CONSENT: ConsentTypeValue = 'class_assignment_summary';

/**
 * 학부모의 「자기주도 요약」이 서는 축 — 위와 **다른 값**이다.
 *
 * 두 축을 상수로 나란히 적어 두는 것은 라우트가 리터럴을 직접 쓰지 않게 하려는 것이다.
 * 리터럴이면 오타는 타입이 잡아 주지만 「어느 라우트가 어느 축을 보는가」가 한곳에 모이지
 * 않아, 축이 섞인 것을 리뷰로만 잡게 된다.
 */
export const SELF_STUDY_CONSENT: ConsentTypeValue = 'self_study_summary';

/* ── 학생이 고르는 범위와, 서버가 파생하는 기한 ────────── */

/**
 * 학생이 고를 수 있는 공유 범위 — `lib/mock/family.ts` 의 `ConsentLog.scopeLabel` 과 같은 셋.
 *
 * 사람이 읽는 한국어 그대로가 값이다. 코드(`'week'` 같은)로 바꾸고 라벨을 따로 두면
 * 저장된 값과 화면에 뜨는 말이 어긋날 자리가 생기는데, 이 약속은 **학생이 읽은 문장
 * 그대로 지켜져야** 하는 것이라 그 어긋남을 아예 만들지 않는다.
 */
export const SCOPE_LABELS = ['계속', '이번 달만', '이번 주만'] as const;

export type ScopeLabel = (typeof SCOPE_LABELS)[number];

/** 범위 라벨별 유효 일수 — `null` 은 「학생이 거둘 때까지」. */
const SCOPE_DAYS: Record<ScopeLabel, number | null> = {
  계속: null,
  '이번 달만': 30,
  '이번 주만': 7,
};

/** 이 값이 학생이 고를 수 있는 범위 라벨인가. */
export function isScopeLabel(value: unknown): value is ScopeLabel {
  return typeof value === 'string' && (SCOPE_LABELS as readonly string[]).includes(value);
}

/**
 * 범위 라벨에서 만료 시각을 **파생**한다 — 클라이언트가 보낸 만료는 쓰지 않는다.
 *
 * 「이번 주만」이 이번 주 일요일 자정이 아니라 **+7일**인 것은 의도다. 주의 끝으로 잡으면
 * 토요일에 준 동의가 하루 만에 끊겨, 학생이 읽은 「이번 주만」과 실제로 준 기간이 어긋난다.
 * @param scopeLabel - 학생이 고른 범위
 * @param now - 기준 시각(테스트가 시간을 고정할 수 있게 주입)
 * @returns 만료 시각, 「계속」이면 null
 */
export function expiryFor(scopeLabel: ScopeLabel, now: Date = new Date()): Date | null {
  const days = SCOPE_DAYS[scopeLabel];
  if (days === null) return null;
  return new Date(now.getTime() + days * 86_400_000);
}

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
 * 특정 학생의 특정 타입 **살아 있는** 동의를 짚는 술어 — 부여 멱등·철회가 쓴다.
 *
 * ⚠️ 술어에 **행을 좁히는 것이 없다**(`id =` 가 없다). 그래서 이걸 `UPDATE` 의 `where` 로
 * 쓰면 살아 있는 행을 **전부** 고친다. 그게 의도다 — 부여 경합으로 `(student_id, type)` 에
 * 살아 있는 행이 둘이 될 수 있고(`app/api/parent/children/self-study/route.ts` 의
 * `dedupeByChild` 주석), 철회가 한 줄만 찍으면 학생 화면의 스위치는 꺼지는데 학부모의
 * 열람은 **남은 행으로 그대로 열려 있다.**
 *
 * 받는 보호자(`parent_id`)를 술어에 넣지 않는 것도 같은 이유다. 철회는 `(학생, 타입)`
 * 기준이라 옛 보호자에게 매달린 행까지 함께 꺼진다 — 학생이 「이건 공유되지 않아야 한다」고
 * 말했으면 어느 보호자에게든 닫혀야 한다.
 * @param studentId - 호출자 본인(남의 동의에 닿지 않게 술어에 함께 선다)
 * @param type - 동의 축
 * @returns drizzle 술어
 */
export function livingConsentOf(studentId: string, type: ConsentTypeValue) {
  return and(
    eq(consentLogs.studentId, studentId),
    eq(consentLogs.type, type),
    livingConsent(),
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

/* ── 누가 받는가 · 학생이 스스로 켤 수 있는 것은 무엇인가 ── */

/** 동의를 받게 될 보호자 — 이름·관계와, 쓰기에만 쓰는 id. */
export interface GrantRecipient {
  /** 쓰기 명의로만 쓴다. **응답에 싣지 않는다**(본문으로 받지 않는 값이라). */
  id: string;
  name: string;
  relation: 'mother' | 'father' | 'guardian';
}

/**
 * 이 학생이 지금 동의를 주면 **누가 받는가** — 부여와 조회가 같은 답을 하게 하는 한 곳.
 *
 * 학생 화면은 「어머니께 보여요」라고 이름을 적는데, 그 이름이 **실제로 grant 가 갈 보호자와
 * 같다는 보장**이 있어야 한다. 조회와 부여가 링크를 각자 골라 읽으면 그 보장은 우연이다 —
 * 정렬 하나만 달라도 화면이 적은 사람과 행이 가리키는 사람이 갈린다. 그래서 두 라우트가
 * **이 함수 하나**를 부른다.
 *
 * 여럿이면 주 보호자를 먼저, 그다음 id 순(같은 입력에 같은 답이 나오게).
 * @param studentId - 호출자 본인
 * @returns 받을 보호자, 링크가 없으면 null
 */
export async function resolveGrantRecipient(
  studentId: string,
): Promise<GrantRecipient | null> {
  const [row] = await getDb()
    .select({
      id: parentChildLinks.parentId,
      name: users.name,
      relation: parentChildLinks.relation,
    })
    .from(parentChildLinks)
    .innerJoin(users, eq(parentChildLinks.parentId, users.id))
    .where(eq(parentChildLinks.studentId, studentId))
    .orderBy(desc(parentChildLinks.primary), asc(parentChildLinks.parentId))
    .limit(1);

  return row ?? null;
}

/**
 * 학생 라우트가 받아 주는 동의 타입 — **자기주도 요약과 반·과제 현황 둘**이다.
 *
 * 나머지 다섯(주간·월간 리포트 · 약점 단원 · 감정 · 실시간 알림)은 교사·기관 승인이라는
 * 다른 인가 모델 위에 있어, 이 라우트가 학생 혼자 켜고 끄게 두면 그 모델을 우회한다.
 * 감정 공유가 특히 그렇다 — 자기주도 동의 하나에 딸려 나가면 안 된다(05 § 11.4).
 * 새 타입을 여기 더하려면 그 타입의 승인 주체가 학생 본인인지 먼저 답해야 한다.
 *
 * 반·과제(`class_assignment_summary`)가 여기 들어온 것은 그 답이 「학생 본인」으로 정해졌기
 * 때문이다 — `GET /api/parent/children` 이 이미 그 축의 살아 있는 동의를 조회 조건 안에서
 * 보고 있다(`livingConsentExists`). 켜는 문이 없으면 그 게이트는 **영원히 닫힌 문**이다.
 */
export const STUDENT_GRANTABLE_TYPES = [
  'self_study_summary',
  'class_assignment_summary',
] as const;

export type StudentGrantableType = (typeof STUDENT_GRANTABLE_TYPES)[number];

/** 학생이 스스로 줄 수 있는 타입인가. */
export function isStudentGrantableType(value: unknown): value is StudentGrantableType {
  return (
    typeof value === 'string' &&
    (STUDENT_GRANTABLE_TYPES as readonly string[]).includes(value)
  );
}
