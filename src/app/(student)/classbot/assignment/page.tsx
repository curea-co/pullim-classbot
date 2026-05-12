'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Sparkles, Target, AlertCircle, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { classRoster, currentPersona, type Assignment, type AssignmentMode } from '@/lib/mock';
import { useMergedAssignments } from '@/lib/store/assignments';
import { cn } from '@/lib/utils';

const modeMeta: Record<AssignmentMode, { label: string; color: string; icon: typeof Target }> = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700',    icon: Sparkles },
};

export default function StudentAssignmentListPage() {
  const me = classRoster.find(s => s.name === currentPersona.name) ?? classRoster[0];
  const assignments = useMergedAssignments(me.id);
  const inProgress = assignments.filter(a => a.state === 'in-progress').length;
  const todo = assignments.filter(a => a.state === 'todo').length;
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const completed = assignments.reduce((s, a) => s + a.completedCount, 0);

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
        title={<>받은 과제 <span className="text-pullim-blue-600">{assignments.length}</span>건</>}
        description={`진행 중 ${inProgress}건 · 대기 ${todo}건 · ${completed}/${totalQuestions}문항 진행`}
      />

      <section>
        <SectionHeading title="모든 과제" description="새로 받은 과제가 위에 와요." />
        {assignments.length === 0 ? (
          <div className="bg-pullim-slate-50 border-pullim-slate-200 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
            <span className="bg-pullim-slate-100 text-pullim-slate-500 flex h-10 w-10 items-center justify-center rounded-xl">
              <Inbox className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-pullim-slate-900 text-sm font-bold">아직 받은 과제가 없어요</p>
            <p className="text-pullim-slate-500 text-[11px]">
              선생님이 새 과제를 발사하면 여기에 표시돼요.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {assignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
          </ul>
        )}
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
                <span className="text-pullim-lemon-ink font-bold">✨</span>
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
                  className={cn('h-full rounded-full', a.recentAccuracy && a.recentAccuracy >= 70 ? 'bg-pullim-blue-600' : 'bg-pullim-blue-400')}
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
              <p className="text-pullim-blue-700 mt-2 text-[10px] leading-relaxed">
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
