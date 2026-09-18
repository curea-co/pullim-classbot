'use client';

import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import { shortcutTries, type MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import { scopeExits } from '@/lib/mock/classbot-student-report';
import type { RosterColumn } from './roster-table';

/**
 * 학생 명단 표의 가운데 열 한 벌 — 도달 · 지름길 · 이탈 · 최근 접속.
 *
 * ⚠ **2026-09-18 현재 이 열들을 쓰는 화면이 없다.** 같이 쓰던 둘은 학생 목록(`students/monitor-roster`)과
 * 리포트 센터 명단(`reports/report-roster`)이었고, 둘 다 지어낸 학생 스무 명을 세우던 자리라
 * #370 과 이 PR 이 걷었다. **원천이 목이라(`lib/mock/classbot-monitoring` · `classbot-student-report`)
 * 새로 읽지 마라** — 정본 관제소 표는 이 열들을 싣지 않는다. 도달·요구 수준 대비 깊이·지름길·범위 이탈은
 * 서버에 원천이 없다.
 *
 * 남겨 둔 값어치는 **판정을 한 곳에 묶어 둔 것**이다. 같은 학생을 두 화면이 다르게 읽는 일은 실제로
 * 났었다 — `class-reach-roster` 는 도달을 `s.reach` 그대로 읽어(도달·**부분**·미도달) 여기
 * `reachColumn` 의 `reachBadge()` 3값(도달·**미달**·미도달)과 갈린다. 그래서 그 화면은 이 열을
 * 빌려 쓰지 않고 제 몫으로 따로 둔다. 열을 여기 새로 들일 때는 「모양이 같은가」가 아니라
 * **「판정이 같은가」**를 보라.
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
