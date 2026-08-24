'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import {
  GradingPendingBadge, LastSeenBadge, StudentReachBadge,
} from '@/components/classbot/roster-badges';
import { Skeleton } from '@/components/ui/skeleton';
import {
  isOfflineToday, lastSeenRank, reachBadge, stuckConceptLabel,
  type MonitoredStudent,
} from '@/lib/mock/classbot-monitoring';
import {
  buildGradingRoster, unlinkedGradingItems, type GradingRosterRow,
} from '@/lib/mock/classbot-grading-roster';
import type { GradingItem } from '@/lib/mock';
import { useGradingStore, useMergedGradingItems } from '@/lib/store/grading';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 채점 허브의 기본 화면 — **등록된 학생 전체** (spec 11 § 3.3.0).
 *
 * 왜 큐가 아니라 이 화면이 기본인가: 큐만 보이면 「오늘 제출한 학생」만 화면에 남는다.
 * 진행률에도 안 잡히고 교사가 가장 늦게 아는 조용한 이탈이 정확히 그 자리에서 사라진다.
 * 그래서 채점 대기가 0건인 학생도 줄을 유지한다.
 *
 * 요약은 **배지 세 벌**이 말한다 — 도달 · 최근 접속 · 채점 대기.
 * 앞 두 벌은 교사 홈·관제소가 쓰던 배지 그대로다(`roster-badges.tsx`). 같은 학생이 화면마다
 * 다르게 읽히면 안 되니 판정을 여기서 다시 하지 않는다.
 *
 * 새로 만든 지표는 없다. 채점 대기 건수는 이미 있던 `GradingItem.status` 를 센 것이고,
 * 막힌 개념은 학급 「다시 가르칠 개념」이 읽는 값과 같은 `stuckConcepts` 다.
 *
 * 줄 전체가 `/teacher/students/[id]` 로 가는 링크다 — 그 학생이 **어떤 봇과 무슨 대화를 했고
 * 어디서 막혔는지** 는 이미 그 화면이 답한다. 여기서 다시 만들지 않는다.
 */

type StudentFilter = 'all' | 'pending' | 'not-reached' | 'offline';
type StudentSort = 'pending' | 'name' | 'stale';

const sortOptions = [
  { value: 'pending', label: '채점 대기 많은 순' },
  { value: 'name',    label: '이름순' },
  { value: 'stale',   label: '활동 오래된 순' },
] as const;

const filterLabels: Record<StudentFilter, string> = {
  all: '전체',
  pending: '채점 대기 있음',
  'not-reached': '미도달',
  offline: '오늘 안 들어옴',
};

function matches(row: GradingRosterRow, filter: StudentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return row.pending > 0;
  if (filter === 'offline') return isOfflineToday(row.student);
  return reachBadge(row.student) === 'not-reached';
}

export function GradingStudentList({
  students,
  items,
}: {
  students: MonitoredStudent[];
  items: GradingItem[];
}) {
  const hydrated = useStoresHydrated(useGradingStore);
  const merged = useMergedGradingItems(items);
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [sort, setSort] = useState<StudentSort>('pending');

  // 교사가 확정한 채점을 얹은 뒤 센다 — 확정한 항목은 대기에서 빠져야 한다.
  const rows = useMemo(() => buildGradingRoster(merged, students), [merged, students]);

  /**
   * 학생 명단에 이어지지 않은 **검수 대기** — 어느 줄에도 붙지 않는다 (spec 11 § 7.1).
   * 감추면 줄 배지 합계와 위 KPI 「대기」가 말없이 어긋난다. 세어서 큐로 가는 길을 준다.
   *
   * `queue` 상태만 센다. 이 숫자의 쓸모가 KPI 「대기」와의 차이를 메우는 것이라서다 —
   * 확정된 미연결 항목은 KPI 「대기」에도 없으니 여기서도 세지 않는다.
   * (상태를 가리지 않은 미연결 항목 전부는 큐 화면의 상태 거르개로 볼 수 있다.)
   */
  const unlinkedPending = useMemo(
    () => unlinkedGradingItems(merged).filter(item => item.status === 'queue').length,
    [merged],
  );

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter(r => matches(r, 'pending')).length,
    'not-reached': rows.filter(r => matches(r, 'not-reached')).length,
    offline: rows.filter(r => matches(r, 'offline')).length,
  }), [rows]);

  const visible = useMemo(() => {
    const filtered = rows.filter(r => matches(r, filter));
    const byName = (a: GradingRosterRow, b: GradingRosterRow) =>
      a.student.name.localeCompare(b.student.name, 'ko');
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return byName(a, b);
      if (sort === 'stale') return lastSeenRank(b.student) - lastSeenRank(a.student) || byName(a, b);
      // 기본 — 검수할 게 많은 학생부터. 같으면 검토중 → 이름순.
      return b.pending - a.pending || b.reviewing - a.reviewing || byName(a, b);
    });
  }, [rows, filter, sort]);

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={`등록 학생 ${students.length}명`}
        description="채점할 게 없는 학생도 함께 보여요. 학생을 누르면 대화 기록과 막힌 지점으로 가요."
      />

      <div className="mb-3 space-y-2">
        <FilterPillButtons
          options={(Object.keys(filterLabels) as StudentFilter[]).map(value => ({
            value,
            label: filterLabels[value],
            count: hydrated ? counts[value] : undefined,
          }))}
          current={filter}
          onSelect={setFilter}
        />
        <FilterPillButtons options={sortOptions} current={sort} onSelect={setSort} shape="tab" />
      </div>

      {/*
        줄 자체는 학생 명단이라 store 와 무관하지만, 채점 대기 배지·정렬은 교사 확정에 따라 달라진다.
        rehydrate 전에 틀린 건수가 번쩍이지 않게 큐(GradingQueueList)와 같은 방식으로 자리만 잡아 둔다.
      */}
      {!hydrated ? (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i}><Skeleton className="h-12 w-full rounded-xl" /></li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="이 조건에 해당하는 학생이 없어요"
          action={{ onClick: () => setFilter('all'), label: '전체 보기' }}
        />
      ) : (
        <ul className="divide-pullim-slate-100 divide-y">
          {visible.map(row => <StudentRow key={row.student.id} row={row} />)}
        </ul>
      )}

      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        「대기」는 아직 검수하지 않은 채점 건수예요. 대기가 0건이어도 학생은 목록에 남아요 —
        <b className="text-pullim-slate-700"> 오늘 제출하지 않은 학생</b>이 화면에서 사라지지 않게 하려는 거예요.
      </p>

      {hydrated && unlinkedPending > 0 && (
        <p className="text-pullim-slate-500 mt-1.5 text-2xs leading-relaxed">
          학생 명단에 이어지지 않은 검수 대기가 <b className="text-pullim-slate-700">{`${unlinkedPending}건`}</b> 있어요.
          {' '}
          <Link href="/teacher/grading?view=queue" className="text-pullim-blue-600 hover:text-pullim-blue-700 font-bold">
            채점 대기 큐에서 보기
          </Link>
        </p>
      )}
    </section>
  );
}

function StudentRow({ row }: { row: GradingRosterRow }) {
  const s = row.student;
  const stuck = stuckConceptLabel(s);
  const moreStuck = s.stuckConcepts.length - 1;

  // 열 너비를 고정해 20줄이 세로로 정렬되게 한다 — 훑는 화면이라 정렬이 곧 가독성
  return (
    <li>
      <Link
        href={`/teacher/students/${s.id}`}
        className="hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 sm:grid-cols-[9rem_3.5rem_4.5rem_5rem_minmax(0,1fr)_6rem_auto]"
      >
        {/* 이름 · 학년 */}
        <span className="flex items-center gap-2">
          <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
            {s.name.slice(1, 2)}
          </span>
          <span className="min-w-0">
            <span className="text-pullim-slate-900 block text-sm leading-tight font-bold">{s.name}</span>
            <span className="text-pullim-slate-500 text-micro">{s.grade}</span>
          </span>
        </span>

        {/* 배지 세 벌 — 도달 · 최근 접속 · 채점 대기 */}
        <StudentReachBadge student={s} />
        <LastSeenBadge student={s} />
        <GradingPendingBadge count={row.pending} />

        {/* 어디서 막혔나 — 학급 「다시 가르칠 개념」과 같은 값 */}
        <span className="text-pullim-slate-500 min-w-0 truncate text-2xs">
          {stuck ? (
            <>
              막힌 곳 <b className="text-pullim-slate-700">{stuck}</b>
              {moreStuck > 0 && <span className="text-pullim-slate-400">{` 외 ${moreStuck}개`}</span>}
            </>
          ) : (
            <span className="text-pullim-slate-400">막힌 곳 없음</span>
          )}
        </span>

        {/* 검수할 게 있으면 그 한 건의 AI 초안 점수 — 없으면 빈 칸으로 둔다 */}
        <span className="text-pullim-slate-500 shrink-0 font-mono text-2xs">
          {row.next ? (
            <>
              <span className="text-pullim-slate-400">AI 초안 </span>
              <b className="text-pullim-slate-700">{`${row.next.draftScore}/${row.next.maxScore}`}</b>
            </>
          ) : null}
        </span>

        <ChevronRight className="text-pullim-slate-400 ml-auto h-4 w-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
