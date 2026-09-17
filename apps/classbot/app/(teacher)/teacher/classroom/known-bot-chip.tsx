'use client';

import { Bot } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import type { ClassDto } from '@/lib/api/classbot-dto';

/**
 * 반의 봇 칩 — 반 카드(`classroom-workspace.tsx`)와 반 상세 머리(`[id]/class-detail.tsx`)가 같은 칩을 그린다.
 *
 * 원천은 반 상세 문이 주는 `ClassDto` 하나다(`useClassDetail` — `GET /classbot/classes/:classId` · 반 생성·봇 할당·
 * 코드 재발급 응답도 같은 캐시에 쓴다). 옛 `profile`(bot == class · `GET /bots*`)로 「봇 없음」을 단정하지 않는다 —
 * `POST /classes` 로 만든 반은 profile 행이 영영 없어 `classes.bot_id` 가 차 있어도 늘 「봇 없음」이 되고, 같은 화면의
 * 「봇」 탭과 반대 말을 하게 된다(#355 리뷰 S1).
 * 그래서 **모른다 · 없다 · 이 봇** 셋을 그대로 그린다: 모르면 칩을 비운다(빈 칩은 「값이 비었다」가 아니라 「모른다」로
 * 읽힌다), 없으면 「봇 없음」, 있으면 아바타 + 이름. 「모른다」가 남는 구간은 이제 **읽는 중과 실패**뿐이다.
 */
export function KnownBotChip({
  known,
  'data-testid': testId,
}: {
  /** `useClassDetail().data` — `undefined` 모른다(읽는 중·실패) · `bot: null` 없다. */
  known: ClassDto | undefined;
  'data-testid'?: string;
}) {
  if (known === undefined) return null;
  if (known.bot === null) {
    return (
      <Chip tone="neutral" data-testid={testId}>
        <Bot aria-hidden />
        봇 없음
      </Chip>
    );
  }
  return (
    <Chip tone="outline" data-testid={testId}>
      <Bot aria-hidden />
      <span>
        <span className="sr-only">봇 </span>
        {known.bot.avatarEmoji ? `${known.bot.avatarEmoji} ` : ''}
        {known.bot.name}
      </span>
    </Chip>
  );
}
