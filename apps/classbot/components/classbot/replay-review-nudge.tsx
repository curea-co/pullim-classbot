'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { Replay } from '@/lib/mock';
import { getReplayWeakPoints } from '@/lib/mock/classbot-replay-recap';
import { useReplayStore } from '@/lib/store/replay';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 리플레이 목록 "복습할 거리 N" 넛지 — spec §6 (replay depth PR-B 선택 항목).
 *
 * 모든 리플레이의 미해결 약점(`getReplayWeakPoints` − resolved 스토어)을 합산해,
 * 약점이 가장 많은 리플레이의 recap 으로 링크한다. 해결 상태는 persist 스토어라
 * `useStoresHydrated` 이후에만 렌더(플래시/SSR 불일치 방지, spec §8). 0개면 렌더 안 함.
 */
export function ReplayReviewNudge({ replays }: { replays: Replay[] }) {
  const hydrated = useStoresHydrated(useReplayStore);
  const resolvedMap = useReplayStore((s) => s.resolvedWeakPoints);

  if (!hydrated) return null;

  let total = 0;
  let target: { replay: Replay; open: number } | null = null;
  for (const replay of replays) {
    const resolved = resolvedMap[replay.id] ?? [];
    const open = getReplayWeakPoints(replay).filter((w) => !resolved.includes(w.key)).length;
    total += open;
    if (open > 0 && (!target || open > target.open)) target = { replay, open };
  }
  if (total === 0 || !target) return null;

  return (
    <Link
      href={`/classbot/replay/${target.replay.id}`}
      className="bg-pullim-blue-50 border-pullim-blue-200 hover:border-pullim-blue-400 flex min-h-11 items-center gap-2.5 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400"
    >
      <span className="bg-pullim-blue-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pullim-blue-700 block text-xs font-bold">
          복습할 거리 {total}개가 기다리고 있어요
        </span>
        <span className="text-pullim-slate-500 block truncate text-2xs">
          {target.replay.title} 회고에서 막힌 곳부터 다시 풀어봐요
        </span>
      </span>
      <ArrowRight className="text-pullim-blue-600 h-4 w-4 shrink-0" />
    </Link>
  );
}
