'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { relativeTimeLabel, type MonitorStudentRow } from '@/lib/risk-signals';
import { cn } from '@/lib/utils';
import { SeverityChip, SignalKindChips, UnackedChip } from './signal-badges';

/**
 * 관제소 표 — 학생 한 줄 = 신호 집계 한 줄(완성 설계 § 7 「교사가 보는 것」). 소비자는 `monitor/monitor-console.tsx` 하나다.
 * 대화 탭의 왼쪽 목록(`classroom/[id]/class-chat-tab.tsx` `StudentList`)은 표가 아니라 세로 목록이라 같은 **배지**
 * (`./signal-badges.tsx`)만 나눠 쓴다 — 두 화면이 같은 학생을 다르게 읽지 않게 하는 것은 배지와 `buildMonitorRows` 다.
 *
 * 담는 것은 **서버가 주는 것뿐**이다: 이름(명단 `displayName`) · 종류별 건수 · 최고 세기 · 미확인 수 · 최근 신호 · 최근
 * 활동(명단 `lastActiveAt` — 「오래 조용함」은 이 칸이 말한다). 종전 관제소 목 표의 도달·목표 대비 깊이·지름길 열은
 * 서버에 원천이 없어 싣지 않는다.
 *
 * 줄에 누를 것은 하나다 — 이름 링크를 `after:` 로 줄 전체에 늘려 어느 칸을 눌러도 같은 곳(그 반 대화 탭 · 그 학생)으로
 * 간다(`roster-table.tsx` 와 같은 수). 머리글은 눈에 보인다 — `sr-only` 로 감추면 표가 아니라 줄 스무 개가 된다.
 */

const headCell = 'text-pullim-slate-500 px-2 pb-2 text-left text-2xs font-bold whitespace-nowrap';
const cell = 'border-pullim-slate-100 border-t px-2 py-3 align-middle';

export function SignalStudentTable({
  label,
  rows,
  now,
  href,
  minWidth = '40rem',
}: {
  /** 표의 이름 — 낭독기가 표를 집을 때 쓴다. */
  label: string;
  rows: MonitorStudentRow[];
  /** 지금(epoch ms) — 「n분 전」을 셀 기준. 호출부가 넘긴다. */
  now: number;
  /** 줄 전체가 가는 곳. */
  href: (row: MonitorStudentRow) => string;
  /** 좁은 화면에서 열이 눌리지 않게 잡아 두는 바닥 폭. */
  minWidth?: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table aria-label={label} style={{ minWidth }} className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className={headCell}>이름</th>
            <th scope="col" className={headCell}>신호</th>
            <th scope="col" className={headCell}>세기</th>
            <th scope="col" className={headCell}>확인</th>
            <th scope="col" className={headCell}>최근 신호</th>
            <th scope="col" className={headCell}>최근 활동</th>
            <th scope="col" className={headCell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.studentId}
              data-testid={`monitor-student-${row.studentId}`}
              data-high={row.badge?.high ? 'true' : undefined}
              className="hover:bg-pullim-slate-50 has-[a:focus-visible]:bg-pullim-blue-50 relative transition-colors"
            >
              <th scope="row" className={cn(cell, 'text-left font-normal whitespace-nowrap')}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn('h-6 w-1 shrink-0 rounded-full', row.badge?.high ? 'bg-pullim-danger' : 'bg-transparent')}
                  />
                  {/* 이름 = 줄에 하나뿐인 누를 것. `after:` 로 줄 전체를 덮는다. */}
                  <Link
                    href={href(row)}
                    className="text-pullim-slate-900 focus-visible:ring-pullim-blue-400/50 rounded text-sm leading-tight font-bold after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2"
                  >
                    {row.name}
                  </Link>
                  {!row.enrolled && (
                    <Chip tone="outline" className="py-[5px] px-2">
                      나간 학생
                    </Chip>
                  )}
                </span>
              </th>
              <td className={cell}>
                <SignalKindChips badge={row.badge} />
              </td>
              <td className={cn(cell, 'whitespace-nowrap')}>
                {row.badge ? <SeverityChip severity={row.badge.maxSeverity} high={row.badge.high} /> : <Dash />}
              </td>
              <td className={cn(cell, 'whitespace-nowrap')}>
                {row.badge ? <UnackedChip unacked={row.badge.unacked} /> : <Dash />}
              </td>
              <td className={cn(cell, 'text-pullim-slate-700 font-mono text-2xs whitespace-nowrap')}>
                {row.badge ? relativeTimeLabel(row.badge.lastAt, now) : <Dash />}
              </td>
              <td className={cn(cell, 'text-pullim-slate-700 font-mono text-2xs whitespace-nowrap')}>
                {row.lastActiveAt ? relativeTimeLabel(row.lastActiveAt, now) : <Dash />}
              </td>
              <td className={cn(cell, 'text-right')}>
                <ChevronRight className="text-pullim-slate-400 inline h-4 w-4" aria-hidden />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 값이 없는 칸 — 「없다」와 「모른다」를 가르지 않는 자리라 줄표 하나. */
function Dash() {
  return <span className="text-pullim-slate-400">—</span>;
}
