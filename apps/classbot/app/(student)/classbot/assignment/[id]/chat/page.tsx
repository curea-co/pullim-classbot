'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Inbox, Lock } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { classBots, getQuestionsByAssignment } from '@/lib/mock';
import { useMyAssignment, useMyBots } from '@/hooks/api/read/use-student-reads';
import { useAssignmentLookup, getQuestionsForAssignment } from '@/lib/store/assignments';
import { assignmentToReadRow } from '@/lib/assignment-demo';
import { botSignature } from '@/lib/tokens/bot-signature';
import { AssignmentChatWorkspace } from './assignment-chat-workspace';

/**
 * 과제 대화 라우트 — SCR-C-37 / FR-C-39.
 *
 * 과제 행·문항을 푸는 방식은 **과제 상세(`../page.tsx`)와 똑같다** — 같은 과제를 두 화면이
 * 다르게 읽어 split-brain 이 생기지 않게 하기 위해서다(실API 우선 · 미로그인은 로컬 스토어 폴백).
 * 대화 자체는 워크스페이스가 맡는다.
 */
export default function AssignmentChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useMyAssignment(id);
  const { data: botsData } = useMyBots();
  const localA = useAssignmentLookup(id);

  const demo = api.isUnauthenticated;
  const a = demo ? (localA ? assignmentToReadRow(localA) : undefined) : api.data;
  const isLoading = demo ? false : api.isLoading;
  const isNotFound = demo ? !localA : api.isNotFound;
  const isError = demo ? false : api.isError;

  const back = (
    <Link
      href={`/classbot/assignment/${id}`}
      className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
    >
      <ArrowLeft className="h-3 w-3" />
      과제 상세
    </Link>
  );

  if (isNotFound) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={Inbox}
          title="과제를 찾을 수 없어요"
          description="받은 과제 목록에서 다시 확인해 주세요."
          action={{ href: '/classbot/assignment', label: '받은 과제로' }}
        />
      </div>
    );
  }
  if (isError) {
    return <div className="space-y-4">{back}<ReadErrorState onRetry={() => void api.refetch()} /></div>;
  }
  if (isLoading || !a) {
    return (
      <div className="space-y-4" aria-busy="true">
        {back}
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  // 시험 모드는 봇 응답 자체가 막힌다 — 진입점을 감추는 것만으론 딥링크가 뚫리므로
  // 라우트에서도 막는다. 되돌리지 않고 막힌 상태를 보여 준다(왜 못 들어오는지 알려야 한다).
  if (a.mode === 'exam') {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          icon={Lock}
          title="시험 과제는 봇과 대화할 수 없어요"
          description="시험 모드에서는 봇이 잠겨요. 혼자 힘으로 풀고, 끝난 뒤에 봇과 다시 이야기해요."
          action={{ href: `/classbot/assignment/${id}`, label: '과제 상세로' }}
        />
      </div>
    );
  }

  // 문항 — 개요·풀이와 같은 해석기를 쓴다(오답 재발사 계약 포함).
  const questions = localA ? getQuestionsForAssignment(localA) : getQuestionsByAssignment(id);

  // 봇 얼굴 — `/api/bots` 행 우선, 없으면 카탈로그, 그것도 없으면 과제 행 메타로 폴백.
  const botRow = botsData?.bots.find(b => b.id === a.botId);
  const catalogBot = classBots.find(b => b.id === a.botId);
  const bot = {
    name: botRow?.name ?? catalogBot?.name ?? a.assignedBy,
    avatarEmoji: botRow?.avatarEmoji ?? catalogBot?.avatarEmoji ?? '🧑‍🏫',
    hex: botSignature({ id: a.botId, subject: botRow?.subject ?? a.subject }).hex,
  };

  return <AssignmentChatWorkspace assignment={a} questions={questions} bot={bot} />;
}
