import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Sparkles, Target, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { studentAssignments, studentAssignmentStats, type Assignment, type AssignmentMode } from '@/lib/mock';
import { cn } from '@/lib/utils';

const modeMeta: Record<AssignmentMode, { label: string; color: string; icon: typeof Target }> = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-500',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-warn',        icon: Sparkles },
};

export default function StudentAssignmentListPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/classbot"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        클래스봇 홈
      </Link>

      <PageHeader
        eyebrow={{ icon: Target, text: '받은 과제' }}
        title={<>받은 과제 <span className="text-pullim-blue-600">{studentAssignmentStats.total}</span>건</>}
        description={`진행 중 ${studentAssignmentStats.inProgress}건 · 대기 ${studentAssignmentStats.todo}건 · ${studentAssignmentStats.completed}/${studentAssignmentStats.totalQuestions}문항 진행`}
      />

      <section>
        <SectionHeading title="모든 과제" description="D-day 임박 순으로 정렬했어요." />
        <ul className="space-y-2">
          {studentAssignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
        </ul>
      </section>
    </div>
  );
}

function AssignmentCard({ assignment: a }: { assignment: Assignment }) {
  const m = modeMeta[a.mode];
  const Icon = m.icon;
  const progress = a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';

  return (
    <li>
      <Link
        href={`/classbot/assignment/${a.id}`}
        className="bg-card hover:bg-pullim-slate-50/50 group block rounded-2xl border p-4 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white', m.color)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-pullim-slate-500 font-bold">{a.assignedBy}</span>
              <span className="text-pullim-slate-300">·</span>
              <span className="text-pullim-slate-500">{a.assignedAt}</span>
              <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold text-white', m.color)}>
                {m.label}
              </span>
              {a.source === 'bot-prescribed' && (
                <span className="text-pullim-warn font-bold">✨</span>
              )}
            </div>

            <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
            <div className="text-pullim-slate-500 mt-0.5 text-[11px]">
              {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
            </div>

            {/* 진행 + D-day */}
            <div className="mt-2 flex items-center gap-2">
              <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full', a.recentAccuracy && a.recentAccuracy >= 70 ? 'bg-pullim-success' : 'bg-pullim-blue-500')}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-pullim-slate-500 font-mono text-[10px] font-bold">
                {a.completedCount}/{a.questionCount}
              </span>
              <span className={cn('font-mono text-[10px] font-bold', isUrgent ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
                <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                {a.dDay}
              </span>
            </div>

            {a.reasonHint && (
              <p className="text-pullim-warn mt-2 text-[10px] leading-relaxed">
                <Sparkles className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                {a.reasonHint}
              </p>
            )}
          </div>
          <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-slate-500 mt-1 h-4 w-4 shrink-0 transition-all group-hover:translate-x-0.5" />
        </div>
      </Link>
    </li>
  );
}
