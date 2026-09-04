'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ReadErrorState } from '@/components/classbot/read-state';
import { classBots } from '@/lib/mock';
import { readRowToAssignment } from '@/lib/assignment-demo';
import { useAssignmentStore, useAssignmentLookup, getQuestionsForAssignment } from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
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
  // 목록 화면(`../../page.tsx`)이 스켈레톤을 유지하는 것과 같은 신호를 쓴다.
  const demoHydrated = useStoresHydrated(useAssignmentStore);
  const a = local ?? (api.data ? readRowToAssignment(api.data) : undefined);

  if (!a) {
    /*
      기다리는 근거는 **읽을 곳을 다 읽었는가**다 — id 의 모양이 아니다.

      한때 여기서 `id.startsWith('as_user_')` 로 기다렸다. 그 접두사는 로컬에서 발사된 과제의
      id 라 「곧 스토어에 나타난다」는 뜻으로 읽었는데, 정작 로컬에 **없는** 링크가 바로 그
      모양이다 — 다른 브라우저에서 연 링크, localStorage 를 지운 뒤의 링크, 오래된 링크.
      그 값들은 영영 채워지지 않으므로 404 로 정리되지 못하고 스피너에 갇혔다.

      그래서 두 출처가 각각 끝났는지만 본다:
        ① 서버 단건 조회가 도는 중(`api.isLoading`) — 곧 도착할 수 있다.
        ② 데모 스토어의 rehydrate 전 — 서버 렌더와 클라이언트 첫 페인트가 여기 해당한다.
           이 구간을 안 기다리면 새로고침·딥링크가 로컬에 **있는** 과제를 「없음」으로 단정한다.

      둘 다 끝났는데 없으면 진짜 없는 것이다.
    */
    if (api.isLoading || !demoHydrated) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-pullim-slate-500 text-sm">과제를 불러오는 중…</p>
        </div>
      );
    }
    /*
      **「없다」와 「못 읽었다」는 다르다.** 서버가 5xx·네트워크로 실패한 것을 404 로 덮으면
      교사는 냈는데 학생에게는 「과제가 사라졌다」로 보이고, 다시 시도할 길도 없어진다.
      개요(`../page.tsx`)·대화 화면이 같은 단건 읽기에서 이미 하는 것과 같은 자리를 쓴다.

      401(비로그인 데모)과 404 는 여기 안 온다 — `useVisibleAssignment` 가 그 둘을
      `isError` 에서 빼 두었다. 그래서 데모의 401 은 그대로 아래 `notFound()` 로 간다:
      로컬 스토어에도 없는 id 라면 실제로 없는 게 맞다.
    */
    if (api.isError) return <ReadErrorState onRetry={() => void api.refetch()} />;
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
