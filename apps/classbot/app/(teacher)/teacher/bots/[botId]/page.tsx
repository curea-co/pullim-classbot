import { botPolicyTabs, isBotPolicyTab } from '@/lib/mock/classbot-bot-policy';
import { BotSettingsWorkspace } from './bot-settings-workspace';

type Params = Promise<{ botId: string }>;
/** Next 16 `searchParams` — 같은 키가 여러 번 오면 배열이다. 그때는 첫 탭으로 떨어진다. */
type SearchParams = Promise<{ tab?: string | string[] }>;

/**
 * 봇 관리 — 봇별 설정 (SCR-C-25 / FR-C-06, `proc/spec/03 § 4.4`).
 *
 * 화면 본문은 전부 클라이언트에서 읽는다 — 이 봇이 내 봇인지는 신원(OS 쿠키)에 달렸고,
 * 서버에서 미리 그려 두면 캐시된 남의 봇이 보일 수 있다. 이 파일은 `params`·`searchParams` 만
 * 풀어 넘긴다(Next 16 — 둘 다 Promise).
 *
 * **그래서 `notFound()` 가 여기서 사라졌다.** 종전에는 mock 카탈로그를 서버에서 뒤져 없으면 404 였는데,
 * 이제 「내 봇인가」를 아는 것은 클라이언트가 목록을 다 읽은 뒤다 — 「아직 모른다」와 「내 봇이 아니다」를
 * 서버가 가를 수 없다. 없는 봇을 말하는 자리는 작업판 안이다(`bot-settings-workspace.tsx`).
 *
 * @param params - `botId` — 정본 `bots` 행 id
 * @param searchParams - `?tab=` (모르는 값·배열은 첫 탭)
 * @returns 클라이언트 작업판
 */
export default async function TeacherBotSettingsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { botId } = await params;
  const { tab } = await searchParams;
  const raw = typeof tab === 'string' ? tab : undefined;
  const active = raw !== undefined && isBotPolicyTab(raw) ? raw : botPolicyTabs[0].value;

  return <BotSettingsWorkspace botId={botId} tab={active} />;
}
