'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { classBots } from '@/lib/mock';
import { readRowToAssignment } from '@/lib/assignment-demo';
import { useAssignmentLookup, getQuestionsForAssignment } from '@/lib/store/assignments';
import { useVisibleAssignment } from '../../use-assignment-reads';
import { SolveWorkspace } from './solve-workspace';

export default function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = use(params);
  const { step } = use(searchParams);

  /*
    과제는 두 곳에서 온다.

    ① 서버 — 교사 발사가 실DB 로 가면서 학생에게 오는 과제의 **정본**이 됐다. 목록·상세·
       대화·결과는 이미 이 경로를 읽는데 풀이 화면만 로컬 스토어를 봐서, 서버에서 온 과제를
       누르면 404 였다(교사는 냈고 목록에도 보이는데 풀 수는 없는 상태).
    ② 로컬 스토어 — 비로그인 데모와 시드 과제. prod 는 공개·비로그인이라 이쪽이 기본 경로다.

    문항 **본문**은 어느 쪽에서도 오지 않는다 — 서버 행은 과제 메타뿐이다(M2 경계).
    `getQuestionsForAssignment()` 가 시드에서 채운다.
  */
  const api = useVisibleAssignment(id);
  const local = useAssignmentLookup(id);
  const a = local ?? (api.data ? readRowToAssignment(api.data) : undefined);

  if (!a) {
    // 아직 모른다 — 서버 조회가 도는 동안, 그리고 데모 스토어가 하이드레이션되는 동안.
    // 여기서 404 를 그리면 새로고침·딥링크가 곧 도착할 과제를 「없음」으로 단정한다.
    if (api.isLoading || id.startsWith('as_user_')) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-pullim-slate-500 text-sm">과제를 불러오는 중…</p>
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
