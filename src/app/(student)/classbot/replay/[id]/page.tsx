import { notFound } from 'next/navigation';
import { getSentReplays } from '@/lib/mock';
import { ReplayPlayer } from '@/components/classbot/replay-player';

type Params = { id: string };

export function generateStaticParams(): Params[] {
  // 학생은 발송된(sent) 리플레이만 접근 가능
  return getSentReplays().map(r => ({ id: r.id }));
}

export default async function ClassbotReplayDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const replay = getSentReplays().find(r => r.id === id);
  if (!replay) notFound();

  return <ReplayPlayer replay={replay} />;
}
