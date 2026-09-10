/**
 * 학부모 — 자녀의 자기주도 요약 (05 § 11.4).
 *
 * ## 왜 `GET /api/parent/children` 에 얹지 않았나
 * 그쪽의 인가는 **교사 파생**이다 — 자녀가 그 반에 있으면 반·과제 축의 동의 뒤에서 보인다.
 * 여기는 **다른 동의 축**(`self_study_summary`)이다. 한 응답에 축이 둘이 되면 다음 사람이
 * 새 필드를 어느 축 뒤에 두어야 할지 알 수 없어, 언젠가 학생이 켜지 않은 스위치 뒤의 값이
 * 켜진 블록에 붙는다. 그래서 경로를 나눴다.
 *
 * 나눈 것은 **경로뿐이고 응답 모양은 같다** — 아래가 그 이야기다.
 *
 * ## 응답 모양: 자녀는 **전원**, 게이트는 **내용**에 (05 § 11.4 규칙 2)
 *
 * 이 라우트는 **연결된 자녀를 전부** 싣는다(이름·관계). 동의는 **봇·공부한 날 조회의
 * `where` 안**에 서고(`livingConsentExists`), 미동의 자녀는 그 조회가 0행으로 돌아와
 * `bots: []` · `streak` 이 전부 0 이 된다.
 *
 * 그래서 **미동의 자녀와 「동의했지만 아직 아무것도 안 한 자녀」의 응답이 완전히 같다** —
 * 이름·관계만 다르고 나머지는 동일하다. 부모가 둘을 가를 방법이 응답에 없다.
 *
 * ### ⛔ 미동의 자녀를 결과 집합에서 빼지 마라 — 한 번 그렇게 썼고 되돌렸다
 *
 * `INNER JOIN consent_logs` 로 미동의 자녀를 통째로 떨어뜨리는 판이 있었다. 그게 막는 것은
 * 아래 ① 인데, **그 방식이 ② 를 연다.** 누출 경로가 둘이라는 것이 요점이다:
 *
 *  ① **`null` 오라클** — 미동의 자녀를 실으면서 `scope_label`·`expires_at` 처럼 **동의
 *     행에서만 오는 값**을 함께 싣는 경우. 미동의 자녀는 그 둘이 `null` 이라
 *     `scopeLabel === null` 이 곧 「동의 안 함」이 된다.
 *     → 막는 법은 **그 값을 응답에서 빼는 것**이다(아래 「동의 정보는 나가지 않는다」).
 *       자녀를 빼는 것이 아니다 — 오라클의 출처는 **동의 정보**이지 자녀 행이 아니다.
 *
 *  ② **대조 오라클** — 미동의 자녀를 결과 집합에서 빼는 경우. 학부모는
 *     `GET /api/parent/children` 에서 **연결 자녀 전원**을 이미 받는다. 두 응답의
 *     `children` 을 **대조하면 빠진 자녀가 곧 미동의 자녀다.** 활동이 0 인 자녀는 목록에
 *     남고 미동의 자녀는 사라지므로, 규칙 2 가 막으려는 그 구별이 그대로 성립한다.
 *     → 막는 법은 **전원을 싣는 것**이다.
 *
 * 둘을 동시에 막는 모양은 하나뿐이고 그것이 지금 이 코드다. **이 모양은 새로 만든 것이
 * 아니다** — #280 의 `GET /api/parent/children` 이 이미 같은 구조다(전원 + 게이트된 읽기 +
 * 빈 배열). 축이 몇 개든 같은 모양이라, 규칙이 라우트마다 다르게 나타날 이유가 없다.
 *
 * ### 동의 정보는 나가지 않는다 — 범위 라벨도 만료도
 *
 * `consent_logs.scope_label` · `expires_at` 은 **학부모 응답에 싣지 않는다.** ① 의 출처가
 * 정확히 그 둘이다. 그 정보가 필요한 곳은 **학생 자기 화면**(`/classbot/me/share`)이다 —
 * 자기가 무엇을 언제까지 주고 있는지는 학생이 알아야 하고, 끄는 것도 학생이 한다.
 * 학부모가 그것을 알아야 할 이유는 없고, 실는 순간 ① 이 그대로 돌아온다.
 *
 * ### 그래서 이 라우트에는 동의 조회가 **없다**
 *
 * 자녀 목록은 `parent_child_links ⨝ users` 뿐이다. 동의를 따로 한 번 읽어 「열린 자녀」
 * 명단을 만들지 않는다 — 그 명단과 데이터 조회 사이의 틈에서 학생이 공유를 거두면 이미
 * 통과한 명단이 조회를 열어 주고 **철회 뒤의 자료가 나간다**(05 § 11.4 규칙 1 ·
 * `_lib/consent.ts` 의 `livingConsentExists` 머리주석). 동의는 데이터 조회 **안**에만 있고,
 * 그래서 동의와 자료를 **같은 스냅샷**에서 본다.
 *
 * 같은 이유로 **자녀당 한 줄을 고르는 dedupe 도 필요 없다.** 부여 경합으로 살아 있는 동의가
 * 둘이 될 수 있지만(그 사정과 잠금은 `app/api/me/consents/route.ts`), 이 라우트는 동의 행을
 * **join 하지 않으므로** 자녀가 두 번 나올 자리가 없다 — `parent_child_links` 의 PK 가
 * `(parent_id, student_id)` 라 자녀당 정확히 한 줄이다.
 *
 * ⛔ **넘지 않는 선**(문서가 이미 고정): 대화 원문·요약은 주지 않는다(`13:79`).
 * 감정·웰빙은 자기주도 동의 하나로 딸려 나오지 않는다(`13:288`) — 동의는 타입별로 쪼갠다.
 * 단원 진행도 없다(P5, `bot_curriculum_units` 가 비어 있다).
 */

import { NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  classBots,
  parentChildLinks,
  selfEnrollments,
  selfStudyDays,
  users,
} from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import { SELF_STUDY_CONSENT, livingConsentExists } from '@/app/api/_lib/consent';
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
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'parent') return forbidden('보호자만 볼 수 있어요.');

  // 연결 자녀 **전원**. 동의는 여기서 보지 않는다 — 아래 두 조회가 자기 `where` 안에서
  // 진다(머리주석 「응답 모양」). 미동의 자녀도 이름·관계는 실리고 내용만 빈다.
  const links = await getDb()
    .select({
      id: users.id,
      name: users.name,
      relation: parentChildLinks.relation,
    })
    .from(parentChildLinks)
    .innerJoin(users, eq(parentChildLinks.studentId, users.id))
    .where(eq(parentChildLinks.parentId, actor.id))
    // 자녀 이름순. `GET /api/parent/children` 과 같은 정렬 — 두 화면이 자녀를 다른 순서로
    // 보이면 부모가 같은 목록을 두고 헷갈린다.
    .orderBy(asc(users.name));

  const children: ParentSelfStudyChild[] = await Promise.all(
    links.map(async (child) => {
      const [bots, days] = await Promise.all([
        // 보호자 id 를 함께 넘긴다 — 두 조회가 **자기 안에서** 동의를 본다. 미동의면
        // 0행으로 돌아오고, 그래서 아래 결과가 「활동 0」 자녀와 똑같아진다.
        listSelfBots(actor.id, child.id),
        listStudyDays(actor.id, child.id),
      ]);
      return {
        id: child.id,
        name: child.name,
        relation: child.relation,
        // 동의 정보(범위·만료)는 싣지 않는다 — 그것이 `null` 오라클의 출처다(머리주석 ①).
        bots,
        streak: deriveStreakFromDays(days),
      };
    }),
  );

  const body: ParentSelfStudyResponse = { children };
  return NextResponse.json(body);
}

/**
 * 자녀가 스스로 담은 봇 — 담은 순(오래된 것 먼저).
 *
 * 봇에서 가져오는 것은 **이름·과목·얼굴 이모지 셋뿐**이다. `class_bots` 행을 그대로
 * 흘리면 교사·기관·라이브 상태·인사말까지 학부모에게 나가는데, 계약이 준 것은
 * 「무엇을 스스로 골랐나」다. 이모지가 그 셋에 드는 이유는 **아이가 보는 얼굴과 부모가
 * 보는 얼굴이 같아야** 둘이 같은 봇을 이야기할 수 있기 때문이다(새 정보가 아니라 같은 봇의
 * 정직한 표현). 인사말·톤은 여전히 안 나간다 — 그건 아이와 봇 사이의 것이다.
 * ## 동의 술어가 **이 질의 안에도** 선다 — 위 조인에서 통과한 것으로 끝내지 않는다
 *
 * 자녀 목록을 고르는 조인이 이미 동의를 봤는데 왜 또 보나: **두 질의 사이에 틈이 있다.**
 * 그 틈에서 학생이 공유를 거두면(`revoked_at` 이 찍히면) 이미 통과한 목록이 이 질의를
 * 그대로 열어 주고, **철회 뒤의 자료가 나간다.** 학생 입장에서 「거뒀다」는 즉시 닫힌다는
 * 뜻이어야 하므로 이 틈은 크기 문제가 아니라 규칙 위반이다
 * (05 § 11.4 규칙 1 · `_lib/consent.ts` 의 `livingConsentExists` 머리주석이 같은 것을 적는다).
 *
 * ⛔ **그러니 이 술어를 「위에서 이미 확인했으니 중복」이라고 걷지 마라.** 걷는 순간
 * 경합이 되살아나고, 그 고장은 응답 모양으로 드러나지 않는다.
 * @param parentId - 이 자료를 읽는 보호자
 * @param studentId - 자녀
 * @returns 봇 목록(동의가 그 사이 끊겼으면 0행)
 */
async function listSelfBots(
  parentId: string,
  studentId: string,
): Promise<ParentSelfStudyBot[]> {
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
    .where(
      and(
        eq(selfEnrollments.studentId, studentId),
        livingConsentExists(parentId, studentId, SELF_STUDY_CONSENT),
      ),
    )
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
 *
 * 동의 술어가 여기에도 서는 이유는 `listSelfBots` 와 같다 — 두 질의 사이의 틈에서
 * 철회가 일어나면 이미 통과한 목록이 이 질의를 열어 준다. **걷지 마라.**
 * @param parentId - 이 자료를 읽는 보호자
 * @param studentId - 자녀
 * @returns 날짜 배열(동의가 그 사이 끊겼으면 빈 배열)
 */
async function listStudyDays(parentId: string, studentId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ day: sql<string>`to_char(${selfStudyDays.studyDate}, 'YYYY-MM-DD')` })
    .from(selfStudyDays)
    .where(
      and(
        eq(selfStudyDays.studentId, studentId),
        livingConsentExists(parentId, studentId, SELF_STUDY_CONSENT),
      ),
    )
    .orderBy(asc(selfStudyDays.studyDate));

  return rows.map((r) => r.day);
}
