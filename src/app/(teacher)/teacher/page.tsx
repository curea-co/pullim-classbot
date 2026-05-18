import Link from 'next/link';
import {
  ArrowRight, Bot, Plus, Zap, ClipboardCheck, BarChart3, Radio,
  Clock, AlertTriangle, Heart, LayoutDashboard, MessageCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import {
  currentTeacher, myClassBot, classRoster, liveFeed, classKpis,
  upcomingLessons, pendingItems, scopeMeta,
} from '@/lib/mock';
import { SectionHeading } from '@/components/shell/section-heading';
import { CrisisInterventionPanel } from '@/components/classbot/crisis-intervention-panel';
import { cn } from '@/lib/utils';

export default function TeacherHomePage() {
  const alertStudents = classRoster.filter(s => !!s.alert).slice(0, 3);
  const recentQuestions = liveFeed.slice(0, 3);
  const scope = scopeMeta[myClassBot.scope];

  return (
    <div className="space-y-5 py-4 lg:py-6">
      <PageHeader
        eyebrow={{ icon: LayoutDashboard, text: '교사 대시보드' }}
        title={<>안녕하세요, <span className="text-pullim-blue-600">{currentTeacher.name}</span> 선생님</>}
        description={`${currentTeacher.organization} · 활성 봇 ${currentTeacher.activeBots}개 · 학생 ${currentTeacher.totalStudents}명`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="bg-pullim-slate-900 text-pullim-slate-300 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold opacity-70 cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              새 클래스봇
            </button>
            <Link
              href="/teacher/classbot"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              <Radio className="h-4 w-4" />
              라이브 수업 입장
            </Link>
          </div>
        }
      />

      {/* KPI 6종 */}
      <section className="bg-card rounded-2xl border p-3">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="오늘 수업" value={`${upcomingLessons.filter(l => l.status !== 'ended').length}건`} />
          <Kpi label="활성 학생" value={`${classKpis.liveStudents}/${classKpis.totalStudents}`} />
          <Kpi label="평균 정답률" value={`${classKpis.avgAccuracy}%`} accent />
          <Kpi label="질문 (1H)" value={`${classKpis.questionsLastHour}건`} />
          <Kpi label="채점 대기" value={`${pendingItems[0].count}건`} />
          <Kpi label="위기 알림" value={`${classKpis.burnoutAlerts}명`} alert={classKpis.burnoutAlerts > 0} />
        </ul>
      </section>

      {/* 메인 2-col */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 운영 중 봇 — 2col 점유 */}
        <section className="bg-card relative overflow-hidden rounded-2xl border lg:col-span-2">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-pullim-blue-500 via-pullim-danger to-pullim-lemon" aria-hidden />
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="bg-pullim-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                <span className="bg-white inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                LIVE
              </span>
              <span className="text-pullim-slate-500 text-xs font-semibold">
                현재 운영 중
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-pullim-blue-500 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl">
                🧑‍🏫
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-pullim-slate-900 text-lg font-bold tracking-tight">
                  {myClassBot.name}
                </h2>
                <p className="text-pullim-slate-500 text-xs">
                  {myClassBot.subject} · {myClassBot.grade} · {myClassBot.enrolledCount}명 등록
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-2 py-0.5 font-bold">
                    Scope {scope.short} · {scope.label}
                  </span>
                  <span className="bg-pullim-slate-100 text-pullim-slate-700 rounded-full px-2 py-0.5 font-bold">
                    {myClassBot.tone} 톤
                  </span>
                </div>
              </div>
              <Link
                href="/teacher/classbot"
                className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex shrink-0 items-center gap-0.5 text-xs font-bold"
              >
                상세 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {myClassBot.currentLesson && (
              <div className="bg-pullim-slate-50 mt-3 rounded-xl p-3">
                <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
                  지금 수업
                </div>
                <div className="text-pullim-slate-900 mt-0.5 text-sm font-bold">
                  {myClassBot.currentLesson.title}
                </div>
                <div className="text-pullim-slate-500 mt-0.5 flex items-center gap-3 text-[11px]">
                  <span>
                    <Clock className="mr-0.5 -mt-0.5 inline h-3 w-3" />
                    {myClassBot.currentLesson.startedAt} 시작
                  </span>
                  <span>
                    <Radio className="mr-0.5 -mt-0.5 inline h-3 w-3" />
                    {myClassBot.currentLesson.studentCount}/{myClassBot.enrolledCount}명 참여
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 위기 신호 — 카드 클릭 시 상세 모달 + 1:1 chat CTA */}
        <CrisisInterventionPanel students={alertStudents} />
      </div>

      {/* 최근 봇 질문 + 다가오는 수업 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title="최근 학생 봇 질문"
            description="지금 교실에서 오가는 대화"
            action={
              <Link href="/teacher/classbot" className="text-pullim-blue-600 text-xs font-bold inline-flex items-center gap-0.5">
                전체 피드 <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <ul className="space-y-2">
            {recentQuestions.map(q => (
              <li key={q.id} className="bg-pullim-slate-50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="bg-pullim-blue-600 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                    {q.studentName[0]}
                  </span>
                  <span className="text-pullim-slate-700 font-semibold">{q.studentName}</span>
                  <span className="text-pullim-slate-400">·</span>
                  <span className="text-pullim-slate-500 font-mono">{q.agoMin === 0 ? '방금' : `${q.agoMin}분 전`}</span>
                  {q.shared && (
                    <span className="bg-pullim-lemon text-pullim-lemon-ink ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                      전체 공유됨
                    </span>
                  )}
                </div>
                <p className="text-pullim-slate-900 mt-1 text-sm font-semibold">{q.question}</p>
                <p className="text-pullim-slate-500 mt-0.5 inline-flex items-center gap-1 text-[11px]">
                  <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="line-clamp-1">{q.botAnswerPreview}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title="다가오는 수업"
            description="오늘·내일·이번 주"
          />
          <ul className="space-y-2.5">
            {upcomingLessons.map(l => (
              <li key={l.id} className={cn(
                'rounded-lg border p-3',
                l.status === 'live' ? 'border-pullim-danger/30 bg-pullim-danger/5' : 'border-pullim-slate-200',
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-pullim-slate-500 font-mono text-xs font-bold">
                    {l.start}
                  </span>
                  {l.status === 'live' && (
                    <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <span className="bg-white inline-block h-1 w-1 animate-pulse rounded-full" />
                      LIVE
                    </span>
                  )}
                  <span className="text-pullim-slate-400 ml-auto text-[10px]">
                    준비도 {Math.round(l.prepReady * 100)}%
                  </span>
                </div>
                <div className="text-pullim-slate-900 mt-1 text-sm font-bold">
                  {l.title}
                </div>
                <div className="text-pullim-slate-500 text-[11px]">
                  {l.chapter} · {l.botName} · {l.studentCount}명
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 빠른 액션 */}
      <section>
        <SectionHeading title="빠른 액션" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <QuickAction
            Icon={Zap} label="즉석 퀴즈 쏘기"
            description="30초 내 5문항 생성"
            color="warn"
          />
          <QuickAction
            Icon={ClipboardCheck} label="채점 허브 열기"
            description={`${pendingItems[0].count}건 대기 중`}
            color="blue"
            href="/teacher/grading"
          />
          <QuickAction
            Icon={BarChart3} label="리포트 센터"
            description={`${pendingItems[1].count}건 승인 필요`}
            color="slate"
            href="/teacher/reports"
          />
          <QuickAction
            Icon={Bot} label="템플릿 찾기"
            description="동료 교사의 봇 복제"
            color="slate"
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label, value, accent, alert,
}: {
  label: string; value: string; accent?: boolean; alert?: boolean;
}) {
  const valueClass =
    accent ? 'text-pullim-blue-600'
    : alert ? 'text-pullim-danger'
    : 'text-pullim-slate-900';
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className="text-pullim-slate-500 text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-base font-bold ${valueClass}`}>{value}</div>
    </li>
  );
}

function QuickAction({
  Icon, label, description, color, href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; description: string;
  color: 'warn' | 'blue' | 'slate';
  href?: string;
}) {
  const colorClass =
    color === 'warn'  ? 'bg-pullim-blue-100 text-pullim-blue-700 hover:bg-pullim-blue-200/70'
    : color === 'blue' ? 'bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100'
    : 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200';
  const className = cn('flex flex-col items-start gap-1 rounded-xl p-3.5 text-left transition-colors', colorClass);
  const inner = (
    <>
      <Icon className="h-5 w-5" />
      <div className="text-sm font-bold">{label}</div>
      <div className="text-[11px] opacity-80">{description}</div>
    </>
  );
  if (href) return <Link href={href} className={className}>{inner}</Link>;
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="준비 중 (v2)"
      className={cn(className, 'opacity-60 cursor-not-allowed')}
    >
      {inner}
    </button>
  );
}
