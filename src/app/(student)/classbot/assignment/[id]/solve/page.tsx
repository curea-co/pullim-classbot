'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { classBots } from '@/lib/mock';
import { useAssignmentLookup, getQuestionsForAssignment } from '@/lib/store/assignments';
import { SolveWorkspace } from './solve-workspace';

export default function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = use(params);
  const { step } = use(searchParams);

  const a = useAssignmentLookup(id);
  if (!a) {
    if (id.startsWith('as_user_')) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-pullim-slate-500 text-sm">과제를 불러오는 중...</p>
        </div>
      );
    }
    notFound();
  }
  const questions = getQuestionsForAssignment(a);
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
