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
 * 색은 이미 쓰던 토큰만 쓴다.
 *   - 도달 = blue, 미달 = 중립 slate, 미도달 = danger (예전 줄 배지가 쓰던 그대로)
 *   - 최근 접속은 중립 slate, 오늘 안 들어온 학생만 warn 으로 드러낸다
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
        offline ? 'bg-pullim-warn-bg text-pullim-warn' : 'bg-pullim-slate-100 text-pullim-slate-600',
        className,
      )}
      // 눈으로는 색이 말하고, 읽어주기로는 문장이 말한다 — 「오늘 안 들어옴」 카드와 같은 선을 읽는다
      aria-label={offline ? `오늘 안 들어옴 · 마지막 접속 ${label}` : `마지막 접속 ${label}`}
    >
      {label}
    </Badge>
  );
}

/**
 * 채점 대기 — 이 학생 앞으로 검수할 채점이 몇 건인지. 0건이면 「대기 없음」.
 *
 * 채점 허브의 학생 목록이 쓴다. 숫자를 세는 일은 이 배지가 하지 않는다 —
 * 교사 확정(store)을 얹은 뒤의 건수를 받아서 **말만 한다**.
 *
 * 색은 lemon 계열 — spec 11 § 9.1 이 검수 행동에 준 톤이다.
 * 도달 배지(blue)·최근 접속 배지(warn)와 색이 겹치지 않아야 한 줄에서 셋이 구분된다.
 */
export function GradingPendingBadge({ count, className }: { count: number; className?: string }) {
  const none = count === 0;
  return (
    <Badge
      className={cn(
        badgeShape,
        'justify-center',
        none ? 'bg-pullim-slate-100 text-pullim-slate-500' : 'bg-pullim-lemon-soft text-pullim-lemon-ink',
        className,
      )}
      aria-label={none ? '검수할 채점 없음' : `검수 대기 ${count}건`}
    >
      {none ? '대기 없음' : `대기 ${count}건`}
    </Badge>
  );
}
