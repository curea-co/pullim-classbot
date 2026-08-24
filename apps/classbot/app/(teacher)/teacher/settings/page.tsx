import { redirect } from 'next/navigation';
import { isBotPolicyTab } from '@/lib/mock/classbot-bot-policy';

type SearchParams = Promise<{ tab?: string }>;

/**
 * 옛 경로 — 봇 관리 목록(`/teacher/bots`)으로 넘겨보내는 자리.
 *
 * 종전에는 여기가 봇 설정 화면이었다. 봇이 여럿이라 화면을
 * 목록(`/teacher/bots`) → 봇별 설정(`/teacher/bots/[botId]`)으로 갈랐다 (`proc/spec/03 § 4.4`).
 *
 * 사이드바·운영 화면·교사 홈의 링크는 새 경로로 옮겼다. 이 자리가 남아 있는 이유는
 * 지금 다른 작업이 물고 있어 이번에 손댈 수 없는 두 자리 때문이다 —
 *   app/(teacher)/teacher/monitor/monitor-roster.tsx  → `/teacher/settings?tab=drift`
 *   components/builder/build-yards.tsx                → `/teacher/settings?tab=safety`
 * **그 두 링크가 새 경로로 옮겨오면 이 파일도 지운다.**
 *
 * `?tab=` 은 목록까지 그대로 실어 보낸다 — 옛 링크는 어느 봇인지 말하지 않으므로
 * 봇은 교사가 목록에서 고르고, 고르면 그 탭으로 바로 들어간다.
 */
export default async function TeacherSettingsRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  redirect(isBotPolicyTab(tab) ? `/teacher/bots?tab=${tab}` : '/teacher/bots');
}
