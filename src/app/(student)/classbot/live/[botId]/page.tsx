import { notFound, redirect } from 'next/navigation';
import { classBots } from '@/lib/mock';
import { LiveSessionPanel } from '@/components/classbot/live-session-panel';

type Params = { botId: string };

export function generateStaticParams(): Params[] {
  return classBots.filter(b => b.isLive).map(b => ({ botId: b.id }));
}

export default async function StudentLiveSessionPage({ params }: { params: Promise<Params> }) {
  const { botId } = await params;
  const bot = classBots.find(b => b.id === botId);
  if (!bot) notFound();
  if (!bot.isLive) {
    // 라이브 종료된 봇 — 리플레이가 있으면 리플레이, 없으면 chat fallback
    redirect('/classbot/chat');
  }
  return <LiveSessionPanel bot={bot} />;
}
