import { Clock, Target, AlertCircle, Sparkles } from 'lucide-react';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
import { BotNote } from '@/components/classbot/bot-note';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { cn } from '@/lib/utils';

const modeMeta = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400',   icon: Target,       tone: '한 번 해보자' },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',     icon: AlertCircle,  tone: '집중하는 시간' },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700',   icon: Sparkles,     tone: '이번엔 잡아내자' },
} as const;

const sourceMeta = {
  'teacher-assigned': '선생님 과제',
  'bot-prescribed':   '봇 처방',
  'self':             '내가 추가',
} as const;

/**
 * 과제 개요 헤더 — 발송자·모드·D-day·메타.
 * spec 12 § 3.3.2.
 */
export function AssignmentOverviewHeader({ assignment: a }: { assignment: AssignmentReadRow }) {
  const m = modeMeta[a.mode];
  const ModeIcon = m.icon;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <div className={cn('h-1 w-full', m.color)} aria-hidden />
      <div className="p-4">
        <div className="flex items-center gap-2 text-micro">
          <span className="text-pullim-slate-500 font-bold">
            <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            {a.assignedBy} · {a.assignedAtLabel} 발사
          </span>
          <span className="text-pullim-slate-300">·</span>
          <span className="text-pullim-slate-500">{sourceMeta[a.source]}</span>
          <span className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold text-white', m.color)}>
            <ModeIcon className="h-2.5 w-2.5" />
            {m.label}
          </span>
        </div>

        <h1 className="text-pullim-slate-900 mt-2 text-xl font-bold tracking-tight">{a.title}</h1>
        <p className="text-pullim-slate-500 mt-1 text-xs">{a.scope}</p>

        <KpiStatBar cols={3}>
          <KpiStat label="문항" value={`${a.questionCount}문항`} />
          <KpiStat label="난이도" value={a.difficulty} />
          <KpiStat label="D-day" value={a.dDay} tone={isUrgent ? 'alert' : 'default'} />
        </KpiStatBar>

        <p className="text-pullim-slate-400 mt-3 text-micro">
          {m.tone} · 마감 {a.dueLabel}
        </p>

        {a.reasonHint && (
          <BotNote>{a.reasonHint}</BotNote>
        )}
      </div>
    </section>
  );
}

