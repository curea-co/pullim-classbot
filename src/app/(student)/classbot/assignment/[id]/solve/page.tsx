import { notFound } from 'next/navigation';
import { classBots, getAssignmentById, getQuestionsByAssignment } from '@/lib/mock';
import { SolveWorkspace } from './solve-workspace';

type Params = Promise<{ id: string }>;
type Search = Promise<{ step?: string }>;

export default async function SolvePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { id } = await params;
  const { step } = await searchParams;
  const a = getAssignmentById(id);
  if (!a) notFound();
  const questions = getQuestionsByAssignment(id);
  if (questions.length === 0) notFound();

  const bot = classBots.find(b => b.id === a.botId);
  const initialStep = Math.max(1, Math.min(questions.length, Number(step) || 1));

  return (
    <SolveWorkspace
      assignment={a}
      questions={questions}
      botName={bot?.name ?? a.assignedBy}
      initialStep={initialStep}
    />
  );
}
