'use client';

import { useMemo } from 'react';
import { Bot, Store } from 'lucide-react';

import { EmptyState } from '@/components/classbot/empty-state';
import { MarketplaceBotList } from '@/components/classbot/marketplace';
import { SectionHeading } from '@/components/shell/section-heading';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherClassrooms } from '@/hooks/api/classroom';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { TeacherClassroomItem } from '@/hooks/api/types';
import { PublishBotBlock } from './publish-bot-block';

/**
 * 교사 셸의 마켓 본문 — 「내 봇 공유」 + 공개 목록.
 *
 * **공유 진입점이 여기로 왔다**(계획 PR 5a · #351 리뷰 S1). 종전에는 내 수업방 카드의 `PublishBotBlock` 이
 * 유일한 진입점이었고 이 화면은 그리로 보내는 링크만 들었다. 내 수업방이 pullim-api 정본을 읽게 되면서
 * 그 카드에는 같은 오리진 봇 id 도 게시 상태도 없어져, 링크가 **공유 버튼이 없는 화면**을 가리키게 됐다.
 * 그래서 공유 칸을 이 화면의 첫 절로 옮긴다 — 마켓 계열은 완성 설계 결정 ①의 범위 밖(「로컬 전용」)이라
 * 축을 바꾸지 않고, 이 화면이 이미 「내 봇」 판정에 쓰던 같은 오리진 `useTeacherClassrooms` 위에 세운다.
 * **정본 반 id 는 이 축에 들어오지 않는다** — 두 세계의 id 가 한 화면에서 만나면 공유 버튼이 존재하지 않는
 * 봇을 가리킨다.
 *
 * 「내 봇」 판정을 이름 대조(`teacherName === 내 이름`)로 하지 않는다 — 동명이인 선생님이 있으면
 * 남의 봇에 내 표시가 붙는다. 대신 내가 연 수업방의 `botId` 집합과 대조한다.
 * 그 목록은 서버가 소유자 조건으로 뽑아 준 것이라 오탐이 없다.
 *
 * 이 조회가 실패해도(학생이 URL 로 들어와 403 을 받는 경우 · 비로그인 401 등) 화면을 에러로 덮지 않는다 —
 * 마켓 목록 자체는 역할과 무관하게 열려 있고, 그때는 「내 봇」 표시와 공유 절 없이 그린다.
 */
export function MarketplaceWorkspace() {
  const mine = useTeacherClassrooms();

  const rooms = useMemo(() => mine.data?.classrooms ?? [], [mine.data]);
  const ownBotIds = useMemo(() => {
    const ids = rooms.map((room) => room.botId).filter((id): id is string => Boolean(id));
    return new Set(ids);
  }, [rooms]);

  return (
    <div className="space-y-7">
      <MyBotSharing rooms={rooms} isPending={mine.isPending} error={mine.error} />
      <MarketplaceBotList
        detailHref={(botId) => `/teacher/marketplace/${botId}`}
        ownBotIds={ownBotIds}
        emptyDescription="위 「내 봇 공유」에서 봇을 올리면 여기에 가장 먼저 보여요."
      />
    </div>
  );
}

/**
 * 내 봇 공유 — 내가 연 수업방의 봇마다 공유 칸 하나.
 *
 * 봇이 없는 빈 반(`botId` null)은 세우지 않는다 — 공유는 반이 아니라 **봇**에 거는 일이다.
 * 401·403 은 조용히 비운다(머리주석) — 이 절은 교사 본인에게만 뜻이 있다.
 */
function MyBotSharing({
  rooms,
  isPending,
  error,
}: {
  rooms: TeacherClassroomItem[];
  isPending: boolean;
  error: ApiClientError | null;
}) {
  const quiet = error instanceof ApiClientError && (error.status === 401 || error.status === 403);
  if (quiet) return null;

  const withBot = rooms.filter((room): room is TeacherClassroomItem & { botId: string } => Boolean(room.botId));

  return (
    <section data-testid="my-bot-sharing" aria-labelledby="my-bot-sharing-title">
      <SectionHeading
        title={<span id="my-bot-sharing-title">내 봇 공유</span>}
        description="내 수업방의 봇을 봇 마켓에 올리고 거두는 곳이에요."
      />

      {isPending ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="my-bot-sharing-error">
          {error.message}
        </p>
      ) : withBot.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          icon={Store}
          title="공유할 봇이 아직 없어요"
          description="봇이 있는 수업방이 생기면 여기서 봇 마켓에 올릴 수 있어요."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="my-bot-sharing-list">
          {withBot.map((room) => (
            <li key={room.botId} className="bg-card rounded-2xl border p-5" data-testid={`sharing-card-${room.botId}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-pullim-slate-900 truncate text-sm font-bold">{room.botName ?? '이름 없는 봇'}</h3>
                  <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">{room.label}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {room.subject && <Chip tone="info">{room.subject}</Chip>}
                  {room.grade && <Chip tone="outline">{room.grade}</Chip>}
                  <Chip tone="outline">
                    <Bot aria-hidden />
                    <span className="sr-only">봇</span>
                  </Chip>
                </div>
              </div>
              <PublishBotBlock
                botId={room.botId}
                botName={room.botName}
                isPublished={room.isPublished}
                publishedAt={room.publishedAt}
                publishBlurb={room.publishBlurb}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
