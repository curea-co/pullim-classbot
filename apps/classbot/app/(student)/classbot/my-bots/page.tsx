'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Bookmark, LogIn, Store } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { PageHeader } from '@/components/shell/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceBots } from '@/hooks/api/marketplace';
import { useMySelfBots, useRemoveSelfBot } from '@/hooks/api/self-bots';
import { ApiClientError } from '@/lib/api/client-fetch';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import { MyBotCard } from './my-bot-card';

/**
 * 내가 담은 봇 — 마켓에서 담은 봇들이 사는 자리.
 *
 * 자기주도 학습을 **모드가 아니라 장소로** 만든 결과가 이 화면이다(청사진 §2①).
 * 전역 토글이 화면마다 뜻을 바꾸는 대신, 담은 봇은 여기 한 곳에 모인다 —
 * 나머지 화면(내 수업방·받은 과제·내 정보)은 종전 그대로고 분기하지 않는다.
 *
 * ## 두 갈래 읽기를 하나로 붙인다
 *
 * 「무엇을 담았나」는 **내 것**(`useMySelfBots`)이고 「그게 무슨 봇인가」는
 * **마켓**(`useMarketplaceBots`)이다. 담은 목록에는 id 와 담은 시각만 있어서
 * (계약 §3 — 그 두 칸이 미래 API 의 행 모양이라 늘리지 않는다) 이름·아바타·과목은
 * 마켓 목록에서 id 로 찾아 붙인다.
 *
 * 그래서 **마켓 쪽 상태가 이 화면의 상태를 먹는다:**
 *  - 마켓을 아직 못 읽었으면 담은 봇이 전부 이름 없는 칸이 된다 → 뼈대만 그리고 기다린다
 *  - 401(로그인 안 함)이면 마켓 화면과 **같은 안내**를 낸다. 여기서만 다른 말을 하면
 *    같은 이유로 막힌 두 화면이 서로 다른 고장처럼 보인다
 *  - 그 밖의 실패는 목록을 그리지 않는다. 이름 없는 카드 세 장보다 「다시 시도」가 낫다
 *
 * 담은 목록 자체(`isLoading`)는 지금 하이드레이션 대기 구간이다. P3 에서 서버 조회가
 * 되면 같은 자리가 진짜 로딩이 된다 — 화면은 한 줄도 안 바뀐다.
 */
export default function MyBotsPage() {
  const mine = useMySelfBots();
  const market = useMarketplaceBots();
  const remove = useRemoveSelfBot();

  const rows = useMemo(() => mine.data ?? [], [mine.data]);
  const catalog = useMemo(() => {
    const map = new Map<string, MarketplaceBotItem>();
    for (const bot of market.data?.bots ?? []) map.set(bot.botId, bot);
    return map;
  }, [market.data]);

  // 마켓과 같은 이유로 401 만 따로 뗀다 — 고장이 아니라 로그인 안 한 상태다.
  const isSignedOut = market.error instanceof ApiClientError && market.error.status === 401;
  const isMarketBroken = market.isError && !isSignedOut;
  const isLoading = mine.isLoading || (rows.length > 0 && market.isPending);
  const isEmpty =
    !mine.isError && !isSignedOut && !isMarketBroken && !isLoading && rows.length === 0;

  return (
    <div className="space-y-5">
      <BackLink href="/classbot">클래스봇 홈</BackLink>

      <PageHeader
        eyebrow={{ icon: Bookmark, text: '내가 담은 봇' }}
        title={
          isLoading || mine.isError ? (
            '담은 봇'
          ) : (
            <>
              담은 봇 <span className="text-pullim-blue-600">{rows.length}</span>개
            </>
          )
        }
        description="마켓에서 담은 봇이에요. 선생님 반에 들어가지 않아도 혼자 쓸 수 있어요."
        // 빈 상태에는 이 버튼을 안 그린다. 빈 상태가 이미 마켓으로 보내는 버튼을 들고 있어서
        // 둘을 함께 두면 한 화면에 같은 글자의 버튼이 둘 선다 — 어느 쪽을 누르는 자리인지
        // 고민하게 만든다. 빈 상태의 나가는 길은 하나여야 한다(`EmptyState` 의 `action` 주석).
        action={
          isEmpty ? undefined : (
            <Link
              href="/classbot/discover"
              aria-label="봇 마켓으로 가기"
              className="bg-card hover:bg-pullim-slate-50/50 text-pullim-slate-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <Store className="h-3.5 w-3.5" aria-hidden />봇 마켓
            </Link>
          )
        }
      />

      {mine.isError ? (
        // 훅에 다시 읽기가 없다(계약 §3) — 있으면 그때 여기에 붙인다.
        <ReadErrorState />
      ) : isSignedOut ? (
        <div data-testid="my-bots-signin">
          <EmptyState
            icon={LogIn}
            title="로그인하면 담은 봇을 볼 수 있어요"
            description="담은 봇이 무슨 봇인지는 로그인한 뒤에 읽어 올 수 있어요."
          />
        </div>
      ) : isMarketBroken ? (
        <ReadErrorState onRetry={() => void market.refetch()} />
      ) : isLoading ? (
        <MyBotsSkeleton />
      ) : rows.length === 0 ? (
        <div data-testid="my-bots-empty">
          <EmptyState
            icon={Bookmark}
            title="아직 담은 봇이 없어요"
            description="봇 마켓에서 마음에 드는 봇을 담으면 여기 모여요. 담은 봇은 혼자 쓰는 거라 참여 코드가 없어도 돼요."
            action={{
              href: '/classbot/discover',
              label: '봇 마켓',
              ariaLabel: '봇 마켓으로 가서 봇 담기',
            }}
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="my-bots-list">
          {rows.map((row) => (
            <MyBotCard
              key={row.botId}
              row={row}
              bot={catalog.get(row.botId) ?? null}
              onRemove={() => remove.mutate(row.botId)}
              isRemoving={remove.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MyBotsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
