/**
 * 동의의 규칙 — **서버가 정하는 것만** 한곳에 모은다 (학부모×자기주도 계약 §2).
 *
 * ## 왜 별도 파일인가
 * 여기 있는 셋(살아 있는가 · 범위 라벨이 무엇인가 · 언제까지인가)은 학생 라우트와 학부모
 * 라우트가 **똑같이** 알아야 한다. 한쪽에만 두면 다른 쪽이 자기 판본을 만들고, 그 순간
 * 「학생 화면에는 살아 있는데 학부모 화면에는 안 보이는」 동의가 생긴다.
 *
 * ## 여기 있는 값은 전부 **클라이언트가 주장할 수 없는 것**이다
 * `expires_at` 을 본문으로 받지 않는 이유가 이 파일의 존재 이유다 — 만료를 클라이언트가
 * 정할 수 있으면 서기 3000년을 적어 보내면 그만이고, 그러면 「이번 주만」이라는 약속이
 * 라벨로만 남는다. 라벨은 학생이 고르고 **기한은 서버가 파생한다.**
 *
 * ⚠️ 이 디렉터리는 `_` 로 시작해 Next.js App Router 의 라우트 세그먼트에서 제외된다
 * (private folder). 여기 파일은 URL 을 만들지 않는다.
 */

import { and, asc, desc, eq, isNull, or, gt, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs, parentChildLinks, users } from '@/lib/db/schema';
import type { ConsentTypeValue as ContractConsentType } from './contract-types';

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
 * 「이번 주만」이 이번 주 일요일 자정이 아니라 **+7일**인 것은 계약이 그렇게 못박았기
 * 때문이다(§2). 주의 끝으로 잡으면 토요일에 준 동의가 하루 만에 끊겨, 학생이 읽은
 * 「이번 주만」과 실제로 준 기간이 어긋난다.
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
 * 이 술어는 언제나 **조회 조건 안**에 들어간다(`INNER JOIN` 의 `ON`, 또는 `WHERE`).
 * 읽어 온 뒤에 걸러 내면 「동의가 없다」와 「활동이 없다」가 응답 모양으로 갈라지고,
 * 그 차이 자체가 학부모에게 정보가 된다.
 *
 * 시각 비교를 `now()`(DB 시계)로 하는 것도 의도다 — 서버 프로세스가 만든 `Date` 를
 * 파라미터로 넘기면 앱 서버와 DB 의 시계가 어긋난 만큼 만료가 밀리거나 당겨진다.
 * @returns drizzle 술어
 */
export function livingConsent() {
  return and(
    isNull(consentLogs.revokedAt),
    or(isNull(consentLogs.expiresAt), gt(consentLogs.expiresAt, sql`now()`)),
  );
}

/** 특정 학생의 특정 타입 **살아 있는** 동의를 짚는 술어(부여 멱등·철회에서 쓴다). */
export function livingConsentOf(studentId: string, type: ConsentTypeValue) {
  return and(
    eq(consentLogs.studentId, studentId),
    eq(consentLogs.type, type),
    livingConsent(),
  );
}

/** `consent_logs.type` 이 받는 값 — 스키마의 enum 배열과 같은 union. */
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
type Assert<A extends B, B> = true;
export type ContractMatchesSchema = [
  Assert<ConsentTypeValue, ContractConsentType>,
  Assert<ContractConsentType, ConsentTypeValue>,
];

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
 * 학생 라우트가 받아 주는 동의 타입 — **자기주도 요약 하나뿐**이다.
 *
 * 나머지 다섯(주간·월간 리포트 · 약점 단원 · 감정 · 실시간 알림)은 교사·기관 승인이라는
 * 다른 인가 모델 위에 있어, 이 라우트가 학생 혼자 켜고 끄게 두면 그 모델을 우회한다.
 * 감정 공유가 특히 그렇다 — 자기주도 동의 하나에 딸려 나가면 안 된다(계약 §0).
 * 새 타입을 여기 더하려면 그 타입의 승인 주체가 학생 본인인지 먼저 답해야 한다.
 */
export const STUDENT_GRANTABLE_TYPES = ['self_study_summary'] as const;

export type StudentGrantableType = (typeof STUDENT_GRANTABLE_TYPES)[number];

/** 학생이 스스로 줄 수 있는 타입인가. */
export function isStudentGrantableType(value: unknown): value is StudentGrantableType {
  return (
    typeof value === 'string' &&
    (STUDENT_GRANTABLE_TYPES as readonly string[]).includes(value)
  );
}
