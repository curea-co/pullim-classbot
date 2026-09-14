'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import {
  GradingPendingBadge, LastSeenBadge, StudentReachBadge,
} from '@/components/classbot/roster-badges';
import { RosterTable, type RosterColumn } from '@/components/classbot/roster-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  lastSeenRank, stuckConceptLabel, type MonitoredStudent,
} from '@/lib/mock/classbot-monitoring';
import { buildGradingRoster, type GradingRosterRow } from '@/lib/mock/classbot-grading-roster';
import type { GradingItem } from '@/lib/mock';
import { useGradingStore, useMergedGradingItems } from '@/lib/store/grading';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import {
  filterLabels, matchesStudentFilter, sortOptions, studentViewHref,
  STUDENT_FILTER_DEFAULT, STUDENT_SORT_DEFAULT,
  type StudentFilter, type StudentSort,
} from './grading-filters';

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
 *
 * **머리글 있는 표**다. 표 껍데기(머리글 줄·이름·학년 칸·줄 전체 링크·좁은 화면 처리)는
 * 관제소 「학생 한 줄 보기」와 같은 것을 쓴다 — `components/classbot/roster-table.tsx`.
 * 여기서는 가운데 열만 정한다. 맨숫자·맨글자 칸(막힌 곳·AI 초안)은 칸마다 되풀이하던
 * 이름표를 머리글로 올리고 값만 남긴다. 배지는 제 글자를 그대로 둔다 — 스스로 무엇인지
 * 말하는 칩이라 머리글과 겹쳐도 읽는 데 방해가 안 된다.
 */

/** 채점 허브가 담는 열 — 이름·학년 다음, 꺾쇠 앞. */
const gradingColumns: RosterColumn<GradingRosterRow>[] = [
  // 배지 세 벌 — 도달 · 최근 접속 · 채점 대기
  { head: '도달', cell: r => <StudentReachBadge student={r.student} /> },
  { head: '최근 접속', cell: r => <LastSeenBadge student={r.student} /> },
  { head: '채점 대기', cell: r => <GradingPendingBadge count={r.pending} /> },
  // 어디서 막혔나 — 학급 「다시 가르칠 개념」과 같은 값
  { head: '막힌 곳', cell: r => <StuckCell student={r.student} /> },
  // 검수할 게 있으면 그 한 건의 AI 초안 점수 — 없으면 빈 칸으로 둔다
  {
    head: 'AI 초안',
    cell: r => (r.next ? `${r.next.draftScore}/${r.next.maxScore}` : null),
    className: 'text-pullim-slate-700 font-mono text-2xs',
  },
];

/**
 * 거르개·정렬 값은 화면 안에서도 한 벌 들고 있다. 누르는 즉시 목록이 움직여야 해서다
 * (URL 이 돌아오길 기다리면 알약이 늦게 반응한다). URL 은 뒤따라 갱신한다.
 *
 * **`push` 를 쓴다(`replace` 아님).** 거르개를 바꾼 것은 교사가 한 이동이라 뒤로 가기로
 * 되돌아갈 수 있어야 한다. `replace` 면 방금 보던 조건이 히스토리에서 사라진다.
 * 뒤로 가서 URL 이 바뀌면 페이지가 `key` 로 이 컴포넌트를 다시 세워 값을 다시 읽는다.
 *
 * URL 을 읽고 쓰는 규칙 자체는 `./grading-filters` 에 있다 — 서버 컴포넌트도 같은 것을 읽어야
 * 해서 이 파일(`'use client'`) 밖으로 뺐다.
 */

export function GradingStudentList({
  students,
  items,
  filter: filterProp = STUDENT_FILTER_DEFAULT,
  sort: sortProp = STUDENT_SORT_DEFAULT,
}: {
  students: MonitoredStudent[];
  items: GradingItem[];
  /** URL 에서 읽은 값 — 이 컴포넌트의 출발점 */
  filter?: StudentFilter;
  sort?: StudentSort;
}) {
  const router = useRouter();
  const hydrated = useStoresHydrated(useGradingStore);
  const merged = useMergedGradingItems(items);
  const [filter, setFilter] = useState<StudentFilter>(filterProp);
  const [sort, setSort] = useState<StudentSort>(sortProp);

  const selectFilter = (next: StudentFilter) => {
    setFilter(next);
    router.push(studentViewHref(next, sort), { scroll: false });
  };
  const selectSort = (next: StudentSort) => {
    setSort(next);
    router.push(studentViewHref(filter, next), { scroll: false });
  };

  // 교사가 확정한 채점을 얹은 뒤 센다 — 확정한 항목은 대기에서 빠져야 한다.
  const rows = useMemo(() => buildGradingRoster(merged, students), [merged, students]);


  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter(r => matchesStudentFilter(r, 'pending')).length,
    'not-reached': rows.filter(r => matchesStudentFilter(r, 'not-reached')).length,
    offline: rows.filter(r => matchesStudentFilter(r, 'offline')).length,
  }), [rows]);

  const visible = useMemo(() => {
    const filtered = rows.filter(r => matchesStudentFilter(r, filter));
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
        title="학생 목록"
        description="채점할 게 없는 학생도 함께 보여요."
      />

      <div className="mb-4 space-y-2">
        <FilterPillButtons
          options={(Object.keys(filterLabels) as StudentFilter[]).map(value => ({
            value,
            label: filterLabels[value],
            count: hydrated ? counts[value] : undefined,
          }))}
          current={filter}
          onSelect={selectFilter}
        />
        <FilterPillButtons options={sortOptions} current={sort} onSelect={selectSort} shape="tab" />
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
          action={{ onClick: () => selectFilter('all'), label: '전체 보기' }}
        />
      ) : (
        <RosterTable
          label="학생 목록"
          minWidth="35rem"
          rows={visible}
          rowKey={row => row.student.id}
          student={row => row.student}
          // 되돌아갈 곳을 넘긴다 — 이게 없으면 학생 상세의 뒤로 가기가 관제소로 튄다.
          href={row => `/teacher/students/${row.student.id}?from=grading`}
          columns={gradingColumns}
        />
      )}

      {/* 배지가 무엇을 세는지는 화면 어디에도 없다 — 그것만 적는다. 「왜 남기나」는 아래 FlywheelNote 몫. */}
      <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
        「대기」는 아직 검수하지 않은 채점 건수예요.
      </p>
    </section>
  );
}

/**
 * 어디서 막혔나 — 머리글이 「막힌 곳」이라 칸에는 개념 이름만 남는다.
 * 개념 이름이 길어 줄을 밀지 않게 칸 안에서 잘라 낸다.
 */
function StuckCell({ student: s }: { student: MonitoredStudent }) {
  const stuck = stuckConceptLabel(s);
  const moreStuck = s.stuckConcepts.length - 1;

  if (!stuck) return <span className="text-pullim-slate-400 text-2xs">없음</span>;
  return (
    <span className="text-pullim-slate-700 block max-w-[10rem] truncate text-2xs">
      {stuck}
      {moreStuck > 0 && <span className="text-pullim-slate-400">{` 외 ${moreStuck}개`}</span>}
    </span>
  );
}
