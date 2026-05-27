import { notFound } from 'next/navigation';
import { gradingQueue, overriddenSample, gradingHistory } from '@/lib/mock';
import { GradingDetail } from './grading-detail';

type Params = Promise<{ id: string }>;

export default async function GradingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const allItems = [...gradingQueue, overriddenSample];
  const item = allItems.find(i => i.id === id);
  if (!item) notFound();
  const history = gradingHistory.filter(h => h.studentId === item.studentId);

  const allIds = allItems.map(i => i.id);
  const idx = allIds.indexOf(id);
  const prevId = idx > 0 ? allIds[idx - 1] : null;
  const nextId = idx < allIds.length - 1 ? allIds[idx + 1] : null;

  return <GradingDetail item={item} history={history} prevId={prevId} nextId={nextId} />;
}
