import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ReportRow } from '@/components/classbot/report-row';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { FilterPills } from '@/components/classbot/filter-pills';
import { reports, crisisAlerts, type ReportKind } from '@/lib/mock';

type SearchParams = Promise<{ kind?: string; status?: string }>;

const kindFilters: { value: 'all' | ReportKind; label: string }[] = [
  { value: 'all',         label: '전체' },
  { value: 'parent',      label: '학부모' },
  { value: 'student',     label: '학생' },
  { value: 'lesson-end',  label: '수업 종료' },
  { value: 'class',       label: '학급' },
  { value: 'period',      label: '기간' },
  { value: 'realtime',    label: '실시간' },
];

export default async function TeacherReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const kindFilter = (params.kind ?? 'all') as 'all' | ReportKind;

  const filtered = reports.filter(r => kindFilter === 'all' || r.kind === kindFilter);

  const pendingCount = reports.filter(r => r.status === 'pending-approval').length;
  const draftCount = reports.filter(r => r.status === 'draft').length;
  const activeCrises = crisisAlerts.filter(c => !c.resolved).length;

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
        eyebrow={{ icon: BarChart3, text: '리포트 센터' }}
        title="6종 리포트"
        description="자동 생성된 리포트를 검토하고 학부모께 발송해주세요."
      />

      {/* KPI */}
      <KpiStatBar cols={3}>
        <KpiStat label="발송 대기" value={`${pendingCount}건`} tone="accent" />
        <KpiStat label="초안" value={`${draftCount}건`} />
        <KpiStat label="위기 알림" value={`${activeCrises}건`} tone={activeCrises > 0 ? 'alert' : 'default'} />
      </KpiStatBar>

      {/* 필터 */}
      <section className="bg-card rounded-2xl border p-3">
        <FilterPills
          options={kindFilters}
          current={kindFilter}
          href={(v) => `/teacher/reports?kind=${v}`}
        />
      </section>

      {/* 리포트 목록 */}
      <section className="bg-card rounded-2xl border p-4">
        <SectionHeading title={`리포트 ${filtered.length}건`} description="위기 신호 있는 항목이 우선 정렬돼요." />
        {filtered.length === 0 ? (
          <p className="text-pullim-slate-500 py-12 text-center text-sm">
            아직 생성된 리포트가 없어요. 매일 19:50 자동 생성돼요.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered
              .sort((a, b) => {
                const aHas = (a.alerts?.length ?? 0) > 0 ? 0 : 1;
                const bHas = (b.alerts?.length ?? 0) > 0 ? 0 : 1;
                return aHas - bHas;
              })
              .map(r => <ReportRow key={r.id} report={r} />)}
          </ul>
        )}
      </section>

      <FlywheelNote>
        승인된 리포트는 24시간 안에 카카오톡으로 자동 발송돼요. 학부모 열람률은 다음 주 KPI에 반영돼요.
      </FlywheelNote>
    </div>
  );
}

