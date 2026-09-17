'use client';

import { useMemo, useState } from 'react';
import { School, Users } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { FilterPillButtons } from '@/components/classbot/filter-pills';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { SignalStudentTable } from '@/components/classbot/monitoring/signal-student-table';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassMembersForMonitor, useOperatorClasses } from '@/hooks/api/classroom';
import { useClassSignals } from '@/hooks/api/monitoring';
import { isUnauthorized } from '@/lib/api/classbot-client';
import { buildMonitorRows } from '@/lib/risk-signals';
import { classTabHref } from '../classroom/[id]/class-tabs';

/**
 * 관제소 본체 — 반 고르기(`useOperatorClasses` · 내가 operator 인 반) → 그 반의 명단 ∪ 신호 집계를 표로.
 *
 * 위 요약 넉 칸(학생 · 신호 있는 학생 · 미확인 신호 · 세기 4 이상)은 **읽는 숫자**다 — 종전 관제소의 「카드 = 거르개」는
 * 걷었다. 거르개가 필요할 만큼 줄이 많아지면 그때 서버 `?acked=` 로 건다. 표 줄은 링크다 — 반 상세 「대화」 탭으로
 * 그 학생을 고른 채 들어간다(`classTabHref`). 원문·확인은 거기서 한다.
 *
 * 401 은 로그인 안내(익명 prod-verify 레인이 읽는 「로그인이 필요해요」). 반이 없으면 내 수업방으로 보낸다.
 */
export function MonitorConsole({ initialClassId }: { initialClassId: string | null }) {
  const classes = useOperatorClasses();
  const [pickedId, setPickedId] = useState<string | null>(initialClassId);

  const classList = classes.data ?? [];
  // 고른 반이 내 반 목록에 있으면 그것, 아니면 첫 반 — `?class=` 가 남의 반이나 옛 id 여도 화면이 비지 않는다.
  const classId = classList.some((c) => c.id === pickedId) ? pickedId : (classList[0]?.id ?? null);

  if (classes.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (classes.isError) {
    if (isUnauthorized(classes.error)) return <ReadLoginGate label="학급 관제소" />;
    return <ReadErrorState onRetry={() => void classes.refetch()} />;
  }

  if (classId === null) {
    return (
      <EmptyState
        icon={School}
        title="내 반이 없어요"
        description="반을 만들고 학생이 들어오면 여기서 신호를 볼 수 있어요."
        action={{ href: '/teacher/classroom', label: '내 수업방' }}
      />
    );
  }

  return (
    <>
      <section className="bg-card rounded-2xl border p-4" data-testid="monitor-class-picker">
        <FilterPillButtons
          options={classList.map((c) => ({ value: c.id, label: c.name }))}
          current={classId}
          onSelect={setPickedId}
          shape="tab"
        />
      </section>
      <ClassSignalsBoard key={classId} classId={classId} />
    </>
  );
}

/** 고른 반의 명단 ∪ 신호 집계 — 요약 넉 칸 + 학생 줄 표. `key={classId}` 로 반이 바뀌면 통째로 다시 선다. */
function ClassSignalsBoard({ classId }: { classId: string }) {
  const members = useClassMembersForMonitor(classId);
  const signals = useClassSignals(classId);

  const rows = useMemo(
    () => buildMonitorRows(members.data ?? [], signals.data?.summary ?? []),
    [members.data, signals.data],
  );

  if (members.isPending || signals.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const error = members.isError ? members.error : signals.isError ? signals.error : null;
  if (error !== null) {
    if (isUnauthorized(error)) return <ReadLoginGate label="학급 관제소" />;
    return (
      <ReadErrorState
        onRetry={() => {
          void members.refetch();
          void signals.refetch();
        }}
      />
    );
  }

  const flagged = rows.filter((r) => r.badge !== null);
  const unacked = flagged.reduce((n, r) => n + (r.badge?.unacked ?? 0), 0);
  const high = flagged.filter((r) => r.badge?.high).length;
  // 「n분 전」의 기준은 데이터를 읽은 시각(react-query `dataUpdatedAt`) — 렌더 안에서 시계를 읽지 않는다.
  const now = Math.max(members.dataUpdatedAt, signals.dataUpdatedAt);

  return (
    <>
      <KpiStatBar cols={4}>
        <KpiStat label="학생" value={`${rows.length}명`} />
        <KpiStat label="신호 있는 학생" value={`${flagged.length}명`} tone={flagged.length > 0 ? 'accent' : 'default'} />
        <KpiStat label="미확인 신호" value={`${unacked}건`} tone={unacked > 0 ? 'accent' : 'default'} />
        {/* 빨강은 세기 4 이상 한 칸에만 — 넉 칸이 줄줄이 빨가면 순위가 사라진다 */}
        <KpiStat label="세기 4 이상" value={`${high}명`} tone={high > 0 ? 'alert' : 'default'} />
      </KpiStatBar>

      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="학생 한 줄 보기" description="줄을 누르면 그 학생의 대화 기록과 신호로 가요." />
        {rows.length === 0 ? (
          <EmptyState
            tone="plain"
            size="sm"
            icon={Users}
            title="아직 들어온 학생이 없어요"
            description="학생이 참여 코드로 들어와 봇과 이야기하면 여기 보여요."
          />
        ) : (
          <SignalStudentTable
            label="학생 한 줄 보기"
            rows={rows}
            now={now}
            href={(row) => classTabHref(classId, 'chat', row.studentId)}
          />
        )}
      </section>
    </>
  );
}
