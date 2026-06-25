import { notFound } from 'next/navigation';
import { demoReplays } from '@/lib/mock/classbot-replay-demo';
import { ReplayDetail } from '@/components/classbot/replay-detail';

type Params = { id: string };

/**
 * 데모 전용 리플레이 상세 — 회고 깊이 시연용(rp_demo_*).
 * 학생 sent 스코프(`replay/[id]`)와 분리해 실제 목록/라우트를 오염시키지 않는다.
 */
export function generateStaticParams(): Params[] {
  return demoReplays.map(r => ({ id: r.id }));
}

export default async function ClassbotReplayDemoDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const replay = demoReplays.find(r => r.id === id);
  if (!replay) notFound();

  return <ReplayDetail replay={replay} />;
}
