/**
 * 학부모 — 동의한 자녀의 자기주도 요약 (학부모×자기주도 계약 §2).
 *
 * ## 왜 `GET /api/parent/children` 에 얹지 않았나
 * 그쪽의 인가는 **교사 파생**이다 — 자녀가 그 반에 있으면 무조건 보인다. 여기의 인가는
 * **학생 본인의 동의**다. 한 응답에 인가 모델이 둘이 되면 다음 사람이 새 필드를 어느
 * 규칙으로 더할지 알 수 없어, 언젠가 동의 게이트 뒤에 있어야 할 값이 무조건 나가는
 * 블록에 붙는다. 그래서 경로를 나눴다.
 *
 * ## 동의는 조회 **조건 안**에 있다 — 읽고 나서 거르지 않는다
 * `INNER JOIN consent_logs` 라 **미동의 자녀는 결과 집합에서 통째로 빠진다.** 필드가
 * null 로 오지 않는다. 이게 스타일 취향이 아닌 이유:
 *
 *   화면의 규칙은 「학부모가 **미동의**와 **무활동**을 구분할 수 없어야 한다」이다(§3).
 *   구분되면 그 차이 자체가 정보가 되어, 부모가 동의 없이 아이의 활동 유무를 추론한다.
 *   자녀를 빈 배열로 돌려주면 그 차이가 응답에 새고, 화면이 「이 경우엔 숨겨야 한다」를
 *   **기억해야만** 규칙이 지켜진다. 데이터 층이 강제하면 화면은 틀릴 수가 없다.
 *
 * 그래서 미동의 자녀의 봇도 공부한 날도 **애초에 읽지 않는다.** 읽어 놓고 안 보내는 것과
 * 읽지 않는 것은 다르다 — 로그·에러·타이밍 어디로도 새지 않는다.
 *
 * ⛔ **넘지 않는 선**(문서가 이미 고정): 대화 원문·요약은 주지 않는다(`13:79`).
 * 감정·웰빙은 자기주도 동의 하나로 딸려 나오지 않는다(`13:288`) — 동의는 타입별로 쪼갠다.
 * 단원 진행도 없다(P5, `bot_curriculum_units` 가 비어 있다).
 */

import { NextResponse } from 'next/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  classBots,
  consentLogs,
  parentChildLinks,
  selfEnrollments,
  selfStudyDays,
  users,
} from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import { livingConsent } from '@/app/api/_lib/consent';
import { deriveStreakFromDays } from '@/app/api/_lib/self-study-summary';
import type {
  ParentSelfStudyBot,
  ParentSelfStudyChild,
  ParentSelfStudyResponse,
} from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 동의한 자녀의 자기주도 요약 — 스스로 담은 봇 · 연속일수 · 이번 주 공부한 날 수.
 *
 * 역할 판정은 도메인 `users.role` 을 본다(공유 JWT 타입에 아직 `parent` 가 없다 —
 * `app/api/_lib/guards.ts` 주석 참조).
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { children } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isAuthenticated) return unauthorized();
  if (actor.role !== 'parent') return forbidden('보호자만 볼 수 있어요.');

  const db = getDb();

  // 계약 §2 의 조인 그대로. 동의가 없으면 자녀 행이 여기서 사라진다.
  const consented = await db
    .select({
      id: users.id,
      name: users.name,
      relation: parentChildLinks.relation,
      scopeLabel: consentLogs.scopeLabel,
      expiresAt: consentLogs.expiresAt,
    })
    .from(parentChildLinks)
    .innerJoin(
      consentLogs,
      and(
        eq(consentLogs.studentId, parentChildLinks.studentId),
        // 받는 사람까지 맞춘다 — 다른 보호자에게 준 동의가 이 학부모의 조회를 열지 않는다.
        eq(consentLogs.parentId, parentChildLinks.parentId),
        eq(consentLogs.type, 'self_study_summary'),
        livingConsent(),
      ),
    )
    .innerJoin(users, eq(parentChildLinks.studentId, users.id))
    .where(eq(parentChildLinks.parentId, actor.id))
    // 자녀 이름순. 같은 자녀에 살아 있는 동의가 둘이면 **최근에 준 것**이 앞에 오게 해
    // 아래 dedupe 가 지금 유효한 범위를 고르게 한다.
    .orderBy(asc(users.name), desc(consentLogs.grantedAt));

  const children: ParentSelfStudyChild[] = await Promise.all(
    dedupeByChild(consented).map(async (child) => {
      const [bots, days] = await Promise.all([
        listSelfBots(child.id),
        listStudyDays(child.id),
      ]);
      return {
        id: child.id,
        name: child.name,
        relation: child.relation,
        scopeLabel: child.scopeLabel,
        expiresAt: child.expiresAt ? child.expiresAt.toISOString() : null,
        bots,
        streak: deriveStreakFromDays(days),
      };
    }),
  );

  const body: ParentSelfStudyResponse = { children };
  return NextResponse.json(body);
}

/** 조인이 돌려준 한 행 — 자녀 한 명 × 살아 있는 동의 하나. */
interface ConsentedChildRow {
  id: string;
  name: string;
  relation: 'mother' | 'father' | 'guardian';
  scopeLabel: string;
  expiresAt: Date | null;
}

/**
 * 자녀당 한 줄만 남긴다 — 조인이 자녀를 두 번 돌려줄 수 있기 때문이다.
 *
 * 부여 라우트가 「살아 있는 동의가 있으면 갱신」이라 정상 경로에서는 타입당 한 줄이지만,
 * **동시에 두 번 들어오면**(학생이 스위치를 두 번 톡 치면) 둘 다 갱신할 행을 못 찾고
 * 각자 새 행을 넣어 살아 있는 동의가 둘이 된다. 그러면 이 조인이 자녀를 두 번 돌려주고
 * 학부모 화면에 **서연 카드가 두 장** 뜬다.
 *
 * DB 제약으로 막지 못하는 이유: 「살아 있다」에는 `expires_at > now()` 가 들어 있고,
 * 부분 unique 인덱스의 술어는 IMMUTABLE 이어야 해서 `now()` 를 쓸 수 없다.
 *
 * ⛔ **그 대신 `WHERE revoked_at IS NULL` 로 unique 인덱스를 걸지 마라.** 그건 다른 규칙이고
 * **정상 흐름을 막는다** — 기간이 자연히 만료된 뒤 학생이 다시 켜는 길이 닫힌다(만료된 행은
 * 철회된 게 아니라서 그 술어에 여전히 걸린다). 지금 도는 재부여가 그 경로다.
 *
 * 그래서 읽는 쪽이 한 줄을 고른다 — 위 `ORDER BY` 가 최근 것을 앞에 두므로
 * **가장 최근에 준 동의(`granted_at` 기준)가 지금 유효한 범위**다.
 *
 * ⚠️ **중복 행은 테이블에 그대로 쌓인다.** 이 함수는 읽을 때 가릴 뿐 쓰기를 막지 않는다.
 * 나중에 `consent_logs` 를 감사하는 사람이 「어느 행이 효력이 있었나」를 물으면 답은
 * **`granted_at` 이 가장 큰 행**이다. 쌓이는 비용이 감사 행 한 줄뿐인 이유는 **철회가
 * 살아 있는 행을 전부 쓸어 가기 때문**이다(`app/api/me/consents/[type]/route.ts`) —
 * 하나만 찍혔다면 중복은 곧 열람이 열린 채 남는 구멍이 됐을 것이다. 그 성질은
 * `consent-routes.test.ts` 의 「살아 있는 행이 둘이어도」 테스트가 붙잡고 있다.
 *
 * ⚠️ 이건 인가 필터가 **아니다.** 동의 게이트는 위 `INNER JOIN` 이 이미 끝냈고, 여기 오는
 * 행은 전부 동의된 자녀다. 이 함수는 **응답 모양**만 지킨다 — 거르는 일을 여기로 옮기지 마라.
 * @param rows - 이름순·최근 동의 우선으로 정렬된 조인 결과
 * @returns 자녀당 한 줄
 */
function dedupeByChild(rows: ConsentedChildRow[]): ConsentedChildRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/**
 * 자녀가 스스로 담은 봇 — 담은 순(오래된 것 먼저).
 *
 * 봇에서 가져오는 것은 **이름·과목·얼굴 이모지 셋뿐**이다. `class_bots` 행을 그대로
 * 흘리면 교사·기관·라이브 상태·인사말까지 학부모에게 나가는데, 계약이 준 것은
 * 「무엇을 스스로 골랐나」다. 이모지가 그 셋에 드는 이유는 **아이가 보는 얼굴과 부모가
 * 보는 얼굴이 같아야** 둘이 같은 봇을 이야기할 수 있기 때문이다(새 정보가 아니라 같은 봇의
 * 정직한 표현). 인사말·톤은 여전히 안 나간다 — 그건 아이와 봇 사이의 것이다.
 * @param studentId - 동의가 확인된 자녀
 * @returns 봇 목록
 */
async function listSelfBots(studentId: string): Promise<ParentSelfStudyBot[]> {
  const rows = await getDb()
    .select({
      botId: selfEnrollments.botId,
      name: classBots.name,
      subject: classBots.subject,
      avatarEmoji: classBots.avatarEmoji,
      addedAt: selfEnrollments.addedAt,
    })
    .from(selfEnrollments)
    .innerJoin(classBots, eq(selfEnrollments.botId, classBots.id))
    .where(eq(selfEnrollments.studentId, studentId))
    // 같은 초에 둘을 담아도 순서가 흔들리지 않게 bot_id 를 동점 처리 축으로 둔다
    // (`GET /api/me/self-bots` 와 같은 정렬 — 두 화면이 다른 순서를 보이지 않게).
    .orderBy(asc(selfEnrollments.addedAt), asc(selfEnrollments.botId));

  return rows.map((r) => ({
    botId: r.botId,
    name: r.name,
    subject: r.subject,
    avatarEmoji: r.avatarEmoji,
    addedAt: r.addedAt.toISOString(),
  }));
}

/**
 * 자녀가 공부한 날 — `'YYYY-MM-DD'` 오름차순.
 *
 * ⚠️ `study_date` 를 그대로 select 하지 않고 `to_char` 로 **캐스팅해서** 읽는다.
 * node-postgres 는 DATE 를 로컬시간 `Date` 객체로 파싱하므로(`postgres-date`), 그대로
 * 읽으면 타입은 `string` 인데 런타임은 `Date` 이고 서버 TZ 가 KST 가 아니면 하루가 밀린다
 * (`GET /api/me/study-days` 와 같은 규약 — 두 화면이 다른 날짜를 보이지 않게).
 *
 * 이 배열은 **응답에 싣지 않는다.** 요약(연속일수 · 이번 주 날 수)만 내보낸다 —
 * 「어느 날 공부했는지」의 목록은 계약이 준 요약보다 촘촘한 정보다.
 * @param studentId - 동의가 확인된 자녀
 * @returns 날짜 배열
 */
async function listStudyDays(studentId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ day: sql<string>`to_char(${selfStudyDays.studyDate}, 'YYYY-MM-DD')` })
    .from(selfStudyDays)
    .where(eq(selfStudyDays.studentId, studentId))
    .orderBy(asc(selfStudyDays.studyDate));

  return rows.map((r) => r.day);
}
