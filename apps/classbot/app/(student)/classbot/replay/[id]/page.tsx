import { notFound } from 'next/navigation';
import { getSentReplays } from '@/lib/mock';
import { demoReplays } from '@/lib/mock/classbot-replay-demo';
import { ReplayDetail } from '@/components/classbot/replay-detail';

type Params = { id: string };

/**
 * 상세 조회 대상 — 학생 sent 리플레이 + 데모 리플레이.
 * 데모는 detail 직접 URL로만 노출(리플레이 목록 getSentReplays는 오염하지 않아 빈 상태 유지).
 */
function detailReplays() {
  return [...getSentReplays(), ...demoReplays];
}

export function generateStaticParams(): Params[] {
  return detailReplays().map(r => ({ id: r.id }));
}

export default async function ClassbotReplayDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const replay = detailReplays().find(r => r.id === id);
  if (!replay) notFound();

  return <ReplayDetail replay={replay} />;
}
