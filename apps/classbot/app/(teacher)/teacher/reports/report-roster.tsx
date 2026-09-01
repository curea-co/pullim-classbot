'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import { shortcutTries, type MonitoredStudent } from '@/lib/mock/classbot-monitoring';
import { scopeExits } from '@/lib/mock/classbot-student-report';
import {
  countByReportFilter, reportFilterCriteria, reportFilterLabels, reportFilterOrder,
  reportSortCriteria, reportSortOptions, visibleReportRoster,
  type ReportRosterFilter, type ReportRosterSort,
} from './report-roster-filters';

/**
 * 리포트 센터의 등록 학생 명단 ([13 § 3.3.1]) — 한 줄에 한 학생.
 *
 * 왜 리포트 센터에 명단이 있나: 리포트는 일부 학생·학급·기간에만 생성된다.
 * 리포트 6건만 늘어놓으면 **리포트가 아직 없는 학생은 이 화면에서 사라진다.**
 * 그래서 명단은 리포트 유무와 무관하게 **등록된 학생 전원**을 담고, 거르기·정렬로 먼저 볼 학생을 찾게 한다.
 *
 * 규칙은 새로 만들지 않는다 — 거르개·정렬 판정은 전부 `./report-roster-filters` 를 지나고,
 * 그 안은 관제소(`roster-filters`)와 교사 홈(`attentionReason`)을 읽기만 한다.
 * 상태를 말하는 배지도 관제소·교사 홈과 **같은 것**(`roster-badges`)을 쓴다.
 *
 * 줄 모양은 관제소 명단과 닮았지만 담는 열은 더 적다. 여기서 고르는 일은
 * 「누구를 먼저 볼까」 하나라 **거르개·정렬이 쓰는 값만** 줄에 둔다
 * (도달 배지 · 지름길 · 이탈 · 최근 접속). 목표/닿은 사고 수준 같은 진단 열은 관제소에 남긴다.
 *
 * 리포트 건수는 줄에 달지 않는다 — 리포트에는 학생 id 필드가 없고 이름 문자열로만 학생을 가리키는데,
 * 그 이름이 가리키는 명단(`classRoster`)과 여기 명단은 id 체계도 학급 스냅샷도 다르다.
 * 잇는 길을 막아 두는 것이 아니라, 잇기 전에 리포트에 학생 id 를 넣는 일이 먼저다.
 */
export function ReportRoster({ students }: { students: MonitoredStudent[] }) {
  const [filter, setFilter] = useState<ReportRosterFilter>('all');
  const [sort, setSort] = useState<ReportRosterSort>('attention');

  const counts = useMemo(() => countByReportFilter(students), [students]);
  const visible = useMemo(
    () => visibleReportRoster(students, filter, sort),
    [students, filter, sort],
  );

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={`등록된 학생 ${students.length}명`}
        description="리포트가 아직 없는 학생도 모두 있어요."
      />

      <div className="mb-4 space-y-2">
        <FilterPillButtons
          options={reportFilterOrder.map(value => ({
            value,
            label: reportFilterLabels[value],
            count: counts[value],
          }))}
          current={filter}
          onSelect={setFilter}
        />

        {/* 무엇을 세는 말인지 화면이 직접 말한다 — 뜻을 모르면 숫자를 믿을 수 없다 ([13 § 3.3.1.1]) */}
        <p className="text-pullim-slate-500 text-2xs leading-relaxed">
          {reportFilterCriteria[filter]}
        </p>

        <FilterPillButtons
          options={reportSortOptions}
          current={sort}
          onSelect={setSort}
          shape="tab"
        />
        <p className="text-pullim-slate-500 text-2xs leading-relaxed">
          {reportSortCriteria[sort]}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="이 조건에 해당하는 학생이 없어요"
          action={{ onClick: () => setFilter('all'), label: '전체 보기' }}
        />
      ) : (
        <ul className="divide-pullim-slate-100 divide-y">
          {visible.map(s => <ReportRosterRow key={s.id} student={s} />)}
        </ul>
      )}
    </section>
  );
}

/**
 * 학생 한 줄 — 줄 전체가 그 학생의 기록으로 가는 링크 하나다.
 *
 * 어디로 보내나: `/teacher/students/[id]` (대화 기록 + 과정 평가).
 * 리포트 상세(`/teacher/reports/[id]`)는 리포트가 있는 학생만 갈 수 있어 명단의 목적지가 못 된다.
 * 관제소·교사 홈의 학생 줄도 같은 곳으로 간다 — 같은 줄은 어느 화면에서든 같은 곳으로 가야 한다.
 */
function ReportRosterRow({ student: s }: { student: MonitoredStudent }) {
  return (
    <li>
      <Link
        href={`/teacher/students/${s.id}`}
        className="hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 sm:grid-cols-[9rem_3.5rem_5rem_4.5rem_minmax(0,1fr)_auto]"
      >
        {/* 이름 · 학년 */}
        <span className="flex items-center gap-2">
          <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
            {s.name.slice(1, 2)}
          </span>
          <span className="min-w-0">
            <span className="text-pullim-slate-900 block text-sm leading-tight font-bold">{s.name}</span>
            <span className="text-pullim-slate-500 text-2xs">{s.grade}</span>
          </span>
        </span>

        {/* 도달 배지 — 도달 · 미달 · 미도달 셋 중 하나. 판정은 관제소와 같은 곳에서 한다. */}
        <StudentReachBadge student={s} />

        {/* 지름길·이탈은 정렬 기준이라 줄에 둔다. 학생을 나무랄 숫자가 아니므로 중립 slate 로. */}
        <span className="text-pullim-slate-500 shrink-0 text-2xs">
          지름길 <b className="text-pullim-slate-700 font-mono">{`${shortcutTries(s)}회`}</b>
        </span>
        <span className="text-pullim-slate-500 shrink-0 text-2xs">
          이탈 <b className="text-pullim-slate-700 font-mono">{`${scopeExits(s)}회`}</b>
        </span>

        <span className="ml-auto flex items-center gap-1 sm:contents">
          <LastSeenBadge student={s} className="justify-self-end" />
          <ChevronRight className="text-pullim-slate-400 ml-auto h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </li>
  );
}
