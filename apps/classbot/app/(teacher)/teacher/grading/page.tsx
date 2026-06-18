import { ClipboardCheck } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { GradingRow } from '@/components/classbot/grading-row';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { FilterPills } from '@/components/classbot/filter-pills';
import { gradingQueue, gradingStats, overriddenSample, type GradingItem } from '@/lib/mock';

type SearchParams = Promise<{ status?: string; type?: string }>;

const statusFilters = [
  { value: 'all',        label: '전체' },
  { value: 'queue',      label: '대기' },
  { value: 'reviewing',  label: '검토중' },
  { value: 'approved',   label: '완료' },
  { value: 'overridden', label: '오버라이드' },
] as const;

const typeFilters = [
  { value: 'all',     label: '전체' },
  { value: 'essay',   label: '서술형' },
  { value: 'short',   label: '단답' },
  { value: 'numeric', label: '수치' },
] as const;

export default async function TeacherGradingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const statusFilter = params.status ?? 'queue';
  const typeFilter = params.type ?? 'all';

  const allItems: GradingItem[] = [...gradingQueue, overriddenSample];

  const filtered = allItems.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  // AI 신뢰도 낮은 순 정렬 (위기 신호 우선)
  const sorted = [...filtered].sort((a, b) => a.aiConfidence - b.aiConfidence);

  const todayApproved = allItems.filter(i => i.status === 'approved').length;

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: ClipboardCheck, text: '채점 허브' },
        title: 'AI 초안 검수',
        description: '선생님은 마지막 검수자예요. AI가 만든 초안을 보고 필요하면 직접 정해주세요.',
      }}
    >
      {/* KPI */}
      <KpiStatBar cols={4}>
        <KpiStat label="대기" value={`${gradingStats.totalQueue}건`} tone="accent" />
        <KpiStat label="검토중" value={`${gradingStats.inReview}건`} />
        <KpiStat label="오늘 승인" value={`${todayApproved}건`} />
        <KpiStat label="평균 변경률" value={`${gradingStats.avgOverrideRate}%`} tone={gradingStats.avgOverrideRate >= 20 ? 'alert' : 'default'} />
      </KpiStatBar>

      {/* 필터 */}
      <section className="bg-card rounded-2xl border p-3">
        <div className="space-y-2">
          <FilterPills
            label="상태"
            options={statusFilters}
            current={statusFilter}
            href={(v) => `/teacher/grading?status=${v}&type=${typeFilter}`}
          />
          <FilterPills
            label="타입"
            options={typeFilters}
            current={typeFilter}
            href={(v) => `/teacher/grading?type=${v}&status=${statusFilter}`}
          />
        </div>
      </section>

      {/* 큐 */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading
          title={`검수 대기 ${sorted.length}건`}
          description="AI 신뢰도 낮은 순 — 신경 쓸 학생부터 보여요."
        />
        {sorted.length === 0 ? (
          <p className="text-pullim-slate-500 py-12 text-center text-sm">
            검수할 채점이 없어요. 학생들이 새로 제출하면 여기에 쌓여요.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map(item => <GradingRow key={item.id} item={item} />)}
          </ul>
        )}
      </section>

      <FlywheelNote>
        교사 검수 변경률이 누적 <strong>{gradingStats.rubricLearningThreshold}%</strong>를 넘으면 루브릭이 학생 답과 어긋난다는 신호 — 자동으로 재학습 제안이 떠요.
      </FlywheelNote>
    </TeacherPageShell>
  );
}
