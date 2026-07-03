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
 *
 * 라우팅은 호출자가 결정한다 — 기본은 학생 sent 상세(`/classbot/replay/[id]`)이고,
 * 데모 표면처럼 다른 라우트(`/replay/demo/[id]`)를 쓰는 호출자는 `getHref` 를 주입한다.
 * (데모 시드 모듈을 여기서 직접 import 하지 않는다 — 데이터 격리 유지, Codex #181 R4)
 */
export function ReplayReviewNudge({
  replays,
  getHref = (r) => `/classbot/replay/${r.id}`,
}: {
  replays: Replay[];
  /** 타깃 리플레이 → 상세 경로. 기본 = 학생 sent 상세 라우트. */
  getHref?: (replay: Replay) => string;
}) {
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
      href={getHref(target.replay)}
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
