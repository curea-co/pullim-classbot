import { Clock, Sparkles, Target, AlertCircle } from 'lucide-react';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
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
        <div className="flex items-center gap-2 text-[10px]">
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

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Meta label="문항" value={`${a.questionCount}문항`} />
          <Meta label="난이도" value={a.difficulty} />
          <Meta label="D-day" value={a.dDay} alert={isUrgent} />
        </div>

        <p className="text-pullim-slate-400 mt-3 text-[10px]">
          {m.tone} · 마감 {a.dueLabel}
        </p>

        {a.reasonHint && (
          <div className="border-pullim-blue-200 bg-pullim-blue-50/50 mt-3 rounded-lg border p-3">
            <div className="text-pullim-blue-700 text-[10px] font-bold tracking-wider uppercase">
              <Sparkles className="-mt-0.5 mr-0.5 inline h-3 w-3" />
              봇 한 마디
            </div>
            <p className="text-pullim-slate-700 mt-1 text-xs leading-relaxed">{a.reasonHint}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Meta({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className="text-pullim-slate-500 text-[11px] font-bold tracking-wider uppercase">{label}</div>
      <div className={cn('font-mono text-sm font-bold', alert ? 'text-pullim-danger' : 'text-pullim-slate-900')}>
        {value}
      </div>
    </div>
  );
}
