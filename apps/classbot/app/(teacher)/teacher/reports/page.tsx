import { BarChart3 } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { ReportRow } from '@/components/classbot/report-row';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { FilterPills } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { reports, crisisAlerts, type ReportKind } from '@/lib/mock';
import { monitoredRoster } from '@/lib/mock/classbot-monitoring';
import { countAttentionStudents } from '@/lib/mock/classbot-teacher-home';
import { ReportRoster } from './report-roster';

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

/**
 * 리포트 센터 ([13 § 3.3.1]) — 두 가지를 함께 맡는다.
 *   ① 자동 생성된 리포트 6종 검토·발송
 *   ② **등록된 학생 전원** 명단 — 거르기·정렬로 먼저 볼 학생 찾기
 *
 * ②가 있어야 하는 이유: 리포트는 일부 학생·학급·기간에만 생성된다.
 * ①만 두면 리포트가 아직 없는 학생은 이 화면에서 사라져, 교사가 여기서 학생을 찾을 수 없다.
 *
 * 명단이 읽는 학생 원천은 관제소·교사 홈과 **같은 곳**(`monitoredRoster`)이다.
 * 리포트(`ReportSummary`)에는 학생 id 필드가 없고 `title`·`subject` 문자열의 이름으로만 학생을 가리킨다.
 * 그 이름이 가리키는 쪽은 `classRoster`(`s1`…)이고 명단은 다른 id 체계(`m01`…)라 학급 스냅샷도 다르다
 * (리포트: 중2 수학 A반 / 명단: 중1-3반 과학). 그래서 **지금은** 잇지 않는다 —
 * 이름 문자열 대조로 이으면 동명이인·학급 불일치를 그대로 지나친다.
 */
export default async function TeacherReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const kindFilter = (params.kind ?? 'all') as 'all' | ReportKind;

  const filtered = reports.filter(r => kindFilter === 'all' || r.kind === kindFilter);

  const pendingCount = reports.filter(r => r.status === 'pending-approval').length;
  const draftCount = reports.filter(r => r.status === 'draft').length;
  const activeCrises = crisisAlerts.filter(c => !c.resolved).length;
  // 교사 홈 「먼저 볼 학생」과 같은 판정으로 센다 — 아래 명단의 같은 이름 거르개와도 같은 숫자다.
  const attentionCount = countAttentionStudents(monitoredRoster);

  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: BarChart3, text: '리포트 센터' },
        title: '리포트와 학생 명단',
      }}
    >
      {/* KPI */}
      <KpiStatBar cols={4}>
        <KpiStat label="발송 대기" value={`${pendingCount}건`} tone="accent" />
        <KpiStat label="초안" value={`${draftCount}건`} />
        <KpiStat label="위기 알림" value={`${activeCrises}건`} tone={activeCrises > 0 ? 'alert' : 'default'} />
        <KpiStat label="먼저 볼 학생" value={`${attentionCount}명`} tone={attentionCount > 0 ? 'alert' : 'default'} />
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
          <EmptyState icon={BarChart3} title="아직 생성된 리포트가 없어요" description="매일 19:50 자동 생성돼요." size="md" />
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

      {/* 등록 학생 전원 — 리포트가 없는 학생도 여기에 있다 */}
      <ReportRoster students={monitoredRoster} />

      <FlywheelNote>
        승인된 리포트는 24시간 안에 카카오톡으로 자동 발송돼요.
      </FlywheelNote>
    </TeacherPageShell>
  );
}

