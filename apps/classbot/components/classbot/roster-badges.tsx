'use client';

import { Badge } from '@/components/ui/badge';
import {
  isOfflineToday, lastSeenText, reachBadge, reachBadgeLabels,
  type MonitoredStudent, type ReachBadge,
} from '@/lib/mock/classbot-monitoring';
import { cn } from '@/lib/utils';

/**
 * 학생 한 줄에 붙는 배지 두 벌 — 교사 홈(「먼저 볼 학생」)과 관제소 명단이 **같은 것**을 쓴다.
 *
 * 두 화면의 줄 모양은 다르다(홈은 짧게 몇 명만, 관제소는 열이 많고 20줄).
 * 그래도 상태를 말하는 방식은 하나여야 한다 — 같은 학생이 화면마다 다르게 읽히면 안 되니까.
 * 그래서 줄 자체가 아니라 **배지를 공유**한다. 판정은 `reachBadge` · `isOfflineToday` 한 곳에서만 한다.
 *
 * 색은 브랜드 블루 · 중립 슬레이트 · 위험 빨강 셋만 쓴다 ([08 § 1.3] success/warn deprecated).
 *   - 도달 = blue, 미달 = 중립 slate, 미도달 = danger (예전 줄 배지가 쓰던 그대로)
 *   - 최근 접속은 채운 회색 배지, **오늘 안 들어온 학생만 외곽선 + 굵은 글씨**로 떠오르게 둔다.
 *     20줄이 깔린 명단에서 채운 면보다 빈 면이 더 눈에 걸린다 — 색을 하나 더 쓰지 않고 갈리는 법.
 */

const reachToneClass: Record<ReachBadge, string> = {
  reached:       'bg-pullim-blue-100 text-pullim-blue-700',
  'depth-short': 'bg-pullim-slate-100 text-pullim-slate-700',
  'not-reached': 'bg-pullim-danger-bg text-pullim-danger',
};

/** 두 배지가 같은 크기·같은 모양이어야 줄이 세로로 정렬된다 */
const badgeShape = 'h-auto rounded-full px-2 py-0.5 text-2xs font-bold';

/** 도달 상태 3값 — 도달 · 미달 · 미도달. 셋은 서로 배타다. */
export function StudentReachBadge({ student, className }: { student: MonitoredStudent; className?: string }) {
  const value = reachBadge(student);
  return (
    <Badge className={cn(badgeShape, 'justify-center', reachToneClass[value], className)}>
      {reachBadgeLabels[value]}
    </Badge>
  );
}

/** 최근 접속 — n분 전 · n시간 전 · n일 전, 30일이 지나면 「오래됨」 */
export function LastSeenBadge({ student, className }: { student: MonitoredStudent; className?: string }) {
  const offline = isOfflineToday(student);
  const label = lastSeenText(student);
  return (
    <Badge
      className={cn(
        badgeShape,
        'justify-center font-mono',
        offline
          ? 'text-pullim-slate-900 ring-pullim-slate-400 bg-transparent font-bold ring-1 ring-inset'
          : 'bg-pullim-slate-100 text-pullim-slate-600',
        className,
      )}
      // 눈으로는 테두리가 말하고, 읽어주기로는 문장이 말한다 — 「오늘 안 들어옴」 카드와 같은 선을 읽는다
      aria-label={offline ? `오늘 안 들어옴 · 마지막 접속 ${label}` : `마지막 접속 ${label}`}
    >
      {label}
    </Badge>
  );
}
