import { redirect } from 'next/navigation';
import { classBots } from '@/lib/mock';

type Params = { botId: string };

export function generateStaticParams(): Params[] {
  return classBots.map(b => ({ botId: b.id }));
}

/**
 * /classbot/live/[botId] → /classbot/chat?bot={botId}
 *
 * 봇 진입점을 chat 한 곳으로 단일화. chat 페이지가 liveStore.active[botId]를 보고
 * 라이브 오버레이(슬라이드·자막·퀴즈·질문 큐)를 채팅 위에 자동 부착한다.
 * (handoff § 4.2 — 봇은 라이브 외에도 자기주도 학습용으로 항상 사용 가능)
 */
export default async function StudentLiveSessionPage({ params }: { params: Promise<Params> }) {
  const { botId } = await params;
  redirect(`/classbot/chat?bot=${botId}`);
}
