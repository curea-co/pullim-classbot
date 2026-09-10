import Link from 'next/link';
import {
  ArrowRight, ChevronRight, ClipboardCheck, LayoutDashboard, Plus, Send,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { EmptyState } from '@/components/classbot/empty-state';
import { currentTeacher, pendingItems, type PendingItem } from '@/lib/mock';
import { monitoredClass, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { AttentionRoster } from './attention-roster';
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
    <div className="space-y-7">
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
      <div className="space-y-2">
        <KpiStatBar cols={4}>
          <KpiStat
            label="도달"
            value={`${monitoringSummary.reached}/${monitoringSummary.total}명`}
            tone="accent"
          />
          {/*
            빨강은 네 숫자 가운데 **하나**만 쓴다 — 셋 다 빨가면 어느 것도 급해 보이지 않는다.
            봇이 아예 닿지 못한 학생(미도달)이 유일하게 「무너진 상태」다.
            나머지 둘은 라벨(「목표 수준 미달」·「오늘 안 들어옴」)이 이미 뜻을 다 말한다.
          */}
          <KpiStat label="미도달" value={`${monitoringSummary.notReached}명`} tone="alert" />
          <KpiStat label="목표 수준 미달" value={`${monitoringSummary.depthShort}명`} />
          <KpiStat label="오늘 안 들어옴" value={`${monitoringSummary.offlineToday}명`} />
        </KpiStatBar>
        <p className="text-pullim-slate-500 px-1 text-2xs font-semibold">
          {`${monitoredClass.classroomLabel} · ${monitoredClass.botName} · ${monitoredClass.unit} · ${monitoredClass.updatedAtLabel}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 오늘 먼저 볼 사람 — 이 화면의 본체 */}
        <section className="bg-card rounded-2xl border p-5 lg:col-span-2">
          <SectionHeading
            title="먼저 볼 학생"
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
              <AttentionRoster students={attention.map(a => a.student)} />

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
                    className="bg-pullim-slate-50 hover:bg-pullim-slate-100 flex items-center gap-2.5 rounded-lg px-3.5 py-3 transition-colors"
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

/** 처리 대기 항목이 실제로 끝나는 자리 — mock 의 href 는 아직 앵커라 여기서 라우트로 잇는다. */
const pendingHref: Record<PendingItem['type'], string> = {
  // 「나를 기다리는 일」은 검수할 것만 가리킨다 — 채점 허브 기본 화면(학생 전체)이 아니라 큐로 보낸다.
  grading: '/teacher/grading?view=queue',
  report: '/teacher/reports',
  approval: '/teacher/bots',
};
