'use client';

import type { ReactNode } from 'react';
import { Store } from 'lucide-react';

import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceBots } from '@/hooks/api/marketplace';
import { MarketplaceBotCard } from './marketplace-bot-card';

/**
 * 마켓에 공개된 봇 목록 — 학생·교사 셀이 같은 정본 목록을 쓴다.
 *
 * ADR-094 범위에서는 풀림 공식 봇만 게시된다. 교사 봇 게시·해제와
 * 「내 봇」 표시는 open item 이므로 이 목록의 진입점과 prop 에서 제거한다.
 */
export function MarketplaceBotList({
  detailHref,
  emptyDescription,
  headingAction,
  showSelfAdd = false,
}: {
  /** 봇 상세로 가는 길. 학생·교사 셀의 URL 이 다르다. */
  detailHref: (botId: string) => string;
  /** 정본이 빈 목록을 돌려줄 때 보여 줄 안내. */
  emptyDescription: string;
  /** 목록 제목 오른쪽 액션. */
  headingAction?: ReactNode;
  /** 카드에 담기 버튼을 붙인다. 학생 셀만 true. */
  showSelfAdd?: boolean;
}) {
  const query = useMarketplaceBots();

  if (query.isError) {
    return (
      <AlertCard tone="danger" icon={Store} title="봇 마켓을 불러오지 못했어요">
        <p className="text-pullim-slate-700 text-sm" data-testid="marketplace-error">
          {query.error.message}
        </p>
      </AlertCard>
    );
  }

  const bots = query.data?.bots ?? [];

  return (
    <section>
      <SectionHeading
        className="sm:items-center"
        title={query.isPending ? '공개된 봇' : `공개된 봇 ${bots.length}개`}
        action={headingAction}
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : bots.length === 0 ? (
        <div data-testid="marketplace-empty">
          <EmptyState
            icon={Store}
            title="아직 공개된 봇이 없어요"
            description={emptyDescription}
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="marketplace-list">
          {bots.map((bot) => (
            <MarketplaceBotCard
              key={bot.botId}
              bot={bot}
              href={detailHref(bot.botId)}
              showSelfAdd={showSelfAdd}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
