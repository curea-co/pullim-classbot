'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getBotHomePreview } from '@/lib/mock/classbot-home-preview';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { SectionHeading } from '@/components/shell/section-heading';
import type { ClassBot } from '@/lib/mock';

/**
 * 이 카드가 그리는 데 필요한 것은 **봇 하나와, 있다면 그 봇이 걸린 반**이다.
 *
 * 예전엔 `enrollment` 까지 받았는데 카드가 그 값을 한 번도 읽지 않았고, 대신 「반에 속한
 * 봇」만 이 자리에 올 수 있다는 뜻이 돼서 **마켓에서 담은 봇(반 관계가 없다)이 홈에
 * 못 올라왔다.** 담은 봇도 학생에게는 「내 봇」이므로 그 제약을 뗀다 —
 * `StudentBotSlot`(반 칸·담은 칸)이 이 모양을 만족한다.
 *
 * `classId` 를 읽는 이유는 대화의 단위가 반이라서다(완성 설계 § 6.2 · 해소 3 · 계획 PR 5a).
 * 반 칸은 `/classbot/chat?classId=` 로 **그 반의 대화**를 열고, key 도 반으로 잡는다 — 같은 봇이
 * 두 반에 걸린 학생에게서 `bot.id` key 가 겹치던 자리다. 담은 봇은 반이 없어 종전대로 `?bot=`.
 */
type BotSlot = { bot: ClassBot; classId?: string | null };

/** 칸의 목적지와 key — `lib/store/mode-bots.ts` `studentBotSlotKey` 와 같은 규칙(반은 반으로, 담은 봇은 봇으로). */
function slotTarget(slot: BotSlot): { key: string; href: string } {
  return slot.classId
    ? { key: `class:${slot.classId}`, href: `/classbot/chat?classId=${encodeURIComponent(slot.classId)}` }
    : { key: `self:${slot.bot.id}`, href: `/classbot/chat?bot=${encodeURIComponent(slot.bot.id)}` };
}

function LiveBadge() {
  return (
    <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-micro font-bold text-white">
      <span className="bg-white pullim-anim-live-pulse inline-block h-1.5 w-1.5 rounded-full" />
      LIVE
    </span>
  );
}

function NewActivityDot() {
  return (
    <span className="bg-pullim-blue-500 inline-block h-2 w-2 rounded-full ring-2 ring-white" />
  );
}

function TutorCard({ slot, isLive }: { slot: BotSlot; isLive: boolean }) {
  const preview = getBotHomePreview(slot.bot.id);
  const hasNewToday = !isLive && (preview?.lastAt.startsWith('오늘') ?? false);

  return (
    <li>
      <Link
        href={slotTarget(slot).href}
        className={cn(
          'group bg-card focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex h-full min-h-11 gap-3 rounded-xl border p-3 transition-all shadow-pullim-xs',
          isLive
            ? 'border-pullim-danger/40 bg-pullim-danger/5 hover:bg-pullim-danger/10'
            : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40',
        )}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <BotAvatar
            subject={slot.bot.subject}
            name={slot.bot.name}
            size="lg"
            // LIVE 표시는 이미 위험색 테두리 + LiveBadge 가 한다 — 링까지 다른 색을 더하지 않는다
            className={cn(isLive && 'ring-pullim-danger ring-2 pullim-anim-bot-breath')}
          />
          {isLive && (
            <span className="absolute -top-1 -right-1">
              <LiveBadge />
            </span>
          )}
          {hasNewToday && (
            <span className="absolute -top-0.5 -right-0.5">
              <NewActivityDot />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-pullim-slate-900 text-sm font-bold leading-tight truncate">
              {slot.bot.name}
            </span>
            {isLive ? (
              <LiveBadge />
            ) : hasNewToday ? (
              <span className="text-pullim-blue-600 text-2xs font-semibold shrink-0">{preview?.lastAt}</span>
            ) : preview?.lastAt ? (
              <span className="text-pullim-slate-400 text-2xs shrink-0">{preview.lastAt}</span>
            ) : null}
          </div>
          <div className="text-pullim-slate-500 text-2xs mt-0.5">{slot.bot.subject}</div>
          {preview?.lastMessage && (
            <p className="text-pullim-slate-400 mt-1 line-clamp-1 text-xs">
              {preview.lastMessage}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export function TutorShowcase({
  bots,
  activeLive,
}: {
  bots: BotSlot[];
  activeLive: Record<string, unknown>;
}) {
  return (
    <section>
      <SectionHeading title="내 봇" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
        {bots.map((slot) => (
          <TutorCard
            key={slotTarget(slot).key}
            slot={slot}
            isLive={Boolean(activeLive[slot.bot.id])}
          />
        ))}
        {/* + 봇 찾기 card */}
        <li>
          <Link
            href="/classbot/discover"
            className="border-pullim-slate-200 text-pullim-slate-400 hover:border-pullim-blue-300 hover:text-pullim-blue-600 focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex h-full min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed p-3 text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">＋</span>
            봇 찾기
          </Link>
        </li>
      </ul>
    </section>
  );
}
