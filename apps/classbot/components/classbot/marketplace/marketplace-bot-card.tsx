'use client';

import Link from 'next/link';
import { Sparkles, UserRound, Users } from 'lucide-react';

import { BotAvatar } from '@/components/classbot/bot-avatar';
import { Chip } from '@/components/ui/chip';
import type { MarketplaceBotItem } from '@/hooks/api/types';
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
 * **공식 봇은 칸 넷이 갈린다**(spec `03 § 4.13.1` 「카드에서 공식 봇이 걷는 칸」).
 * 풀림이 제공하는 봇에는 **소유자가 없어서**(`class_bots.teacher_id` 가 NULL) 교사 봇을
 * 전제로 짜인 칸을 그대로 두면 카드가 사실이 아닌 것을 말한다:
 *  - **교사 이름 · 소속** — 「풀림 공식」 배지로 대신한다. 사람 이름 자리에 회사를 앉히지 않는다.
 *  - **「내 봇」 배지** — 붙지 않는다. `ownBotIds` 는 「내가 게시한 봇」이라 소유자 없는 봇은
 *    애초에 거기 못 든다 — **자동으로 그렇게 되지만 그게 의도다.** `isMine` 조건을 공식 봇
 *    때문에 손볼 일이 아니라는 뜻으로 적어 둔다.
 *  - **「…에 올림」** — 적지 않는다. 게시한 사람이 없다. 값은 있지만(시드가 넣은 날) 그 날짜는
 *    「누가 언제 올렸다」를 뜻하지 않아 읽는 사람을 속인다.
 *  - **참여 학생 수** — 같게 세되 **0명이면 칸을 비운다.** 「0명」은 갓 선 봇의 정상 상태지
 *    카드가 전할 정보가 아니다. 교사 봇은 종전대로 0명도 적는다 — 게시한 본인에게는
 *    「아직 아무도 안 들어왔다」가 쓸모 있는 값이라서다.
 *
 * ⚠️ 봇 배지는 `BotAvatar` 한 곳뿐이고 브랜드 블루 한 색이다. 왼쪽 컬러 라이너나 과목별
 * 색 칩을 덧대지 마라 — 목록에 봇이 여럿 깔리므로, 봇마다 hue 를 주면 그 자리에서
 * [08 § 14.1] 한도(≤ 3종)를 넘는다. 「어느 봇인가」는 바로 옆 이름이 이미 말한다.
 * 「풀림 공식」 배지가 이 한도를 늘리지 않는 이유도 같은 자리에서 읽힌다 — 봇마다 갈리는
 * 색이 아니라 **이 리포에 이미 있는 `tone="info"` 한 벌**(「내 봇」 배지와 같은 것)을 그대로
 * 쓴다. 둘은 한 카드에서 만나지 않는다(공식 봇에는 「내 봇」이 안 붙는다).
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
          <BotAvatar subject={bot.subject} name={bot.name} size="lg" />
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
            {bot.isOfficial ? (
              /*
                공식 봇에는 만든 선생님이 없다 — 이 자리에 `teacherName`(「풀림 공식」)과
                `organization`(「풀림」)을 그대로 흘리면 회사 이름이 사람 이름 행세를 한다.
                배지로 바꿔 「이건 사람이 아니라 풀림이 낸 봇」이라고 곧장 말한다.
                보이는 글자는 두 어절이라(07 § 6.6) 뜻이 좀 줄어드는데, 그건 낭독기 쪽에
                한 마디를 더 달아 메운다.
              */
              <p className="mt-1">
                <Chip tone="info" data-testid="marketplace-card-official">
                  <Sparkles aria-hidden />
                  풀림 공식<span className="sr-only"> — 풀림이 제공하는 공식 봇이에요</span>
                </Chip>
              </p>
            ) : (
              /*
                `teacherName` 은 표시 이름 그대로다 — 「선생님」을 여기서 덧붙이지 않는다.
                이 앱의 교사 이름에는 그 호칭이 이미 들어 있어(실측: `김수학 선생님`)
                한 번 더 붙이면 「김수학 선생님 선생님」이 된다.
              */
              <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">
                {bot.teacherName}
                {bot.organization ? ` · ${bot.organization}` : ''}
              </p>
            )}
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
            {/* 공식 봇에는 올린 사람이 없다 — 시드가 넣은 날을 「올림」으로 읽히게 두지 않는다. */}
            {!bot.isOfficial && publishedLabel && <span>{publishedLabel}에 올림</span>}
            {/* 공식 봇의 0명은 갓 선 봇의 정상 상태라 비운다. 교사 봇은 0명도 제 값이라 적는다. */}
            {(!bot.isOfficial || bot.enrolledCount > 0) && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">참여 학생 </span>
                {bot.enrolledCount}명
              </span>
            )}
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
