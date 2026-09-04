'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ReadErrorState } from '@/components/classbot/read-state';
import { classBots, type Assignment } from '@/lib/mock';
import { readRowToAssignment } from '@/lib/assignment-demo';
import {
  useAssignmentStore, useAssignmentLookup, getQuestionsForAssignment,
  type UserAssignment,
} from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { useVisibleAssignment } from '../../use-assignment-reads';
import { SolveWorkspace } from './solve-workspace';

/**
 * 로컬 사본에서 **문항 출처만** 뽑는다 — 교사가 직접 쓴 문항과 오답 재발사 집합.
 *
 * 스토어에 들어 있는 것은 `UserAssignment` 라 이 둘을 갖는데, `useAssignmentLookup()` 의
 * 반환 타입은 `Assignment` 라 그 사실이 지워진다. 여기서만 좁혀 읽고, **뽑는 키를 둘로
 * 묶어 둔다** — 다른 필드까지 퍼 오면 서버가 정한 접근 판정을 로컬 값이 덮는다.
 * @param a - 같은 id 의 로컬 사본
 * @returns 문항 해석에 쓰는 두 필드
 */
function questionSources(a: Assignment): Pick<UserAssignment, 'questions' | 'requizQuestionIds'> {
  const { questions, requizQuestionIds } = a as UserAssignment;
  return { questions, requizQuestionIds };
}

export default function SolvePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = use(params);
  const { step } = use(searchParams);

  const api = useVisibleAssignment(id);
  const local = useAssignmentLookup(id);
  // 목록 화면(`../../page.tsx`)이 스켈레톤을 유지하는 것과 같은 신호를 쓴다.
  const demoHydrated = useStoresHydrated(useAssignmentStore);

  /*
    **누가 이 과제를 열 수 있는지는 서버가 정한다.**

    한때 여기서 `local ?? server` 로 로컬 사본을 먼저 봤다. 그러면 서버가 안 보여 주는
    과제(남의 반 것, 대상이 아닌 것, 지워진 것)라도 **같은 브라우저에 사본만 남아 있으면**
    풀이 화면이 열린다 — `useAssignmentLookup()` 은 대상 학생 필터 없이 `dispatched` 를
    그대로 돌려주기 때문이다. 개요·대화·결과는 서버 visibility 를 따르는데 풀이만 안 따르는
    구멍이었다.

    로컬이 정본인 경우는 하나뿐이다: **비로그인 데모**(서버가 401). prod 는 공개·비로그인이라
    이쪽이 기본 경로이고, 거기서는 애초에 서버에 아무것도 없다.
  */
  const server = api.data ? readRowToAssignment(api.data) : undefined;
  const a = api.isUnauthenticated ? local : server;

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
  /*
    판정이 끝난 **뒤에** 문항 본문만 로컬에서 빌린다.

    서버 행에는 문항이 없다(M2 경계) — 교사가 출제 화면에서 직접 쓴 발문·배점·정답과 오답
    재발사 집합은 같은 id 의 로컬 사본에만 있다. 그걸 안 합치면 서버로 연 과제가 교사가 쓴
    문항 대신 mode 시드로 떨어진다.

    **빌리는 것은 문항 출처 둘뿐이다.** 나머지 필드(대상·상태·마감)는 서버가 정본이라 로컬
    값으로 덮지 않는다 — 그게 위 접근 판정을 우회하는 뒷문이 된다.
  */
  const questions = getQuestionsForAssignment(local ? { ...a, ...questionSources(local) } : a);
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
