import { redirect } from 'next/navigation';
import { isBotPolicyTab } from '@/lib/mock/classbot-bot-policy';

type SearchParams = Promise<{ tab?: string }>;

/**
 * 옛 경로 — 봇 관리 목록(`/teacher/bots`)으로 넘겨보내는 자리.
 *
 * 종전에는 여기가 봇 설정 화면이었다. 봇이 여럿이라 화면을
 * 목록(`/teacher/bots`) → 봇별 설정(`/teacher/bots/[botId]`)으로 갈랐다 (`proc/spec/03 § 4.4`).
 *
 * 앱 안의 링크는 모두 새 경로로 옮겼다. 그래도 이 자리는 남는다 —
 * **앱 밖에서 오는 옛 주소가 404 로 끊기지 않게** 한다
 * (`input/docs-archive/07_풀림_클래스봇_핸드오프.md` § 3 · `proc/spec/03 § 4.4.6`).
 *
 * `?tab=` 은 목록까지 그대로 실어 보낸다 — 옛 링크는 어느 봇인지 말하지 않으므로
 * 봇은 교사가 목록에서 고르고, 고르면 그 탭으로 바로 들어간다.
 */
export default async function TeacherSettingsRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  redirect(isBotPolicyTab(tab) ? `/teacher/bots?tab=${tab}` : '/teacher/bots');
}
