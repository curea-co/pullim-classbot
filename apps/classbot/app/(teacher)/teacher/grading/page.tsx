import { ClipboardCheck } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { FilterPills } from '@/components/classbot/filter-pills';
import { gradingQueue, gradingStats, overriddenSample, type GradingItem } from '@/lib/mock';
import { GradingKpiBar, GradingQueueList } from './grading-queue';

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

  // 시드 목록만 서버에서 만든다 — 교사가 확정한 채점(localStorage)을 얹어 세고 거르는 건
  // 클라이언트 컴포넌트(GradingKpiBar · GradingQueueList) 몫이다.
  const allItems: GradingItem[] = [...gradingQueue, overriddenSample];

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
      <GradingKpiBar items={allItems} />

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
      <GradingQueueList items={allItems} statusFilter={statusFilter} typeFilter={typeFilter} />

      <FlywheelNote>
        교사 검수 변경률이 누적 <strong>{gradingStats.rubricLearningThreshold}%</strong>를 넘으면 루브릭이 학생 답과 어긋난다는 신호 — 자동으로 재학습 제안이 떠요.
      </FlywheelNote>
    </TeacherPageShell>
  );
}
