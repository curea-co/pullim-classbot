'use client';

import { Badge } from '@/components/ui/badge';
import {
  isOfflineToday, lastSeenText, reachBadge, reachBadgeLabels,
  type MonitoredStudent, type ReachBadge,
} from '@/lib/mock/classbot-monitoring';
import { cn } from '@/lib/utils';

/**
 * 학생 한 줄에 붙는 배지 두 벌 — 도달 상태와 최근 접속.
 *
 * ⚠ **2026-09-18 현재 이 배지를 그리는 화면이 없다.** 쓰던 곳은 교사 홈 「먼저 볼 학생」(#369 가 걷음)과
 * 학생 목록·리포트 센터 명단(#370·이 PR 이 걷음) 셋이었고, 셋 다 지어낸 학생 스무 명을 세우던 자리였다.
 * 지금 남은 소비처는 `roster-columns.tsx` 하나이고 그 열들을 쓰는 화면도 없다.
 * **판정의 원천(`reachBadge`·`isOfflineToday`)이 목이라 새로 읽지 마라** — 정본이 주는 신호는
 * 규칙으로 잡은 다섯 종이고, 그 배지는 `components/classbot/monitoring/signal-badges.tsx` 가 따로 그린다.
 *
 * 남겨 둔 까닭은 판정을 한 곳에 묶어 둔 값어치 때문이다 — 도달을 두 군데서 따로 세면 같은 학생이
 * 화면마다 다르게 읽힌다. 서버에 도달·활동 원천이 생기는 날 이 모양을 그대로 되살린다.
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

/**
 * 채점 대기 — 이 학생 앞으로 검수할 채점이 몇 건인지. 0건이면 「대기 없음」.
 *
 * 채점 허브의 학생 목록이 쓰던 배지다 — 그 화면은 #370 이 걷었고 지금 이 배지를 그리는 곳은 없다.
 * 숫자를 세는 일은 이 배지가 하지 않는다 — 건수를 받아서 **말만 한다**.
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
