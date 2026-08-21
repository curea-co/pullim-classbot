'use client';

import { useMemo } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { GradingRow } from '@/components/classbot/grading-row';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { EmptyState } from '@/components/classbot/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { gradingStats, type GradingItem } from '@/lib/mock';
import { useGradingStore, useMergedGradingItems } from '@/lib/store/grading';
import { useStoresHydrated } from '@/lib/store/use-hydrated';

/**
 * 채점 큐 KPI · 목록 — 교사가 확정한 채점(useGradingStore)을 mock 시드 위에 덮어쓴 뒤 센다/거른다.
 * 확정한 항목은 「대기」에서 빠지고 「승인됨 / 오버라이드」로 바뀐다.
 *
 * persist rehydrate 전에는 확정을 알 수 없다 — 잘못된 상태가 번쩍이지 않게
 * `useStoresHydrated` 가 true 가 될 때까지 자리만 잡아 둔다(스켈레톤 · 값 '—').
 */

/** KPI 4종 — 대기/검토중/오늘 승인은 확정 반영본에서 센다(평균 변경률은 mock 지표 그대로). */
export function GradingKpiBar({ items }: { items: GradingItem[] }) {
  const hydrated = useStoresHydrated(useGradingStore);
  const merged = useMergedGradingItems(items);

  const counts = useMemo(() => ({
    queue: merged.filter((i) => i.status === 'queue').length,
    reviewing: merged.filter((i) => i.status === 'reviewing').length,
    // 확정 2종 모두 「오늘 승인」 — 수정 후 승인도 교사가 끝낸 채점이다.
    approved: merged.filter((i) => i.status === 'approved' || i.status === 'overridden').length,
  }), [merged]);

  const value = (n: number) => (hydrated ? `${n}건` : '—');

  return (
    <KpiStatBar cols={4}>
      <KpiStat label="대기" value={value(counts.queue)} tone="accent" />
      <KpiStat label="검토중" value={value(counts.reviewing)} />
      <KpiStat label="오늘 승인" value={value(counts.approved)} />
      <KpiStat
        label="평균 변경률"
        value={`${gradingStats.avgOverrideRate}%`}
        tone={gradingStats.avgOverrideRate >= 20 ? 'alert' : 'default'}
      />
    </KpiStatBar>
  );
}

/** 상태·타입 필터를 적용한 검수 목록 — AI 신뢰도 낮은 순(위기 신호 우선). */
export function GradingQueueList({
  items, statusFilter, typeFilter,
}: {
  items: GradingItem[];
  statusFilter: string;
  typeFilter: string;
}) {
  const hydrated = useStoresHydrated(useGradingStore);
  const merged = useMergedGradingItems(items);

  const sorted = useMemo(() => {
    const filtered = merged.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      return true;
    });
    // AI 신뢰도 낮은 순 정렬 (위기 신호 우선)
    return [...filtered].sort((a, b) => a.aiConfidence - b.aiConfidence);
  }, [merged, statusFilter, typeFilter]);

  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title={hydrated ? `검수 대기 ${sorted.length}건` : '검수 대기'}
        description="AI 신뢰도가 낮은 순으로 보여요."
      />
      {!hydrated ? (
        <ul className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i}><Skeleton className="h-24 w-full rounded-xl" /></li>
          ))}
        </ul>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="검수할 채점이 없어요"
          description="학생들이 새로 제출하면 여기에 쌓여요."
          size="md"
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((item) => <GradingRow key={item.id} item={item} />)}
        </ul>
      )}
    </section>
  );
}
