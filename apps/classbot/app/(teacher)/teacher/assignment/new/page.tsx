import { classBots } from '@/lib/mock';
import { AssignmentForm } from './assignment-form';

type SearchParams = Promise<{ bot?: string }>;

/**
 * 과제 내기 — 운영 화면 봇 카드의 「더보기 → 과제 내기」가 오는 자리.
 *
 * 어느 봇에서 눌렀는지를 `?bot=` 로 받아 「발사 봇」을 그 봇으로 열어 둔다.
 * 모르는 id 거나 안 실려 오면 목록 첫 봇으로 연다 — 없는 봇을 고른 척하지 않는다.
 * 고르는 자리는 폼 안에 그대로 있으니 교사는 언제든 다른 봇으로 바꿀 수 있다.
 */
export default async function NewAssignmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { bot } = await searchParams;
  const initialBotId = classBots.find(b => b.id === bot)?.id;

  return <AssignmentForm initialBotId={initialBotId} />;
}
