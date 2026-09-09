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
import { classBots as botCatalog } from '@/lib/mock/classbot';
import { MyBotCard } from './my-bot-card';

/**
 * 마켓이 이 봇을 못 알려줄 때 시드 카탈로그에서 이름표를 찾는다.
 *
 * `lib/store/mode-bots.ts` 의 `fallbackBot()` 과 **같은 판단**이다 — 비로그인 데모 학생이
 * 담은 봇은 대개 시드 봇(`cb_001`…)이라, 여기서 이름을 되찾으면 마켓이 막혀도 목록이
 * 제 모습으로 선다. 카탈로그에도 없으면 `null` 을 주고, 그때는 `MyBotCard` 가 이름 자리에
 * 상태를 적는다.
 * @param botId - 담은 봇 id
 * @returns 카드가 그릴 수 있는 마켓 한 칸, 없으면 null
 */
function seedAsMarketItem(botId: string): MarketplaceBotItem | null {
  const seeded = botCatalog.find((b) => b.id === botId);
  if (!seeded) return null;
  return {
    botId: seeded.id,
    name: seeded.name,
    avatarEmoji: seeded.avatarEmoji,
    subject: seeded.subject,
    grade: seeded.grade,
    tone: seeded.tone,
    greeting: seeded.greeting,
    blurb: null,
    teacherName: seeded.teacherName,
    organization: seeded.organization,
    publishedAt: null,
    enrolledCount: seeded.enrolledCount,
  };
}

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
 * **그러나 마켓이 이 목록의 정본은 아니다.** 담은 사실은 내 저장소에 있고 마켓은 이름표만
 * 붙인다. 그래서 마켓이 막혔다고 **목록을 통째로 덮지 않는다** — 예전엔 401 이면 로그인
 * 안내가 담은 봇 목록을 지웠고, 그 결과 학생은 같은 봇과 **대화는 되는데
 * 「내가 담은 봇」에서는 안 보이는** 갈린 상태를 봤다(`lib/store/mode-bots.ts` 는 401 에도
 * 담은 봇을 계속 싣는다). 두 화면이 같은 저장소를 읽으니 답도 같아야 한다.
 *
 * 지금 규약:
 *  - 마켓을 **아직 못 읽었으면** 뼈대만 그리고 기다린다(이름이 늦게 바뀌어 번쩍이지 않게)
 *  - 마켓이 **막혔으면**(401·오류) 담은 목록은 **그대로 그리고**, 이름을 못 붙인 까닭만
 *    목록 위에 한 줄로 적는다. 시드 봇은 카탈로그가 이름을 알고 있어 그대로 보인다
 *  - **담은 것이 하나도 없을 때만** 화면이 갈린다 — 로그인 안 했으면 로그인 안내,
 *    로그인했으면 「아직 담은 봇이 없어요」
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
  // 이름표를 못 붙인 까닭. 목록을 지우는 대신 목록 위에 한 줄로만 적는다.
  const labelNotice = isSignedOut
    ? '로그인하면 봇 이름과 소개를 읽어 와요. 담아 둔 봇은 그대로 쓸 수 있어요.'
    : isMarketBroken
      ? '지금은 봇 이름과 소개를 읽어 오지 못했어요. 담아 둔 봇은 그대로 쓸 수 있어요.'
      : null;
  // 담은 봇이 0개여도 마켓이 끝날 때까지 기다린다 — 「빈 목록」과 「로그인 안 함」을 가르는
  // 근거가 마켓의 401 이라서다. 예전엔 rows 가 없으면 기다리지 않아, 비로그인 사용자가
  // 「아직 담은 봇이 없어요」를 한 번 본 뒤에야 로그인 안내로 바뀌었다.
  const isLoading = mine.isLoading || market.isPending;
  const isEmpty = !mine.isError && !isLoading && rows.length === 0;

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
      ) : isLoading ? (
        <MyBotsSkeleton />
      ) : rows.length === 0 && isSignedOut ? (
        // 담은 것도 없고 로그인도 안 됐다 — 이때만 로그인 안내가 목록 자리를 대신한다.
        // 담은 것이 있으면 아래 목록이 그대로 뜬다(마켓이 막혀도).
        <div data-testid="my-bots-signin">
          <EmptyState
            icon={LogIn}
            title="로그인하면 담은 봇을 볼 수 있어요"
            description="담은 봇이 무슨 봇인지는 로그인한 뒤에 읽어 올 수 있어요."
          />
        </div>
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
        <>
          {/* 목록을 지우지 않고 까닭만 적는다 — 담은 봇은 내 저장소의 것이라 계속 쓸 수 있다 */}
          {labelNotice && (
            <p
              className="text-pullim-slate-500 bg-pullim-slate-50 rounded-xl px-3 py-2.5 text-2xs"
              data-testid="my-bots-label-notice"
            >
              {labelNotice}
            </p>
          )}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="my-bots-list">
            {rows.map((row) => (
              <MyBotCard
                key={row.botId}
                row={row}
                bot={catalog.get(row.botId) ?? seedAsMarketItem(row.botId)}
                onRemove={() => remove.mutate(row.botId)}
                isRemoving={remove.isPending}
              />
            ))}
          </ul>
        </>
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
