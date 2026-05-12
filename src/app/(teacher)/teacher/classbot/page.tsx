'use client';

import Link from 'next/link';
import { Bot, Send, Plus, Sparkles, Clock, Target, AlertCircle, AlertTriangle, History, ArrowRight, Inbox } from 'lucide-react';
import { ClassKpiBar } from '@/components/classbot/class-kpi-bar';
import { ScopeControl } from '@/components/classbot/scope-control';
import { StudentRoster } from '@/components/classbot/student-roster';
import { LiveFeedPanel } from '@/components/classbot/live-feed-panel';
import { QuizLauncher } from '@/components/classbot/quiz-launcher';
import { myClassBot, studentAssignments, type Assignment } from '@/lib/mock';
import { useAssignmentStore, useAssignmentProgress } from '@/lib/store/assignments';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { SectionHeading } from '@/components/shell/section-heading';
import { cn } from '@/lib/utils';

export default function TeacherClassbotPage() {
  return (
    <div className="space-y-4 py-4 lg:py-6">
      <PageHeader
        eyebrow={{ icon: Bot, text: '클래스봇 운영' }}
        title={
          <>{myClassBot.name} <span className="text-pullim-slate-400 text-base font-medium">— {myClassBot.subject} {myClassBot.grade}</span></>
        }
        description={`${myClassBot.currentLesson?.title} · 라이브 진행 중`}
        action={
          <Link
            href="/teacher/replay/rp_004"
            aria-label="수업 종료 후 리플레이 생성"
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white lg:px-4"
          >
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden lg:inline">수업 종료 → 리플레이 생성</span>
            <span className="lg:hidden">수업 종료</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />

      {/* KPI */}
      <ClassKpiBar />

      {/* Scope Control */}
      <ScopeControl />

      {/* 오늘 발사한 과제 — Assignment 데이터 흐름 진입점 */}
      <DispatchedAssignments />

      {/* 메인 3-pane (lg+) — 학생 명단 / 라이브 피드 / 퀴즈 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <div className="min-h-[480px]">
          <StudentRoster />
        </div>
        <div className="min-h-[480px]">
          <LiveFeedPanel />
        </div>
        <div className="space-y-4">
          <QuizLauncher />
          <aside className="bg-pullim-slate-900 text-pullim-slate-200 rounded-2xl p-4 text-xs leading-relaxed">
            <strong className="text-pullim-lemon flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" aria-hidden /> 위기 신호 알림</strong>
            <ul className="mt-1.5 space-y-1 text-pullim-slate-300">
              <li>• <strong className="text-white">예은</strong> — 22분 무응답 + 웰빙 급락</li>
              <li>• <strong className="text-white">도현</strong> — 감정 체크인 3일 연속 “힘듦”</li>
            </ul>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="준비 중 (v2 — Wee센터 연계)"
              className="bg-pullim-lemon text-pullim-lemon-ink mt-3 w-full rounded-lg py-1.5 text-[11px] font-bold opacity-60 cursor-not-allowed"
            >
              1:1 상담 시작 / Wee센터 연결 (v2)
            </button>
          </aside>
        </div>
      </div>

      <FlywheelNote>
        학생 질문·오답·감정 데이터는 익명화되어 사고유도 모델로 흘러가고, 자주 막힌 패턴은 학생의 <strong>풀림 복습</strong>에 처방으로 자동 추가돼요.
      </FlywheelNote>
    </div>
  );
}

/* ─── 오늘 발사한 과제 — 봇이 학생에게 보낸 풀이 컨텍스트 ─── */
const modeMeta = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-500',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-warn',        icon: Sparkles },
} as const;

function DispatchedAssignments() {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const submissions = useAssignmentStore((s) => s.submissions);
  const assignments = [...dispatched, ...studentAssignments];
  const totalSent = assignments.reduce((s, a) => s + (a.assignedAt.includes('오늘') || a.assignedAt.includes('방금') ? 1 : 0), 0);
  // 진행률 합산은 store submission 기준 — 실시간 반영
  const totalCompleted = assignments.reduce((s, a) => {
    const mine = submissions.filter((sub) => sub.assignmentId === a.id);
    const submittedStudentCount = new Set(mine.map((sub) => sub.studentId)).size;
    return s + Math.min(a.completedCount + submittedStudentCount, a.questionCount);
  }, 0);
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const totalPending = totalQuestions - totalCompleted;

  return (
    <section data-testid="dispatched-section" className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="발사한 과제"
        description={`오늘 ${totalSent}건 · 학생 풀이 진행 ${totalCompleted}/${totalCompleted + totalPending}문항`}
        action={
          <Link
            href="/teacher/assignment/new"
            data-testid="new-assignment-cta"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            새 과제
          </Link>
        }
      />
      {assignments.length === 0 ? (
        <div className="bg-pullim-slate-50 border-pullim-slate-200 flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
          <span className="bg-pullim-slate-100 text-pullim-slate-500 flex h-9 w-9 items-center justify-center rounded-lg">
            <Inbox className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-pullim-slate-900 text-sm font-bold">아직 발사한 과제가 없어요</p>
          <p className="text-pullim-slate-500 text-[11px]">위의 [+ 새 과제] 버튼으로 첫 과제를 만들어 보세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {assignments.map(a => <DispatchedRow key={a.id} assignment={a} />)}
        </ul>
      )}
    </section>
  );
}

function DispatchedRow({ assignment: a }: { assignment: Assignment }) {
  const mode = modeMeta[a.mode];
  const Icon = mode.icon;
  const { completedCount, avgScore, latestSubmittedAt } = useAssignmentProgress(a);
  const progress = a.questionCount === 0 ? 0 : (completedCount / a.questionCount) * 100;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';
  // 라이브 인디케이터 — 최근 30초 내 제출
  const isLive = latestSubmittedAt
    ? Date.now() - new Date(latestSubmittedAt).getTime() < 30_000
    : false;
  // 표시 정답률 — 시드의 recentAccuracy 우선, 없으면 store avgScore
  const displayAccuracy = a.recentAccuracy ?? avgScore;

  return (
    <li data-testid={`dispatched-row-${a.id}`} className="bg-pullim-slate-50/50 hover:bg-pullim-slate-50 rounded-xl p-3 transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white', mode.color)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-pullim-slate-500 font-bold">
              <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {a.assignedAt} 발사
            </span>
            <span className="text-pullim-slate-300">·</span>
            <span className={cn('font-mono font-bold', isUrgent ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
              {a.dDay} ({a.dueLabel})
            </span>
            {isLive && (
              <span className="bg-pullim-success-bg text-pullim-success inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold">
                <span className="bg-pullim-success inline-block h-1 w-1 animate-pulse rounded-full" />
                방금 제출
              </span>
            )}
            <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', mode.color, 'text-white')}>
              {mode.label}
            </span>
          </div>
          <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-[11px]">
            {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
          </div>

          {/* 진행 바 + 학생 정답률 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full transition-all', displayAccuracy && displayAccuracy >= 70 ? 'bg-pullim-success' : 'bg-pullim-blue-500')}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span data-testid={`progress-${a.id}`} className="text-pullim-slate-500 font-mono text-[10px] font-bold">
              {completedCount}/{a.questionCount}
            </span>
            {displayAccuracy != null && (
              <span className={cn('font-mono text-[10px] font-bold', displayAccuracy >= 70 ? 'text-pullim-success' : 'text-pullim-warn')}>
                {displayAccuracy}%
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="준비 중 (v2 — 같은 과제 재발사)"
          className="text-pullim-blue-600 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg opacity-60 cursor-not-allowed"
          aria-label="다시 발사 (준비 중)"
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}
