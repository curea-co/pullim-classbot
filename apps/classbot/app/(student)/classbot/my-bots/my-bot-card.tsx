'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Chip } from '@/components/ui/chip';
import type { SelfBotRow } from '@/hooks/api/self-bots';
import type { MarketplaceBotItem } from '@/hooks/api/types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { formatAddedAt } from '@/components/classbot/marketplace';

/**
 * 담은 봇 한 칸.
 *
 * 담은 목록에는 `{ botId, addedAt }` 두 칸밖에 없다(계약 §3 — 그 모양이 미래 API 의 행
 * 모양이라 늘리지 않는다). 이름·아바타·과목은 전부 **마켓 목록에서 찾아 붙인다.**
 *
 * ## 못 찾았을 때 — 선생님이 공유를 내린 봇
 *
 * 내려간 봇은 마켓 목록에서 빠지므로 `bot` 이 null 로 온다. **그래도 목록에서 빼지 않고,
 * 고장 난 것처럼 그리지도 않는다.** 담기와 공유는 별개라 내려도 담은 학생의 봇은 계속
 * 돌아가는 게 설계고(청사진 §2), 여기서 카드를 지우면 그 설계가 화면에서 거짓이 된다.
 *
 * 대신 **아는 것만 적는다.** 이름이 없는 건 지금 당장 이름을 알 데가 없어서다 —
 * 상세 조회도 내려간 봇에는 404 를 준다. 그래서 제목 자리에 이름 대신 **상태**를 적었다:
 * 「지금은 마켓에 없는 봇」. 「불러오지 못했어요」로 적지 않은 이유는 그게 사실이 아니어서다.
 * 실패한 게 아니라 **찾을 자리에 없는 것**이고, 봇은 멀쩡하다.
 * 「선생님이 내렸어요」로 단정하지도 않는다 — 여기서 아는 것은 마켓에 없다는 것까지다.
 *
 * 봇 소개 링크도 이때는 안 그린다. 눌러 봐야 「지금은 이 봇을 볼 수 없어요」가 나오는
 * 막다른 길이다. 빼기만 남긴다.
 *
 * (P3 에서 담은 목록이 서버로 가면 그 응답이 봇 스냅샷을 함께 주는 게 맞다.
 *  그때 이 자리는 진짜 이름을 얻는다.)
 */
export function MyBotCard({
  row,
  bot,
  onRemove,
  isRemoving,
}: {
  row: SelfBotRow;
  /** 마켓에서 찾은 표시 데이터. 공유가 내려갔으면 null. */
  bot: MarketplaceBotItem | null;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  // 시그니처는 id 로도 잡힌다(`cb_001` → 수학) — 이름을 모르는 봇도 제 색을 쓴다.
  const sig = botSignature({ id: row.botId, subject: bot?.subject });
  const addedLabel = formatAddedAt(row.addedAt);
  const name = bot?.name ?? '지금은 마켓에 없는 봇';

  return (
    <li>
      <article
        className="bg-card flex h-full flex-col rounded-2xl border p-5"
        data-testid={`my-bot-${row.botId}`}
      >
        <div className="flex items-start gap-3">
          {/* ⚠️ 봇 색은 이 타일 한 곳만. 왼쪽 라이너를 덧대면 목록 hue 가 한도를 넘는다. */}
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: sig.hex }}
            aria-hidden
          >
            {bot?.avatarEmoji || '🤖'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-pullim-slate-900 truncate text-sm font-bold">{name}</h3>
            <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">
              {bot
                ? `${bot.teacherName}${bot.organization ? ` · ${bot.organization}` : ''}`
                : '공유가 내려가 마켓에서는 안 보여요. 담아 둔 봇은 그대로 남아 있어요.'}
            </p>
          </div>
        </div>

        {bot && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {bot.subject && <Chip tone="neutral">{bot.subject}</Chip>}
            {bot.grade && <Chip tone="outline">{bot.grade}</Chip>}
            {bot.tone && <Chip tone="outline">{bot.tone} 말투</Chip>}
          </div>
        )}

        {bot?.blurb && (
          <p className="text-pullim-slate-600 mt-3 line-clamp-2 text-xs leading-relaxed">
            {bot.blurb}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3">
          <span className="text-pullim-slate-400 text-2xs">
            {addedLabel ? `${addedLabel}에 담음` : ''}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {bot && (
              <Link
                href={`/classbot/discover/${row.botId}`}
                aria-label={`${bot.name} 봇 소개 보기`}
                className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-2xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                봇 소개
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
            {/*
              빼기는 되묻지 않는다 — 다시 담으면 그만이라 되돌릴 수 없는 일이 아니다.
              (대화 기록까지 지우게 되는 P4 부터는 이 판단을 다시 봐야 한다.)
            */}
            <button
              type="button"
              onClick={onRemove}
              disabled={isRemoving}
              aria-label={`${name} 빼기`}
              data-testid={`my-bot-remove-${row.botId}`}
              className="text-pullim-slate-400 hover:text-pullim-slate-600 focus-visible:ring-pullim-blue-400/50 min-h-11 shrink-0 rounded-lg px-2 text-2xs font-medium underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            >
              빼기
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
