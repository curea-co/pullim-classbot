import { ClassDetail } from './class-detail';
import { DEFAULT_CLASS_TAB, isClassTabId } from './class-tabs';

type Params = Promise<{ id: string }>;
/** Next 16 `searchParams` — 같은 키가 여러 번 오면 배열이다. 그때는 첫 탭으로 떨어진다. */
type SearchParams = Promise<{ tab?: string | string[] }>;

/**
 * 반 상세 (`/teacher/classroom/[id]`) — 완성 설계 § 6.2 「교사 · 반 상세」 · `proc/spec/03 § 2.2`.
 *
 * **레일에 싣지 않는다** — 반 카드의 「자세히」에서만 들어간다(03 § 2.2 그대로). 그래서 `nav-config.ts` 에 줄이
 * 없고, 빵부스러기는 「풀림 교사 › 내 수업방」까지다(`/teacher/classroom` 접두사가 받는다).
 *
 * 탭 넷(명단 · 봇 · 과제 · 대화) 중 **지금 있는 것은 과제(계획 PR 5a)와 대화(PR 7)** 다 — 목록은 `./class-tabs.ts`.
 * 명단은 정본 문(`GET /classes/:id/members`)이 pullim-api PR 2, 봇은 `PUT /classes/:id/bot`·`GET/POST/PATCH /bots` 가
 * PR 2 — 둘 다 FE 5b 가 붙인다. 없는 탭을 화면에 「준비 중」으로 세우지 않는다.
 *
 * 탭은 `?tab=` 이 정한다(모르는 값·배열은 첫 탭). 대화 탭이 고른 학생(`?student=`)은 그 탭이 클라이언트에서 직접
 * 읽는다 — 관제소(`/teacher/monitor`)가 그 둘을 실어 보낸다. `searchParams` 는 요청 시점 API 라 이 화면은 요청마다
 * 그려진다(원래 그렇다 — 아래).
 *
 * 화면 본문은 전부 클라이언트에서 읽는다 — 신원이 OS 쿠키에 매인 데이터라 서버에서 미리 그려 두면
 * 캐시된 남의 반이 보일 수 있다. 이 파일은 `params`·`searchParams` 만 풀어 넘긴다(Next 16 — 둘 다 Promise).
 */
export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const tabParam = typeof tab === 'string' ? tab : undefined;
  return <ClassDetail classId={id} tab={isClassTabId(tabParam) ? tabParam : DEFAULT_CLASS_TAB} />;
}
