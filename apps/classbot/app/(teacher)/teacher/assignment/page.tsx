'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { ReadErrorState } from '@/components/classbot/read-state';
import { Chip } from '@/components/ui/chip';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { useOperatorClasses } from '@/hooks/api/classroom';
import { gradingStats } from '@/lib/mock';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';
import {
  assignmentListHref,
  buildRows,
  filterRows,
  modeFilterOptions,
  sortRows,
  statusFilterOptions,
  statusLabels,
  summarize,
  toModeFilter,
  toStatusFilter,
  toTeacherClass,
  type AssignmentListFilter,
  type AssignmentRow,
  type TeacherClass,
} from './assignment-filters';

/**
 * 낸 과제 목록 (`proc/spec/14 § 3.3.3` · 2026-09-16 계획 §06 R11).
 *
 * **정본을 읽는다** — `useTeacherAssignments`(`GET /classbot/assignments?audience=teacher`, 계획 §05 「있음, 소비자 0」이던
 * 문)와 `useOperatorClasses`(`hooks/api/classroom.ts` · 반 이름 조인). 종전의 localStorage 스토어 + mock 봇 색인은 PR 6 에서 걷었다.
 *
 * 이 화면이 하지 않는 것:
 *  - 과제 하나의 제출 현황 → 과제 상세(`[id]`). 목록 DTO 에 제출 집계가 없어 여기서는 세지 않는다(N+1 을 피한다).
 *  - 채점 → 채점 허브(`/teacher/grading`). 요약 띠에서 길만 열어 둔다.
 *  - 고치기·회수 — 정본에 그 문이 없다. 상세가 그 사실을 말한다. 그래서 「회수됨」 칩·빈 상태도 없다.
 *
 * 마감은 지금 기준이다 — 정본 `dDay` 는 낼 때 굳힌 정수라 `dispatchedAt` 로 다시 센다(`assignment-filters.ts`).
 */
export default function TeacherAssignmentListPage() {
  // `useSearchParams` 는 Suspense 경계가 필요하다 — 봇 운영 화면의 `CreatedBanner` 와 같은 처리.
  return (
    <Suspense fallback={null}>
      <AssignmentList />
    </Suspense>
  );
}

function AssignmentList() {
  const params = useSearchParams();
  const assignmentsQuery = useTeacherAssignments();
  const classesQuery = useOperatorClasses();

  const status = toStatusFilter(params.get('status'));
  const mode = toModeFilter(params.get('mode'));
  // `class` 가 정본 이름이고 `bot` 은 봇 운영 화면이 아직 보내는 옛 이름이다(bot == class).
  const classId = params.get('class') ?? params.get('bot') ?? undefined;
  const filter: AssignmentListFilter = useMemo(() => ({ status, mode, classId }), [status, mode, classId]);

  const classIndex = useMemo(
    () => new Map<string, TeacherClass>((classesQuery.data ?? []).map(toTeacherClass).map((c) => [c.id, c])),
    [classesQuery.data],
  );
  const allRows = useMemo(
    () => buildRows(assignmentsQuery.data ?? [], classIndex),
    [assignmentsQuery.data, classIndex],
  );
  const rows = useMemo(() => sortRows(filterRows(allRows, filter)), [allRows, filter]);
  const summary = useMemo(() => summarize(allRows), [allRows]);
  const carriedClass = filter.classId ? classIndex.get(filter.classId) : undefined;

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: ClipboardList, text: '평가' },
        title: '낸 과제',
        description: '낸 과제가 어떻게 되고 있는지 한 자리에서 봐요. 과제를 누르면 학생별 제출로 가요.',
        action: (
          <Link
            href="/teacher/assignment/new"
            data-testid="assignment-list-new-cta"
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            과제 내기
          </Link>
        ),
      }}
    >
      {/*
        요약은 **거르기와 무관하게 전체를 센다.** 거르개를 걸 때마다 숫자가 같이 줄면
        「지금 급한 게 몇 건인가」를 물어볼 수가 없다 — 요약의 일이 그것이다.
        채점 대기만 출처가 다르다(채점 허브의 큐) — 그래서 링크로 두고 라벨로 밝힌다.
      */}
      <KpiStatBar cols={4}>
        <KpiStat label="진행 중" value={`${summary.live}건`} />
        <KpiStat label="마감 임박" value={`${summary.dueSoon}건`} tone={summary.dueSoon > 0 ? 'alert' : 'default'} />
        <KpiStatLink label="채점 대기" value={`${gradingStats.totalQueue}건`} href="/teacher/grading?view=queue" />
        <KpiStat label="마감" value={`${summary.closed}건`} />
      </KpiStatBar>

      <FilterBar filter={filter} carriedClassName={carriedClass?.name ?? (filter.classId ? '반 하나' : undefined)} />

      {assignmentsQuery.isPending ? (
        <div data-testid="assignment-list-loading" className="text-pullim-slate-500 py-10 text-center text-sm">
          불러오는 중이에요…
        </div>
      ) : assignmentsQuery.isError ? (
        <ReadErrorState onRetry={() => void assignmentsQuery.refetch()} />
      ) : allRows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="아직 낸 과제가 없어요"
          description="과제를 내면 여기에서 누가 냈고 누가 안 냈는지 볼 수 있어요."
          action={{ href: '/teacher/assignment/new', label: '과제 내기' }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          tone="plain"
          size="sm"
          title="이 조건에 맞는 과제가 없어요"
          description="거르개를 지우면 낸 과제를 모두 볼 수 있어요."
          action={{ href: '/teacher/assignment', label: '거르개 지우기' }}
        />
      ) : (
        <ul data-testid="assignment-list" className="space-y-2">
          {rows.map((row) => (
            <AssignmentListRow key={row.assignment.id} row={row} />
          ))}
        </ul>
      )}
    </TeacherPageShell>
  );
}

/**
 * 거르개 — URL 이 1차다(채점 허브 § 10 과 같은 결). 새로고침·링크 공유·뒤로 가기에서
 * 보던 조건이 유지돼야 한다. 그래서 상태를 컴포넌트에 담지 않고 링크로만 바꾼다.
 */
function FilterBar({ filter, carriedClassName }: { filter: AssignmentListFilter; carriedClassName?: string }) {
  return (
    <section data-testid="assignment-filters" className="bg-card space-y-3 rounded-2xl border p-4">
      <FilterRow label="상태">
        {statusFilterOptions.map((o) => (
          <FilterChip key={o.value} href={assignmentListHref({ ...filter, status: o.value })} active={filter.status === o.value}>
            {o.label}
          </FilterChip>
        ))}
      </FilterRow>
      <FilterRow label="모드">
        {modeFilterOptions.map((o) => (
          <FilterChip key={o.value} href={assignmentListHref({ ...filter, mode: o.value })} active={filter.mode === o.value}>
            {o.label}
          </FilterChip>
        ))}
      </FilterRow>
      {carriedClassName && (
        /*
          반은 고르는 칸이 아니라 **실려 온 조건**이다 — 봇 운영 화면·반 상세가 보낸다.
          드롭다운을 하나 더 세우는 대신 「무엇이 걸려 있는지」와 「푸는 길」만 보인다.
        */
        <FilterRow label="걸린 조건">
          <span data-testid="assignment-filter-carried" className="text-pullim-slate-900 text-xs font-bold">
            {carriedClassName}
          </span>
          <Link
            href={assignmentListHref({ status: filter.status, mode: filter.mode })}
            className="text-pullim-blue-600 hover:text-pullim-blue-700 text-xs font-bold underline underline-offset-2"
          >
            풀기
          </Link>
        </FilterRow>
      )}
    </section>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-pullim-slate-500 w-14 shrink-0 text-2xs font-semibold tracking-wider uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-visible:ring-pullim-blue-400/50 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors outline-none focus-visible:ring-2',
        active
          ? 'border-pullim-slate-900 bg-pullim-slate-900 text-white'
          : 'text-pullim-slate-600 hover:border-pullim-blue-300 hover:text-pullim-blue-700 border-transparent bg-pullim-slate-50',
      )}
    >
      {children}
    </Link>
  );
}

/**
 * 과제 한 줄 — 줄째 누르는 자리다. 줄 안에 링크를 또 깔지 않는다(봇 관리 카드와 같은 규칙).
 * 제출 칸은 없다 — 목록 DTO 에 없는 것을 세는 척하지 않는다(머리주석).
 */
function AssignmentListRow({ row }: { row: AssignmentRow }) {
  const { assignment: a } = row;
  const mode = assignmentModeBadge[row.mode];
  const className = row.className || '반 이름 없음';

  return (
    <li data-testid={`assignment-row-${a.id}`}>
      <Link
        href={`/teacher/assignment/${a.id}`}
        className="bg-card hover:border-pullim-blue-300 focus-visible:ring-pullim-blue-400/50 flex items-center gap-4 rounded-2xl border p-4 transition-colors outline-none focus-visible:ring-2"
      >
        {/* 반의 얼굴 — 교사가 보는 얼굴도 학생이 보는 그 얼굴이다([08 § 14.1.1] 예외 2). `BotAvatar` 한 곳이 그린다. */}
        <BotAvatar subject={row.subject} name={className} size="md" />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-1.5 py-0.5 text-micro font-bold', mode.bg, mode.fg)}>
              {mode.label}
            </span>
            <span className="text-pullim-slate-900 truncate text-sm font-bold">{a.title}</span>
          </span>
          <span className="text-pullim-slate-500 mt-0.5 block truncate text-2xs">
            {className}
            {` · ${a.questionCount}문항`}
            {a.scope && ` · ${a.scope}`}
          </span>
        </span>

        {/* 마감 — D-day 는 지금 기준으로 다시 센 것, 아래 작은 글자는 낼 때 굳힌 라벨(`assignment-filters.ts` 머리주석). */}
        <span className="hidden w-28 shrink-0 text-right md:block">
          <span className="text-pullim-slate-500 block text-micro font-semibold tracking-wider uppercase">마감</span>
          <span className={cn('font-mono text-sm font-bold', row.dueSoon ? 'text-pullim-danger' : 'text-pullim-slate-900')}>
            {row.dDayLabel}
          </span>
          <span className="text-pullim-slate-500 block text-2xs">{row.dueLabel}</span>
        </span>

        <Chip tone="outline" className="hidden shrink-0 py-1 lg:inline-flex">
          {statusLabels[row.status]}
        </Chip>

        <ChevronRight className="text-pullim-slate-300 h-4 w-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
