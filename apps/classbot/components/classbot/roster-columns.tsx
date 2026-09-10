'use client';

import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import { shortcutTries, type MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import { scopeExits } from '@/lib/mock/classbot-student-report';
import type { RosterColumn } from './roster-table';

/**
 * 학생 명단 표에서 **두 화면이 글자 그대로 같이 쓰는 열**.
 *
 * 관제소(`monitor-roster`)와 리포트 센터(`report-roster`)는 이 네 열이 같다 —
 * 같은 배지 컴포넌트, 같은 세는 함수, 같은 머리글. 리포트 센터는 거기서 진단 열
 * 「목표 · 닿음」 하나만 뺀 것이다. 그래서 열을 화면마다 적어 두지 않고 여기 한 벌만 둔다 —
 * 한쪽만 고쳐 두 화면이 조용히 갈라지는 일을 막는 것이 목적이다.
 *
 * **아무 명단이나 빌려 쓰면 안 된다.** 안 쓰는 곳이 둘 있고 둘 다 이유가 있다:
 *   - `class-reach-roster` — 도달을 `s.reach` 그대로 읽는다(도달·**부분**·미도달).
 *     여기 `reachColumn` 은 사고 수준까지 얹은 `reachBadge()` 3값(도달·**미달**·미도달)이라
 *     **같은 학생이 다르게 판정된다.** 빌려 쓰면 그 화면이 말하는 것이 바뀐다.
 *   - 채점 허브(`grading-student-list`) — 줄의 타입이 `GradingRosterRow` 라
 *     `MonitoredStudent` 를 받는 이 열이 그대로 맞지 않는다.
 *
 * 그러니 열을 여기 새로 들일 때는 「모양이 같은가」가 아니라 **「판정이 같은가」**를 보라.
 */

/** 도달 배지 — 도달 · 미달 · 미도달 셋 중 하나. 판정은 `reachBadge()` 한 곳에서만 한다. */
export const reachColumn: RosterColumn<MonitoredStudent> = {
  head: '도달',
  cell: s => <StudentReachBadge student={s} />,
};

/** 지름길 시도 — 중립색. 경고 톤 금지. 머리글이 이름표를 맡고 칸에는 값만 남는다. */
export const shortcutColumn: RosterColumn<MonitoredStudent> = {
  head: '지름길',
  cell: s => `${shortcutTries(s)}회`,
  className: 'text-pullim-slate-700 font-mono text-2xs',
};

/** 범위 이탈 — 학생 리포트와 같은 원천(`scopeExits`)에서 읽는다. */
export const exitColumn: RosterColumn<MonitoredStudent> = {
  head: '이탈',
  cell: s => `${scopeExits(s)}회`,
  className: 'text-pullim-slate-700 font-mono text-2xs',
};

/** 최근 접속 — 오늘 안 들어온 학생만 외곽선으로 떠오른다 (배지가 판정한다). */
export const lastSeenColumn: RosterColumn<MonitoredStudent> = {
  head: '최근 접속',
  cell: s => <LastSeenBadge student={s} />,
};
