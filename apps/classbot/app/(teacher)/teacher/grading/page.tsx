import { ClipboardCheck } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { FilterPills } from '@/components/classbot/filter-pills';
import { gradingStats } from '@/lib/mock';
import { allGradingItems } from '@/lib/mock/classbot-grading-roster';
import { monitoredRoster } from '@/lib/mock/classbot-monitoring';
import { GradingKpiBar, GradingQueueList } from './grading-queue';
import { GradingStudentList } from './grading-student-list';
import { toStudentFilter, toStudentSort } from './grading-filters';

type SearchParams = Promise<{
  view?: string;
  /** 큐 탭 */
  status?: string;
  type?: string;
  /** 학생 탭 */
  filter?: string;
  sort?: string;
}>;

/**
 * 채점 허브 — spec 11.
 *
 * 화면 두 벌을 한 라우트 안에서 **탭으로** 가른다 (spec 11 § 3.2).
 *   - `?view=students` (기본) 등록된 학생 **전체**. 채점 대기가 0건인 학생도 남는다
 *   - `?view=queue`           오늘 검수할 것만 — 상태·타입 거르개와 신뢰도 정렬
 *
 * 거르개를 한 화면에 겹쳐 두지 않는다. 학생 목록의 거르개(도달·접속·채점 대기)와
 * 큐의 거르개(상태·타입)는 서로 다른 것을 거른다 — 함께 두면 지금 뭐가 걸려 있는지 읽을 수 없다.
 */

const views = [
  { value: 'students', label: '학생 전체' },
  { value: 'queue',    label: '채점 대기 큐' },
] as const;

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
  // 기본은 학생 전체 — 큐만 보이면 오늘 제출하지 않은 학생이 화면에서 사라진다.
  const view = params.view === 'queue' ? 'queue' : 'students';
  const statusFilter = params.status ?? 'queue';
  const typeFilter = params.type ?? 'all';
  // 거르개·정렬은 URL 이 1차 (spec 11 § 10) — 큐 탭의 status·type 과 같은 결.
  const studentFilter = toStudentFilter(params.filter);
  const studentSort = toStudentSort(params.sort);

  // 시드 목록만 서버에서 만든다 — 교사가 확정한 채점(localStorage)을 얹어 세고 거르는 건
  // 클라이언트 컴포넌트(GradingKpiBar · GradingStudentList · GradingQueueList) 몫이다.
  const allItems = allGradingItems;

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
      {/* KPI — 두 탭에서 같은 값을 본다 */}
      <GradingKpiBar items={allItems} />

      {/* 탭 + 그 탭의 거르개 */}
      <section className="bg-card rounded-2xl border p-4">
        <div className="space-y-3">
          <FilterPills
            label="보기"
            options={views}
            current={view}
            href={v => (v === 'queue' ? '/teacher/grading?view=queue' : '/teacher/grading')}
          />
          {view === 'queue' && (
            <>
              <FilterPills
                label="상태"
                options={statusFilters}
                current={statusFilter}
                href={v => `/teacher/grading?view=queue&status=${v}&type=${typeFilter}`}
              />
              <FilterPills
                label="타입"
                options={typeFilters}
                current={typeFilter}
                href={v => `/teacher/grading?view=queue&type=${v}&status=${statusFilter}`}
              />
            </>
          )}
        </div>
      </section>

      {view === 'students' ? (
        // 뒤로 가기로 URL 이 바뀌면 key 가 바뀌어 목록이 새 조건으로 다시 선다.
        <GradingStudentList
          key={`${studentFilter}-${studentSort}`}
          students={monitoredRoster}
          items={allItems}
          filter={studentFilter}
          sort={studentSort}
        />
      ) : (
        <GradingQueueList items={allItems} statusFilter={statusFilter} typeFilter={typeFilter} />
      )}

      <FlywheelNote>
        {view === 'students' ? (
          <>
            검수할 게 없는 학생도 목록에 남겨 둬요. 큐만 보면
            {' '}<strong>진행률에 안 잡히는 학생</strong>이 화면에서 사라지거든요.
          </>
        ) : (
          <>
            교사 검수 변경률이 누적 <strong>{gradingStats.rubricLearningThreshold}%</strong>를 넘으면 루브릭이 학생 답과 어긋난다는 신호 — 자동으로 재학습 제안이 떠요.
          </>
        )}
      </FlywheelNote>
    </TeacherPageShell>
  );
}
