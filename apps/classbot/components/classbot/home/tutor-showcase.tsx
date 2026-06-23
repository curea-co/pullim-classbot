'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getBotHomePreview } from '@/lib/mock/classbot-home-preview';
import { SectionHeading } from '@/components/shell/section-heading';
import type { ClassBot, StudentEnrollment } from '@/lib/mock';

type BotSlot = { bot: ClassBot; enrollment: StudentEnrollment };

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
  const sig = botSignature(slot.bot);
  const preview = getBotHomePreview(slot.bot.id);
  const hasNewToday = !isLive && (preview?.lastAt.startsWith('오늘') ?? false);

  return (
    <li>
      <Link
        href={`/classbot/chat?bot=${slot.bot.id}`}
        className={cn(
          'group bg-card focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex min-h-11 gap-3 rounded-xl border border-l-4 p-3 transition-all shadow-pullim-xs',
          isLive
            ? 'border-pullim-danger/40 bg-pullim-danger/5 hover:bg-pullim-danger/10'
            : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40',
        )}
        style={{ borderLeftColor: sig.hex }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
              isLive && 'ring-pullim-lemon ring-2 pullim-anim-bot-breath',
            )}
            style={{ backgroundColor: sig.hex }}
          >
            {slot.bot.avatarEmoji}
          </span>
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
      <SectionHeading
        title="내 튜터"
        action={<span className="text-pullim-slate-500 text-xs font-bold">{bots.length}명</span>}
      />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
        {bots.map((slot) => (
          <TutorCard
            key={slot.bot.id}
            slot={slot}
            isLive={Boolean(activeLive[slot.bot.id])}
          />
        ))}
        {/* + 봇 찾기 card */}
        <li>
          <Link
            href="/classbot/discover"
            className="border-pullim-slate-200 text-pullim-slate-400 hover:border-pullim-blue-300 hover:text-pullim-blue-600 focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed p-3 text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">＋</span>
            봇 찾기
          </Link>
        </li>
      </ul>
    </section>
  );
}
