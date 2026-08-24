import Link from 'next/link';
import {
  ArrowRight, ChevronRight, ClipboardCheck, LayoutDashboard, Plus, Send,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { EmptyState } from '@/components/classbot/empty-state';
import { LastSeenBadge, StudentReachBadge } from '@/components/classbot/roster-badges';
import { currentTeacher, pendingItems, type PendingItem } from '@/lib/mock';
import {
  monitoredClass, monitoringSummary, stuckConceptLabel, type MonitoredStudent,
} from '@/lib/mock/classbot-monitoring';
import { countAttentionStudents, pickAttentionStudents } from '@/lib/mock/classbot-teacher-home';

/**
 * 교사 홈 (대시보드) — 「지금 뭐부터 손대지」 한 화면.
 *
 * 홈과 학급 관제소의 경계:
 *   - 홈       = 오늘 **먼저 볼 사람**과 **나를 기다리는 일**. 예외만 짧게, 상세는 넘긴다.
 *   - 관제소   = 학급 전체 진단 — 다시 가르칠 개념 + 학생 20줄 + 필터.
 * 예전 홈은 관제소를 통째로 복사해 두고 있었다(다시 가르칠 개념 + 학생 20줄).
 * 같은 것을 두 번 보여주면 어느 화면이 최신인지 교사가 알 수 없어 홈에서 걷어냈다.
 *
 * 걷어낸 것과 이유:
 *   - 위기 신호 패널        — 감정 체크인·웰빙 점수가 근거였다. 감정 지표는 담지 않기로 한 값이다
 *   - 다가오는 수업         — 라이브 수업은 기획 보류. 클래스봇은 방송하는 곳이 아니다
 *   - 운영 중 봇 카드       — 봇 운영은 「내 클래스봇」 몫. 홈에서 두 번 관리하지 않는다
 *   - 최근 학생 봇 질문     — 무엇이 논의되는지만 보여주고 무엇을 할지는 안 알려주는 피드
 *   - 다시 가르칠 개념·학생 20줄 — 관제소 몫
 *   - 빠른 액션 4칸         — 왼쪽 메뉴와 아래 「나를 기다리는 일」이 이미 같은 곳으로 간다
 *
 * 상단 카드에는 이동 링크를 달지 않는다. 숫자는 읽는 값이고, 이동은 아래 목록에서 한다.
 * 아래 줄의 배지 두 벌이 그 카드 넉 장을 그대로 가리킨다 —
 * 도달 배지(도달 · 미달 · 미도달)가 앞 세 장, 최근 접속 배지가 「오늘 안 들어옴」이다.
 */
export default function TeacherHomePage() {
  const attention = pickAttentionStudents();
  const attentionTotal = countAttentionStudents();

  return (
    <div className="space-y-5 py-4 lg:py-6">
      <PageHeader
        eyebrow={{ icon: LayoutDashboard, text: '교사 대시보드' }}
        title={<>안녕하세요, <span className="text-pullim-blue-600">{currentTeacher.name}</span> 선생님</>}
        description={`${currentTeacher.organization} · 활성 봇 ${currentTeacher.activeBots}개 · 학생 ${currentTeacher.totalStudents}명`}
        action={
          <div className="flex gap-2">
            <Link
              href="/teacher/builder"
              className="bg-pullim-slate-900 hover:bg-pullim-slate-800 text-white inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold"
            >
              <Plus className="h-4 w-4" />
              새 클래스봇
            </Link>
            {/* 기획 보류 — 라이브 수업 입장. 재개 시 되살린다 */}
            <Link
              href="/teacher/assignment/new"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              <Send className="h-4 w-4" />
              과제 내기
            </Link>
          </div>
        }
      />

      {/*
        읽는 숫자 4개 — 링크를 달지 않는다.
        총량 사용 지표(대화 수 같은 합계)는 담지 않는다. 교사 워크숍에서 노이즈로 분류된 값이다.
        지름길 시도는 학생 분류용 숫자가 아니라 과제 설계 신호라 관제소 명단 아래로 내렸다.
      */}
      <div className="space-y-1.5">
        <KpiStatBar cols={4}>
          <KpiStat
            label="도달"
            value={`${monitoringSummary.reached}/${monitoringSummary.total}명`}
            tone="accent"
          />
          <KpiStat label="미도달" value={`${monitoringSummary.notReached}명`} tone="alert" />
          <KpiStat label="목표 수준 미달" value={`${monitoringSummary.depthShort}명`} tone="alert" />
          <KpiStat label="오늘 안 들어옴" value={`${monitoringSummary.offlineToday}명`} tone="alert" />
        </KpiStatBar>
        <p className="text-pullim-slate-400 px-1 text-micro font-semibold">
          {`${monitoredClass.classroomLabel} · ${monitoredClass.botName} · ${monitoredClass.unit} · ${monitoredClass.updatedAtLabel}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 오늘 먼저 볼 사람 — 이 화면의 본체 */}
        <section className="bg-card rounded-2xl border p-5 lg:col-span-2">
          <SectionHeading
            title="먼저 볼 학생"
            description="오늘 안 들어왔거나, 성취기준에 못 닿았거나, 목표 수준에 못 미친 학생이에요."
            action={
              <Link
                href="/teacher/monitor"
                className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-0.5 text-xs font-bold"
              >
                학급 관제소 <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />

          {attention.length === 0 ? (
            <EmptyState
              tone="plain"
              size="sm"
              title="먼저 볼 학생이 없어요"
              description="오늘은 모두 한 번씩 들어왔고 성취기준까지 닿았어요"
            />
          ) : (
            <>
              <ul className="divide-pullim-slate-100 divide-y">
                {attention.map(({ student }) => (
                  <AttentionRow key={student.id} student={student} />
                ))}
              </ul>

              {attentionTotal > attention.length && (
                <p className="text-pullim-slate-500 mt-3 text-2xs leading-relaxed">
                  먼저 볼 학생 <b className="text-pullim-slate-700 font-mono">{`${attentionTotal}명`}</b> 가운데
                  {` ${attention.length}명만 보여줘요. `}
                  나머지와 <b className="text-pullim-slate-700">다시 가르칠 개념</b>은 학급 관제소에 있어요.
                </p>
              )}
            </>
          )}
        </section>

        {/* 나를 기다리는 일 — 학생이 아니라 교사가 처리할 것. 위 카드는 학급 숫자만 담는다 */}
        <section className="bg-card h-fit rounded-2xl border p-5">
          <SectionHeading title="나를 기다리는 일" />
          {pendingItems.length === 0 ? (
            <EmptyState tone="plain" size="sm" title="기다리는 일이 없어요" />
          ) : (
            <ul className="space-y-2">
              {pendingItems.map(item => (
                <li key={item.id}>
                  <Link
                    href={pendingHref[item.type]}
                    className="bg-pullim-slate-50 hover:bg-pullim-slate-100 flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <ClipboardCheck className="text-pullim-slate-400 h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-pullim-slate-900 min-w-0 flex-1 truncate text-sm font-bold">
                      {item.label}
                    </span>
                    <span className="text-pullim-slate-700 shrink-0 font-mono text-sm font-bold">
                      {`${item.count}건`}
                    </span>
                    <ChevronRight className="text-pullim-slate-400 h-3 w-3 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * 먼저 볼 학생 한 줄 — 줄 전체가 그 학생의 기록으로 가는 링크 하나다.
 *
 * 줄 안에 또 다른 누를 것을 두지 않는다. 예전에는 오른쪽 끝에 작은 글씨 이동 문구가 있었는데
 * 줄 링크와 같은 곳으로 가면서 글자만 작아 누르기 어려웠다 — 상단 카드에서 걷어낸 것과 같은 이유다.
 *
 * 상태는 배지 두 벌이 말하니(도달 · 최근 접속) 「오늘 안 들어왔어요」 같은 설명문은 겹친다.
 * 그 자리에는 배지가 말하지 못하는 것 — 대화에서 어디가 막혔는지 — 를 둔다.
 */
function AttentionRow({ student }: { student: MonitoredStudent }) {
  const stuck = stuckConceptLabel(student);

  return (
    <li>
      <Link
        href={`/teacher/students/${student.id}`}
        className="hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 sm:grid-cols-[8rem_minmax(0,1fr)_3.5rem_5rem_auto]"
      >
        <span className="flex items-center gap-2">
          <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
            {student.name.slice(1, 2)}
          </span>
          <span className="min-w-0">
            <span className="text-pullim-slate-900 block text-sm leading-tight font-bold">
              {student.name}
            </span>
            <span className="text-pullim-slate-500 text-micro">{student.grade}</span>
          </span>
        </span>

        {/* 배지가 말하지 못하는 것 — 대화에서 막힌 자리 */}
        <span className="text-pullim-slate-600 min-w-0 truncate text-2xs">
          {stuck ? `막힌 곳 · ${stuck}` : '아직 막힌 곳이 안 보여요'}
        </span>

        {/* 도달 배지 — 상단 카드 도달 · 미도달 · 목표 수준 미달과 같은 판정 */}
        <StudentReachBadge student={student} />

        {/*
          최근 접속 배지 — 상단 카드 「오늘 안 들어옴」과 같은 선.
          좁은 화면에서는 꺾쇠와 한 칸에 붙어 다니고, 넓은 화면에서는 제 열로 돌아간다.
        */}
        <span className="ml-auto flex items-center gap-1 sm:contents">
          <LastSeenBadge student={student} />
          <ChevronRight className="text-pullim-slate-400 ml-auto h-4 w-4 shrink-0" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

/** 처리 대기 항목이 실제로 끝나는 자리 — mock 의 href 는 아직 앵커라 여기서 라우트로 잇는다. */
const pendingHref: Record<PendingItem['type'], string> = {
  grading: '/teacher/grading',
  report: '/teacher/reports',
  approval: '/teacher/settings',
};
