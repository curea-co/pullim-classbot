'use client';

import Link from 'next/link';
import { UserRound, Users } from 'lucide-react';

import { Chip } from '@/components/ui/chip';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { formatPublishedAt } from './format';
import { SelfAddButton } from './self-add-button';

/**
 * 마켓에 올라온 봇 한 칸 — 학생 화면과 교사 화면이 **같은 카드**를 쓴다.
 *
 * 카드가 답하는 것은 「이게 누구의 무슨 봇인가」이고, 학생 화면에서는 여기서 **담기**까지
 * 한다(`showSelfAdd`). 담기를 상세에만 두지 않은 이유: 목록을 훑다가 마음에 든 봇을
 * 담으려고 매번 상세를 열었다 닫아야 하면 훑는 흐름이 끊긴다. 담기는 되돌릴 수 있는
 * 가벼운 동작이라(누르면 바로 빠진다) 훑는 자리에 있어도 과하지 않다.
 * 교사 화면은 이 prop 을 안 넘겨 종전 그대로 — 담기는 학생의 동작이다.
 *
 * 그래서 카드 통째를 `<Link>` 로 감싸던 것을 **덮개 링크**로 바꿨다. 링크 안에 버튼을
 * 넣을 수 없어서다. 카드는 `<article>` 이고, 그 위에 `absolute inset-0` 링크 하나가 깔려
 * 카드 아무 데나 눌러도 상세로 간다(겉보기·손맛은 종전과 같다). 담기 버튼만 `relative z-10`
 * 으로 그 위에 뜬다.
 * 덮개 링크는 글자를 감싸지 않으니 **이름을 `aria-label` 로 준다** — 그러지 않으면
 * 낭독기에 이름 없는 링크가 된다.
 *
 * ⚠️ 봇 시그니처 색은 **아바타 타일 한 곳에만** 쓴다. 왼쪽 컬러 라이너를 덧대지 마라 —
 * 목록에 5색이 깔리면 화면 hue 가 [08 § 14.1] 한도(≤ 3종)를 넘는다. 학생 카드에서
 * 방금 걷어낸 실수라 여기서 다시 만들지 않는다.
 */
export function MarketplaceBotCard({
  bot,
  href,
  isMine = false,
  showSelfAdd = false,
}: {
  bot: MarketplaceBotItem;
  /** 상세로 가는 길. 셸마다 달라서(학생 `/classbot/discover/…`) 바깥에서 준다. */
  href: string;
  /** 교사 화면에서 「내가 올린 봇」 표시. 학생 화면에서는 언제나 false. @default false */
  isMine?: boolean;
  /** 카드에서 바로 담게 한다. 학생 셸만 넘긴다. @default false */
  showSelfAdd?: boolean;
}) {
  const sig = botSignature({ id: bot.botId, subject: bot.subject });
  const publishedLabel = formatPublishedAt(bot.publishedAt);

  return (
    <li>
      <article className="bg-card hover:bg-pullim-slate-50/60 has-[a:focus-visible]:ring-pullim-blue-400/50 relative h-full rounded-2xl border p-5 transition-colors has-[a:focus-visible]:ring-2">
        <Link
          href={href}
          aria-label={`${bot.name} 봇 소개 보기`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none"
          data-testid={`marketplace-card-${bot.botId}`}
        />

        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: sig.hex }}
            aria-hidden
          >
            {bot.avatarEmoji || '🤖'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-pullim-slate-900 truncate text-sm font-bold">{bot.name}</h3>
              {isMine && (
                <Chip tone="info" className="shrink-0">
                  <UserRound aria-hidden />
                  내 봇
                </Chip>
              )}
            </div>
            {/*
              `teacherName` 은 표시 이름 그대로다 — 「선생님」을 여기서 덧붙이지 않는다.
              이 앱의 교사 이름에는 그 호칭이 이미 들어 있어(실측: `김수학 선생님`)
              한 번 더 붙이면 「김수학 선생님 선생님」이 된다.
            */}
            <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">
              {bot.teacherName}
              {bot.organization ? ` · ${bot.organization}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {bot.subject && <Chip tone="neutral">{bot.subject}</Chip>}
          {bot.grade && <Chip tone="outline">{bot.grade}</Chip>}
          {bot.tone && <Chip tone="outline">{bot.tone} 말투</Chip>}
        </div>

        {bot.blurb && (
          <p className="text-pullim-slate-600 mt-3 line-clamp-2 text-xs leading-relaxed">
            {bot.blurb}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="text-pullim-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
            {publishedLabel && <span>{publishedLabel}에 올림</span>}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">참여 학생 </span>
              {bot.enrolledCount}명
            </span>
          </div>
          {showSelfAdd && (
            <SelfAddButton
              botId={bot.botId}
              botName={bot.name}
              size="sm"
              className="relative z-10 ml-auto"
            />
          )}
        </div>
      </article>
    </li>
  );
}
