'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ReadErrorState } from '@/components/classbot/read-state';
import { useMyRooms } from '@/components/classbot/home/my-rooms';
import { studentQuestionsOf, useVisibleAssignment } from '../../use-assignment-reads';
import { SolveWorkspace } from './solve-workspace';

/**
 * 풀이 화면 진입 — **누가 이 과제를 열 수 있는지도, 어떤 문항을 푸는지도 서버가 정한다**
 * (2026-09-16 계획 §06 R8 · FE PR 6).
 *
 * 종전에는 서버 행에 문항이 없어 같은 id 의 localStorage 사본에서 교사가 쓴 문항을 「빌리고」, 그것도 없으면
 * mode 시드로 떨어졌다 — 다른 기기의 학생은 교사가 쓴 문항 대신 시드를 받았다(`[M2 한계]`). 정본 상세가 문항을
 * 함께 주므로 그 빌리기와 시드 폴백을 모두 걷었다. 비로그인 데모 경로(`useAssignmentLookup`)도 함께 걷었다 —
 * 비로그인은 이 화면에 오지 않는다(PR 4 RoleGuard).
 *
 * 판정 셋:
 *   ① 서버 단건 조회가 도는 중(`isLoading`) — 기다린다. 401 로 로그인으로 가는 중도 여기다.
 *   ② 404 — 진짜 없다(남의 반 과제도 여기다). `notFound()`.
 *   ③ 5xx·네트워크 — 「없다」가 아니라 「못 읽었다」. 다시 시도를 준다(404 로 덮으면 교사는 냈는데 학생에게는
 *      과제가 사라진 것으로 보인다).
 */
export default function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = use(params);
  const { step } = use(searchParams);

  const api = useVisibleAssignment(id);
  // 봇 얼굴 — 참여 중인 반 카드에서. 늦게 와도 풀이는 먼저 연다(`my-rooms.ts` `isError` 주석).
  const { rooms } = useMyRooms();

  if (api.isNotFound) notFound();
  if (api.isError) return <ReadErrorState onRetry={() => void api.refetch()} />;
  if (api.isLoading || !api.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-pullim-slate-500 text-sm">과제를 불러오는 중…</p>
      </div>
    );
  }

  const a = api.data;
  const questions = studentQuestionsOf(a);
  const botName = rooms.find((r) => r.bot.id === a.botId)?.bot.name ?? a.assignedBy ?? '선생님';
  const initialStep = Math.max(1, Math.min(Math.max(questions.length, 1), Number(step) || 1));

  return (
    <SolveWorkspace
      assignment={a}
      questions={questions}
      botName={botName || '선생님'}
      initialStep={initialStep}
    />
  );
}
