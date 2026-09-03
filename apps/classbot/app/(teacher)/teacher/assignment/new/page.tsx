import { AssignmentForm } from './assignment-form';

type SearchParams = Promise<{ bot?: string }>;

/**
 * 과제 내기 — 운영 화면 봇 카드의 「더보기 → 과제 내기」가 오는 자리.
 *
 * 어느 봇에서 눌렀는지를 `?bot=` 로 받아 「발사 봇」을 그 봇으로 열어 둔다.
 * 여기서 걸러내지 않는 이유: 발사 봇 목록은 이제 **내 수업방(DB)** 이고 그 목록은
 * 클라이언트가 읽는다 — 서버에서 mock 카탈로그로 대조하면 진짜 내 봇을 못 알아본다.
 * 목록에 없는 id 면 폼이 첫 수업방으로 연다(없는 봇을 고른 척하지 않는다).
 */
export default async function NewAssignmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { bot } = await searchParams;

  return <AssignmentForm initialBotId={bot ?? ''} />;
}
