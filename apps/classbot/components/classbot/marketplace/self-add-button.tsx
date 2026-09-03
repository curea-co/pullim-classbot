'use client';

import { Check, Plus } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useAddSelfBot, useIsSelfAdded, useMySelfBots, useRemoveSelfBot } from '@/hooks/api/self-bots';
import { cn } from '@/lib/utils';

/**
 * 담기 / 담음 토글 — 마켓 목록 카드와 봇 상세가 **같은 이 버튼**을 쓴다.
 *
 * 이 버튼이 하는 일은 **하나**다: 봇을 「내가 담은 봇」에 둔다. 담은 학생은 그 봇을
 * 혼자 쓴다 — 1:1 대화와 자기 기록. 그게 전부다.
 *
 * 하지 **않는** 일도 하나로 못 박아 둔다: **반에 넣지 않는다.** 반 소속·과제·명단은
 * 참여 코드가 여는 것이고 이 버튼은 그 길을 대신하지도 막지도 않는다. 담기와 참여 코드는
 * 크고 작은 관계가 아니라 **다른 것**이라, 어느 쪽도 다른 쪽의 조건으로 적지 않는다.
 *
 * 담음 상태에서 누르면 뺀다. 그래서 보이는 글자(「담음」)와 낭독기가 읽는 이름(「… 빼기」)이
 * 다르다 — 눈으로는 **지금 상태**를, 낭독기로는 **누르면 벌어질 일**을 말한다.
 * 되돌릴 수 있는 동작이라 되묻지 않는다.
 */
export function SelfAddButton({
  botId,
  botName,
  size = 'md',
  className,
}: {
  botId: string;
  /** 낭독기가 읽을 이름. 목록에는 버튼이 여럿이라 「담기」만으로는 어느 봇인지 모른다. */
  botName: string;
  /** 목록 카드는 `sm`, 봇 상세는 `md`. @default 'md' */
  size?: 'sm' | 'md';
  className?: string;
}) {
  const added = useIsSelfAdded(botId);
  const add = useAddSelfBot();
  const remove = useRemoveSelfBot();
  // 담은 목록은 하이드레이션 전까지 비어 보인다. 그동안 「담기」를 그리면 이미 담은 봇이
  // 잠깐 안 담긴 것처럼 깜빡인다 — 틀린 상태를 보이느니 자리만 잡아 둔다.
  const { isLoading } = useMySelfBots();

  if (isLoading) {
    return (
      <Skeleton
        className={cn('h-11 rounded-full', size === 'md' ? 'w-24' : 'w-20', className)}
        aria-hidden
      />
    );
  }

  const isPending = add.isPending || remove.isPending;
  const Icon = added ? Check : Plus;

  return (
    <button
      type="button"
      onClick={() => (added ? remove.mutate(botId) : add.mutate(botId))}
      aria-pressed={added}
      aria-label={`${botName} ${added ? '빼기' : '담기'}`}
      disabled={isPending}
      data-testid={`self-add-${botId}`}
      className={cn(
        'focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
        size === 'md' ? 'px-5 text-sm' : 'px-4 text-2xs',
        added
          ? 'bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100'
          : 'bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white',
        className,
      )}
    >
      <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden />
      {added ? '담음' : '담기'}
    </button>
  );
}
