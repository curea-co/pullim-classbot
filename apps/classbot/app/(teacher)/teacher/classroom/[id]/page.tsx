import { ClassDetail } from './class-detail';

type Params = Promise<{ id: string }>;

/**
 * 반 상세 (`/teacher/classroom/[id]`) — 완성 설계 § 6.2 「교사 · 반 상세」 · `proc/spec/03 § 2.2`.
 *
 * **레일에 싣지 않는다** — 반 카드의 「자세히」에서만 들어간다(03 § 2.2 그대로). 그래서 `nav-config.ts` 에 줄이
 * 없고, 빵부스러기는 「풀림 교사 › 내 수업방」까지다(`/teacher/classroom` 접두사가 받는다).
 *
 * 탭 넷(명단 · 봇 · 과제 · 대화) 중 **이 PR(계획 PR 5a)은 과제 탭만 그린다.** 명단은 정본 문
 * (`GET /classes/:id/members`)이 pullim-api PR 2, 봇은 `PUT /classes/:id/bot`·`GET/POST/PATCH /bots` 가 PR 2 —
 * 둘 다 FE 5b 가 붙인다. 대화 탭(학생별 기록 + 신호 배지)은 pullim-api PR 3 뒤 FE PR 7 이다. 없는 탭을
 * 화면에 「준비 중」으로 세우지 않는다 — 탭이 하나인 동안은 하나만 있는 화면이다.
 *
 * 화면 본문은 전부 클라이언트에서 읽는다 — 신원이 OS 쿠키에 매인 데이터라 서버에서 미리 그려 두면
 * 캐시된 남의 반이 보일 수 있다. 이 파일은 `params` 만 풀어 넘긴다(Next 16 — `params` 는 Promise).
 */
export default async function TeacherClassDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  return <ClassDetail classId={id} />;
}
