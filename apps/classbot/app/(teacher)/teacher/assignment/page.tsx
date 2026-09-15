'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, ClipboardList, Plus, Users } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { Chip } from '@/components/ui/chip';
import { gradingStats } from '@/lib/mock';
import { useAssignmentStore } from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';
import {
  assignmentListHref,
  buildBotIndex,
  buildRows,
  filterRows,
  modeFilterOptions,
  sortRows,
  statusFilterOptions,
  statusLabels,
  summarize,
  toModeFilter,
  toStatusFilter,
  type AssignmentListFilter,
  type AssignmentRow,
} from './assignment-filters';

/**
 * 낸 과제 목록 (`proc/spec/14 § 3.3.3`).
 *
 * **이 화면이 없어서 생긴 일**: 내기(`new`)까지만 있고 낸 뒤를 볼 자리가 없어서, 이미 만들어 둔
 * 교사 개입 셋(리마인드·제출 현황 시트·오답 다시 내기)이 갈 곳을 못 찾고 봇 운영 화면
 * (`/teacher/classbot`)에 얹혀 있었다. 「봇이 잘 돌고 있나」와 「이 과제가 어떻게 되고 있나」는
 * 다른 질문이다. 그 개입들은 과제 상세(`[id]`)로 옮겨 간다.
 *
 * 이 화면이 하지 않는 것:
 *  - 과제 하나의 진행률·제출 현황 → 과제 상세(`[id]`). 여기서는 「N/M 냈다」 한 칸만 읽어 준다.
 *  - 채점 → 채점 허브(`/teacher/grading`). 요약 띠에서 길만 열어 둔다.
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
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const drafts = useAssignmentStore((s) => s.drafts);
  const submissions = useAssignmentStore((s) => s.submissions);
  // persist 스토어라 첫 렌더에는 비어 있다. 게이트 없이 그리면 「아직 낸 과제가 없어요」가
  // 한 번 번쩍인 뒤 목록이 나타난다 — 다른 화면들과 같은 처리.
  const hydrated = useStoresHydrated(useAssignmentStore);

  const status = toStatusFilter(params.get('status'));
  const mode = toModeFilter(params.get('mode'));
  const roomId = params.get('room') ?? undefined;
  const botId = params.get('bot') ?? undefined;
  // 거르개를 **객체 하나로 굳힌 뒤** 아래 memo 들이 그것 하나만 본다. 매 렌더 새 객체를 만들면
  // 의존성이 늘 달라져 memo 가 의미를 잃고, 값으로 펴서 적으면 칸이 늘 때마다 빠뜨리기 쉽다.
  const filter: AssignmentListFilter = useMemo(
    () => ({ status, mode, roomId, botId }),
    [status, mode, roomId, botId],
  );

  const botIndex = useMemo(() => buildBotIndex(), []);
  const allRows = useMemo(
    () => buildRows([...dispatched, ...drafts], submissions, botIndex),
    [dispatched, drafts, submissions, botIndex],
  );
  const rows = useMemo(
    () => sortRows(filterRows(allRows, filter, botIndex)),
    [allRows, botIndex, filter],
  );
  const summary = useMemo(() => summarize(allRows), [allRows]);

  /*
    걸려 있는 반·봇 — 봇 조건은 봇 운영 KPI 가 실어 보낸다(진입점 2). **반 조건은 아직
    보내는 쪽이 없다**(`proc/spec/14 § 3.2` 진입점 4 = `[예정]`) — 수업방 화면은 실DB 반
    (`cr_<uuid>`)을 쓰는데 과제 스토어는 mock 반 id(`cr_math_a`)를 써서 두 축이 안 만난다.
    받는 쪽을 먼저 열어 두는 이유는, 축이 만나는 날 이 파일을 다시 안 고쳐도 되게 하려는 것이다.
  */
  const carriedBot = filter.botId ? botIndex.get(filter.botId) : undefined;
  const carriedRoom = filter.roomId
    ? [...botIndex.values()]
        .flatMap((b) => b.classrooms)
        .find((c) => c.classroomId === filter.roomId)
    : undefined;

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: ClipboardList, text: '평가' },
        title: '낸 과제',
        description: '낸 과제가 어떻게 되고 있는지 한 자리에서 봐요. 과제를 누르면 학생별 진행과 제출로 가요.',
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
        <KpiStat label="초안" value={`${summary.draft}건`} />
      </KpiStatBar>

      <FilterBar
        filter={filter}
        carriedBotName={carriedBot?.botName}
        carriedRoomLabel={carriedRoom?.label}
      />

      {!hydrated ? (
        <div data-testid="assignment-list-loading" className="text-pullim-slate-500 py-10 text-center text-sm">
          불러오는 중이에요…
        </div>
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
function FilterBar({
  filter,
  carriedBotName,
  carriedRoomLabel,
}: {
  filter: AssignmentListFilter;
  carriedBotName?: string;
  carriedRoomLabel?: string;
}) {
  const carried = carriedBotName ?? carriedRoomLabel;
  return (
    <section data-testid="assignment-filters" className="bg-card space-y-3 rounded-2xl border p-4">
      <FilterRow label="상태">
        {statusFilterOptions.map((o) => (
          <FilterChip
            key={o.value}
            href={assignmentListHref({ ...filter, status: o.value })}
            active={filter.status === o.value}
          >
            {o.label}
          </FilterChip>
        ))}
      </FilterRow>
      <FilterRow label="모드">
        {modeFilterOptions.map((o) => (
          <FilterChip
            key={o.value}
            href={assignmentListHref({ ...filter, mode: o.value })}
            active={filter.mode === o.value}
          >
            {o.label}
          </FilterChip>
        ))}
      </FilterRow>
      {carried && (
        /*
          반·봇은 고르는 칸이 아니라 **실려 온 조건**이다 — 봇 운영 KPI·반 카드가 보낸다.
          드롭다운을 하나 더 세우는 대신 「무엇이 걸려 있는지」와 「푸는 길」만 보인다.
        */
        <FilterRow label="걸린 조건">
          <span data-testid="assignment-filter-carried" className="text-pullim-slate-900 text-xs font-bold">
            {carried}
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
 */
function AssignmentListRow({ row }: { row: AssignmentRow }) {
  const { assignment: a } = row;
  const mode = assignmentModeBadge[a.mode];
  const isDraft = row.status === 'draft';

  return (
    <li data-testid={`assignment-row-${a.id}`}>
      <Link
        href={`/teacher/assignment/${a.id}`}
        className="bg-card hover:border-pullim-blue-300 focus-visible:ring-pullim-blue-400/50 flex items-center gap-4 rounded-2xl border p-4 transition-colors outline-none focus-visible:ring-2"
      >
        <span className="bg-pullim-blue-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg" aria-hidden>
          {row.avatarEmoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-1.5 py-0.5 text-micro font-bold', mode.bg, mode.fg)}>
              {mode.label}
            </span>
            <span className="text-pullim-slate-900 truncate text-sm font-bold">{a.title}</span>
          </span>
          <span className="text-pullim-slate-500 mt-0.5 block truncate text-2xs">
            {row.botName}
            {row.classroomLabels.length > 0 && ` · ${row.classroomLabels.join(' · ')}`}
            {` · ${a.questionCount}문항`}
          </span>
        </span>

        {/* 대상·제출 — 목록이 답하는 질문은 「누가 아직 안 냈나」 하나다 */}
        <span className="hidden w-24 shrink-0 text-right sm:block">
          <span className="text-pullim-slate-500 block text-micro font-semibold tracking-wider uppercase">
            <Users className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" aria-hidden />
            제출
          </span>
          <span data-testid={`assignment-submitted-${a.id}`} className="text-pullim-slate-900 font-mono text-sm font-bold">
            {isDraft ? '—' : `${row.submittedCount}/${row.targetCount}`}
          </span>
        </span>

        {/* 마감 — 초안은 아직 마감이 뜻을 갖지 않는다 */}
        <span className="hidden w-24 shrink-0 text-right md:block">
          <span className="text-pullim-slate-500 block text-micro font-semibold tracking-wider uppercase">마감</span>
          <span className={cn('font-mono text-sm font-bold', row.dueSoon ? 'text-pullim-danger' : 'text-pullim-slate-900')}>
            {isDraft ? '—' : a.dDay}
          </span>
        </span>

        <Chip tone="outline" className="hidden shrink-0 py-1 lg:inline-flex">
          {statusLabels[row.status]}
        </Chip>

        <ChevronRight className="text-pullim-slate-300 h-4 w-4 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}
