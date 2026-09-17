import { isBotPolicyTab } from '@/lib/mock/classbot-bot-policy';
import { BotsWorkspace } from './bots-workspace';

/** Next 16 `searchParams` — 같은 키가 여러 번 오면 배열이다. 그때는 아무 탭도 실어 나르지 않는다. */
type SearchParams = Promise<{ tab?: string | string[] }>;

/**
 * 봇 관리 — 목록 (SCR-C-25 / FR-C-06, `proc/spec/03 § 4.4`).
 *
 * 종전에는 봇 설정이 화면 하나였다. 봇은 여럿인데 화면이 하나라 「지금 어느 봇을 고치고 있나」가
 * 화면에 없었다. 그래서 목록 → 상세로 가른다.
 *   이 화면      — 내가 만든 봇을 늘어놓고 고르게 한다
 *   [botId] 화면 — 고른 봇의 정체와 운영 규칙을 고친다
 *
 * 운영 화면(`/teacher/classbot`)과의 역할 분리:
 *   운영 화면은 「지금 잘 돌고 있나」 — 운영 중·멈춤과 그 이유, 붙은 학급과 인원, 낸 과제.
 *   이 화면은  「이 봇을 어떻게 굴릴까」 — 봇 정체와 지금 규칙(안전 등급·말투)뿐이다.
 * 그래서 운영 사실을 여기에 옮겨 적지 않는다. 같은 카드를 두 벌 만들면 둘 다 안 읽힌다.
 *
 * **줄의 원천이 mock 카탈로그에서 정본으로 옮겨 왔다**(계획 PR 5d · `GET /classbot/me/bots` · api.md § 3.5b).
 * 신원이 OS 쿠키에 매인 데이터라 화면 본문은 전부 클라이언트에서 읽는다 — 서버에서 미리 그려 두면
 * 캐시된 남의 봇이 보일 수 있다. 이 파일은 `searchParams` 만 풀어 넘긴다(Next 16 — Promise).
 *
 * @param searchParams - `?tab=` 만 읽는다(아래 「실어 나르는 탭」).
 * @returns 클라이언트 작업판
 */
export default async function TeacherBotsPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  const raw = typeof tab === 'string' ? tab : undefined;

  /*
    실어 나르는 탭 — 봇을 가리키지 못하는 링크가 보낸 것이다.
    학급 관제소(`monitor-roster.tsx`)는 학급의 봇 id 를 모르고, 봇 빌더(`build-yards.tsx`)는
    아직 봇을 만들기 전이다. 그래서 둘 다 이 목록으로 오고, **봇은 교사가 고르고 탭만 이어 붙인다** —
    고른 봇의 그 탭으로 바로 들어간다. 모르는 탭은 실어 나르지 않는다.
  */
  return <BotsWorkspace carriedTab={raw !== undefined && isBotPolicyTab(raw) ? raw : undefined} />;
}
