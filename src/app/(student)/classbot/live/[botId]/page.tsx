import { notFound } from 'next/navigation';
import { classBots } from '@/lib/mock';
import { LiveSessionPanel } from '@/components/classbot/live-session-panel';

type Params = { botId: string };

export function generateStaticParams(): Params[] {
  // 모든 봇 prerender — 실제 활성 여부는 client liveStore에서 검사
  return classBots.map(b => ({ botId: b.id }));
}

export default async function StudentLiveSessionPage({ params }: { params: Promise<Params> }) {
  const { botId } = await params;
  const bot = classBots.find(b => b.id === botId);
  if (!bot) notFound();
  return <LiveSessionPanel bot={bot} />;
}
