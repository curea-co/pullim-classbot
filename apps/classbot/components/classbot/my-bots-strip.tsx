'use client';

import Link from 'next/link';

import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBots } from '@/hooks/api/read/use-student-reads';
import type { BotReadRow } from '@/hooks/api/read/types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';

/**
 * 내 클래스봇 가로 strip — Phase 7 Stage 2: `GET /api/bots`(실DB·인증) 배선.
 *
 * mock(`getMyBots`) 제거. 로그인 세션 명의로 수강 중인 봇만 표시한다.
 * 미로그인은 로그인 게이트(D1 로그인월), 로딩/빈/에러를 각각 처리한다.
 *
 * NOTE: 라이브 in-flight 표시(`isLiveNow`)는 봇 행의 `isLive` 컬럼을 쓴다.
 * 실시간 live 스토어 연동은 Stage 2 후속(live) 슬라이스 범위다.
 */
export function MyBotsStrip() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useMyBots();

  return (
    <section>
      <header className="mb-2 flex items-end justify-between">
        <h2 className="text-pullim-slate-900 text-sm font-bold tracking-tight">
          내 클래스봇
        </h2>
        {data && (
          <span className="text-pullim-slate-400 font-mono text-[10px]">
            {data.bots.length}명
          </span>
        )}
      </header>

      {isUnauthenticated ? (
        <ReadLoginGate label="내 클래스봇" />
      ) : isError ? (
        <ReadErrorState onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <ul className="grid grid-cols-5 gap-1.5" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-[68px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : (
        <BotSlots bots={data.bots} />
      )}
    </section>
  );
}

function BotSlots({ bots }: { bots: BotReadRow[] }) {
  // 5개 미만은 빈 슬롯으로 채워 strip 형태 유지.
  const slots = Array.from({ length: Math.max(5, bots.length) }, (_, i) => bots[i] ?? null);
  return (
    <ul className="grid grid-cols-5 gap-1.5">
      {slots.map((bot, i) =>
        bot ? (
          <BotStripItem key={bot.id} bot={bot} />
        ) : (
          <EmptyBotSlot key={`empty-${i}`} />
        ),
      )}
    </ul>
  );
}

function BotStripItem({ bot }: { bot: BotReadRow }) {
  const sig = botSignature(bot);
  const isLiveNow = bot.isLive;

  return (
    <li>
      <Link
        href={`/classbot/chat?bot=${bot.id}`}
        className={cn(
          'group flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all',
          isLiveNow
            ? 'border-pullim-danger/40 bg-pullim-danger/5'
            : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40',
        )}
      >
        <div className="relative">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
              isLiveNow && 'ring-pullim-lemon ring-2 pullim-anim-bot-breath',
            )}
            style={{ backgroundColor: sig.hex }}
          >
            {bot.avatarEmoji}
          </span>
          {isLiveNow && (
            <span className="bg-pullim-danger absolute -top-1 -right-1 inline-flex h-4 items-center gap-0.5 rounded-full px-1 text-[9px] font-bold text-white">
              <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
              LV
            </span>
          )}
        </div>
        <div className="text-pullim-slate-900 line-clamp-1 w-full text-[11px] font-bold leading-tight">
          {bot.name}
        </div>
      </Link>
    </li>
  );
}

function EmptyBotSlot() {
  return (
    <li>
      <Link
        href="/classbot/discover"
        className="border-pullim-slate-200 text-pullim-slate-300 hover:border-pullim-blue-300 hover:text-pullim-blue-500 flex h-full min-h-[68px] flex-col items-center justify-center rounded-xl border border-dashed transition-colors"
      >
        <span className="text-lg leading-none">＋</span>
        <span className="text-[10px] font-semibold mt-0.5">추가</span>
      </Link>
    </li>
  );
}
