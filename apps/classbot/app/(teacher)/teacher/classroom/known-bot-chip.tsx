'use client';

import { Bot } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import type { ClassDto } from '@/lib/api/classbot-dto';

/**
 * 반의 봇 칩 — 반 카드(`classroom-workspace.tsx`)와 반 상세 머리(`[id]/class-detail.tsx`)가 같은 칩을 그린다.
 *
 * 원천은 반 상세 문이 주는 `ClassDto` 하나다(`useClassDetail` — `GET /classbot/classes/:classId` · 반 생성·봇 할당·
 * 코드 재발급 응답도 같은 캐시에 쓴다). **모른다 · 없다 · 이 봇** 셋을 그대로 그린다: 모르면 칩을 비운다
 * (빈 칩은 「값이 비었다」가 아니라 「모른다」로 읽힌다), 없으면 「봇 없음」, 있으면 아바타 + 이름.
 * 「모른다」가 남는 구간은 이제 **읽는 중과 실패**뿐이다.
 *
 * *(`[2026-09-19 정정]` 종전에는 「`GET /bots*` 의 옛 `profile` 로 단정하면 `POST /classes` 로 만든 반은
 * profile 행이 영영 없어 `classes.bot_id` 가 차 있어도 늘 「봇 없음」이 된다」를 원천이 하나인 이유로 적었다.
 * **pullim-api #679 가 그 이유를 무너뜨렸다** — 이제 `profile` 은 붙은 봇이 있을 때만 실리고 카드가 `botId` 도
 * 준다. #355 리뷰 S1 이 막은 「같은 화면의 「봇」 탭과 반대 말」은 그대로 유효하지만, **막는 방법은 이제
 * 원천을 하나로 두는 것**이다 — 두 문에서 칩을 지으면 늦고 빠른 응답이 서로 다른 말을 한다.
 * 카드 한 장으로 칩을 짓는 쪽으로 옮기는 일은 `classroom-workspace.tsx` 의 N+1 정리와 같은 별건이다.)*
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
