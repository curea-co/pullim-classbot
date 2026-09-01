import { notFound } from 'next/navigation';
import { getTeacherBotRows } from '@/lib/mock/classbot-teacher-ops';
import { botDraft } from './bot-draft';
import { BotEditWorkspace } from './edit-workspace';

type Params = Promise<{ botId: string }>;

/**
 * 봇 수정 — 운영 화면 봇 카드의 「더보기 → 수정하기」가 오는 자리.
 *
 * 새 봇을 만드는 자리(`/teacher/builder`)의 **한 칸 아래**에 둔다. 여기서 하는 일이
 * 빌더가 하는 일과 같아서다 — 과목·학년·이름·말투·수업 자료·답 범위·가르치는 법.
 * 운영 규칙(안전 등급 시간대 · 이탈 대응)은 봇 관리(`/teacher/bots/[botId]`) 몫이라
 * 이 화면이 건드리지 않는다.
 *
 * 값은 mock 카탈로그에서 봇 id 로 찾아 드래프트 첫 값으로 넣는다 (`bot-draft.ts`).
 * 없는 봇이면 404 — 빈 빌더를 열어 「고치는 중」인 척하지 않는다.
 */
export default async function BotEditPage({ params }: { params: Params }) {
  const { botId } = await params;

  const row = getTeacherBotRows().find(r => r.bot.id === botId);
  if (!row) notFound();

  return <BotEditWorkspace botName={row.bot.name} initialDraft={botDraft(row)} />;
}
