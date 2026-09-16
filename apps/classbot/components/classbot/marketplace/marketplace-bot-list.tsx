'use client';

import type { ReactNode } from 'react';
import { LogIn, Store } from 'lucide-react';

import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceBots } from '@/hooks/api/marketplace';
import { ApiClientError } from '@/lib/api/client-fetch';
import { MarketplaceBotCard } from './marketplace-bot-card';

/**
 * 마켓에 올라온 봇 목록 — **학생 셸과 교사 셸이 같은 이 컴포넌트를 쓴다.**
 *
 * 목록 UI 를 두 벌 만들지 않는 이유는 손이 덜 가서가 아니다. 두 벌이면 카드에 무엇을
 * 적을지가 두 곳에서 갈리고, 「학생에게는 보이는데 교사에게는 안 보이는 값」이 생긴다 —
 * 마켓은 **같은 목록을 누가 보느냐**만 다른 화면이다.
 *
 * 셸마다 다른 것만 prop 으로 받는다:
 *  - 상세로 가는 경로(`detailHref`) — 셸이 갈려 있어 URL 이 다르다
 *  - 내가 올린 봇 표시(`ownBotIds`) — 교사 화면에서만 쓴다
 *  - 카드에서 바로 담기(`showSelfAdd`) — 학생 화면에서만 쓴다. 담기는 학생의 동작이다
 */
export function MarketplaceBotList({
  detailHref,
  ownBotIds,
  emptyDescription,
  headingAction,
  showSelfAdd = false,
}: {
  /** 봇 상세로 가는 길. 학생은 `/classbot/discover/…`, 교사는 `/teacher/marketplace/…`. */
  detailHref: (botId: string) => string;
  /** 「내 봇」 배지를 붙일 봇들. 교사 화면만 넘긴다. */
  ownBotIds?: ReadonlySet<string>;
  /** 빈 상태에서 **이 사람이** 할 수 있는 일 — 학생과 교사가 다르다. */
  emptyDescription: string;
  /** 목록 제목 오른쪽에 붙는 것(교사 화면의 「내 수업방」 링크 등). */
  headingAction?: ReactNode;
  /** 카드마다 담기 버튼을 붙인다. 학생 셸만 넘긴다. @default false */
  showSelfAdd?: boolean;
}) {
  const query = useMarketplaceBots();

  /*
    401 은 고장이 아니라 **로그인 안 한 상태**다. 마켓은 신원이 있어야 열리므로
    (마켓 계약 §2) 로그인 없이 들어오면 언제나 이 답이 온다 — prod 를 훑는
    prod-verify 도 그 상태다. 여기에 빨간 「불러오지 못했어요」를 띄우면 멀쩡한 화면이
    매번 고장 난 것처럼 보인다. 내 수업방 화면이 같은 401 을 같은 이유로 에러에서
    빼 두었다(`app/(student)/classbot/classroom/page.tsx`).
  */
  const isSignedOut = query.error instanceof ApiClientError && query.error.status === 401;

  if (query.isError && !isSignedOut) {
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
      {/*
        `description` 을 넘기지 않는다. 이 자리에 「선생님들이 직접 만들어 공유한 봇이에요.」가
        있었는데 바로 위 제목 「공유된 봇 N개」가 이미 같은 말이었다 — 화면이 이미 말하는
        부제는 적지 않는다(07 § 6.7). **되살리지 마라**: 학생·교사 두 셸이 이 한 벌을 쓰므로
        여기 한 줄이 두 화면에 동시에 되풀이로 돌아온다. 교사 쪽 설명은 페이지 헤더가 든다
        (`app/(teacher)/teacher/marketplace/page.tsx`).

        부제가 빠지면서 정렬도 바뀐다. `SectionHeading` 은 `sm:items-end` 라 제목+부제(44px)와
        44px 버튼을 밑선으로 맞췄는데, 이제 왼쪽이 제목 한 줄(20px)뿐이라 밑선에 맞추면 제목
        위로 24px 빈 칸이 생긴다(실측: 행 48→44px, 제목 offsetTop 0→24). 여기서 가운데로 맞춘다.

        ⚠ 이건 **이 호출처만** 고친 것이다. `SectionHeading` 은 부제 없이 action 만 있는 모양을
        늘 `sm:items-end` 로 그리고, 같은 모양이 지금 셋이다(교사 홈 「먼저 볼 학생」·
        `class-reach-roster` 「학생 한 줄 보기」·여기). 나머지 둘은 이 PR 이전부터 그랬던
        자리라 손대지 않았다 — `components/shell/*` 는 이 리포에서 사용자 확인 사항이라
        (`apps/classbot/CLAUDE.md § 5`) 셋을 한 번에 고치는 건 별건으로 올린다.
      */}
      <SectionHeading
        className="sm:items-center"
        title={query.isPending || isSignedOut ? '공유된 봇' : `공유된 봇 ${bots.length}개`}
        action={headingAction}
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : isSignedOut ? (
        <div data-testid="marketplace-signin">
          <EmptyState
            icon={LogIn}
            title="로그인하면 봇 마켓을 볼 수 있어요"
            description="선생님들이 공유한 봇은 로그인한 뒤에 둘러볼 수 있어요."
          />
        </div>
      ) : bots.length === 0 ? (
        <div data-testid="marketplace-empty">
          <EmptyState
            icon={Store}
            title="아직 공유된 봇이 없어요"
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
              isMine={ownBotIds?.has(bot.botId) ?? false}
              showSelfAdd={showSelfAdd}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
