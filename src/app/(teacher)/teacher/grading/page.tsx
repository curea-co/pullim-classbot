import { ClipboardCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { GradingRow } from '@/components/classbot/grading-row';
import { gradingQueue, gradingStats, overriddenSample, type GradingItem } from '@/lib/mock';
import { cn } from '@/lib/utils';

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
    <div className="space-y-4 py-4 lg:py-6">
      <Link
        href="/teacher"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        교사 홈
      </Link>

      <PageHeader
        eyebrow={{ icon: ClipboardCheck, text: '채점 허브' }}
        title="AI 초안 검수"
        description="선생님은 마지막 검수자예요. AI가 만든 초안을 보고 필요하면 직접 정해주세요."
      />

      {/* KPI */}
      <section className="bg-card rounded-2xl border p-3">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="대기" value={`${gradingStats.totalQueue}건`} accent />
          <Kpi label="검토중" value={`${gradingStats.inReview}건`} />
          <Kpi label="오늘 승인" value={`${todayApproved}건`} />
          <Kpi label="평균 변경률" value={`${gradingStats.avgOverrideRate}%`} alert={gradingStats.avgOverrideRate >= 20} />
        </ul>
      </section>

      {/* 필터 */}
      <section className="bg-card rounded-2xl border p-3">
        <div className="space-y-2">
          <FilterChips label="상태" base="status" current={statusFilter} options={statusFilters as readonly { value: string; label: string }[]} keep={`type=${typeFilter}`} />
          <FilterChips label="타입" base="type"   current={typeFilter}   options={typeFilters as readonly { value: string; label: string }[]}   keep={`status=${statusFilter}`} />
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
    </div>
  );
}

function FilterChips({
  label, base, current, options, keep,
}: {
  label: string; base: string; current: string;
  options: readonly { value: string; label: string }[];
  keep: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-pullim-slate-400 w-10 shrink-0 text-[10px] font-bold tracking-wider uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => {
          const isActive = current === o.value;
          const href = `/teacher/grading?${base}=${o.value}&${keep}`;
          return (
            <Link
              key={o.value} href={href}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                isActive
                  ? 'bg-pullim-blue-600 text-white'
                  : 'bg-pullim-slate-100 text-pullim-slate-600 hover:bg-pullim-slate-200',
              )}
            >
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, alert }: { label: string; value: string; accent?: boolean; alert?: boolean }) {
  const valueClass =
    alert  ? 'text-pullim-danger'
    : accent ? 'text-pullim-blue-600'
    : 'text-pullim-slate-900';
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className="text-pullim-slate-500 text-[10px] font-semibold tracking-wider uppercase">{label}</div>
      <div className={cn('mt-0.5 font-mono text-base font-bold', valueClass)}>{value}</div>
    </li>
  );
}
