'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { History, ArrowRight, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { getTeacherReplays, classBots, type Replay, type ReplayStatus } from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | ReplayStatus;

const STATUS_META: Record<ReplayStatus, { label: string; tone: string; icon: typeof Clock }> = {
  processing: { label: '처리 중', tone: 'bg-pullim-slate-100 text-pullim-slate-700', icon: Sparkles },
  review:     { label: '검수 대기', tone: 'bg-pullim-lemon text-pullim-lemon-ink', icon: Clock },
  sent:       { label: '발송 완료', tone: 'bg-pullim-blue-100 text-pullim-blue-700', icon: CheckCircle2 },
};

export default function TeacherReplayListPage() {
  const all = useMemo(() => getTeacherReplays(), []);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = filter === 'all' ? all : all.filter(r => r.status === filter);
  const counts = useMemo(() => ({
    all: all.length,
    processing: all.filter(r => r.status === 'processing').length,
    review: all.filter(r => r.status === 'review').length,
    sent: all.filter(r => r.status === 'sent').length,
  }), [all]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={{ icon: History, text: '풀림 교사' }}
        title="수업 리플레이"
        description={`${all.length}개 수업 · 검수 대기 ${counts.review}건`}
      />

      <section className="bg-card rounded-xl border p-2">
        <ul className="flex gap-1.5 overflow-x-auto">
          {(['all', 'review', 'processing', 'sent'] as const).map(s => (
            <li key={s} className="shrink-0">
              <button
                type="button"
                onClick={() => setFilter(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  filter === s
                    ? 'bg-pullim-blue-600 text-white'
                    : 'text-pullim-slate-600 hover:bg-pullim-slate-100',
                )}
              >
                {s === 'all' ? '전체' : STATUS_META[s].label}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-mono',
                  filter === s ? 'bg-white/20' : 'bg-pullim-slate-100',
                )}>
                  {counts[s]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ul className="space-y-2">
        {filtered.map(r => <TeacherReplayCard key={r.id} replay={r} />)}
        {filtered.length === 0 && (
          <li className="bg-card text-pullim-slate-500 rounded-xl border p-6 text-center text-sm">
            이 상태의 리플레이가 없어요.
          </li>
        )}
      </ul>
    </div>
  );
}

function TeacherReplayCard({ replay }: { replay: Replay }) {
  const bot = classBots.find(b => b.id === replay.botId);
  const meta = STATUS_META[replay.status];
  const Icon = meta.icon;

  return (
    <li>
      <Link
        href={`/teacher/replay/${replay.id}`}
        className="bg-card hover:border-pullim-blue-400 group block rounded-2xl border p-4 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="bg-pullim-blue-50 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg">
            {bot?.avatarEmoji ?? '🎓'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-pullim-slate-500 truncate text-xs">{replay.botName} · {replay.classroom}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', meta.tone)}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>
            <h3 className="text-pullim-slate-900 mt-0.5 truncate text-sm font-bold">{replay.title}</h3>
            <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
              {replay.chapter} · {replay.startedAt}~ · {replay.durationMin}분 · {replay.participantCount}명 참여
            </p>
          </div>
          <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 self-center transition-colors" />
        </div>
      </Link>
    </li>
  );
}
