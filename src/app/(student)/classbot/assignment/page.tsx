'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Sparkles, Target, AlertCircle, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import {
  classRoster, currentPersona,
  type Assignment, type AssignmentMode,
  getMyBots, type ClassBot,
} from '@/lib/mock';
import { useMergedAssignments } from '@/lib/store/assignments';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getAssignmentVisual } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';

const modeMeta: Record<AssignmentMode, { label: string; color: string; icon: typeof Target }> = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700',    icon: Sparkles },
};

export default function StudentAssignmentListPage() {
  const me = classRoster.find(s => s.name === currentPersona.name) ?? classRoster[0];
  const assignments = useMergedAssignments(me.id);
  const myBots = getMyBots();
  const inProgress = assignments.filter(a => a.state === 'in-progress').length;
  const todo = assignments.filter(a => a.state === 'todo').length;
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const completed = assignments.reduce((s, a) => s + a.completedCount, 0);

  // [04 § 9.1·15.6] 봇별 그룹핑 — 봇 ID 순으로 그룹 (myBots 등록 순서 따름)
  const grouped: { bot: ClassBot; items: Assignment[] }[] = [];
  for (const { bot } of myBots) {
    const items = assignments.filter(a => a.botId === bot.id);
    if (items.length > 0) grouped.push({ bot, items });
  }
  // 등록 외 봇 (또는 unknown) — 마지막 그룹
  const knownBotIds = new Set(myBots.map(b => b.bot.id));
  const orphans = assignments.filter(a => !knownBotIds.has(a.botId));
  if (orphans.length > 0) {
    grouped.push({
      bot: { id: 'unknown', name: '기타 선생님', avatarEmoji: '🧑‍🏫', subject: '' } as ClassBot,
      items: orphans,
    });
  }

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

      <SectionHeading title="모든 과제" description="봇별로 묶어 정렬됐어요. 새로 받은 과제가 위에 와요." />

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
        <div className="space-y-4">
          {grouped.map(({ bot, items }) => (
            <BotGroupSection key={bot.id} bot={bot} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 봇별 그룹 헤더 ([08 § 15.6]·[04 § 9.1·15.6] — 카드 위 [아바타 + 이름 + 카운트] + 시그니처 컬러 점 + 진척 한 줄) ─── */
const ORPHAN_GROUP_HEX = '#94A3B8';

function BotGroupSection({ bot, items }: { bot: ClassBot; items: Assignment[] }) {
  const isOrphan = bot.id === 'unknown';
  const sig = botSignature(bot);
  const groupHex = isOrphan ? ORPHAN_GROUP_HEX : sig.hex;
  const totalQ = items.reduce((s, a) => s + a.questionCount, 0);
  const completedQ = items.reduce((s, a) => s + a.completedCount, 0);
  const progress = totalQ === 0 ? 0 : (completedQ / totalQ) * 100;
  return (
    <section
      className="space-y-2 border-l-[3px] pl-3"
      style={{ borderLeftColor: groupHex }}
    >
      <header className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
          style={{ backgroundColor: groupHex }}
        >
          {bot.avatarEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: groupHex }}
            />
            <h3 className="text-pullim-slate-900 truncate text-sm font-bold tracking-tight">
              {bot.name}
            </h3>
            {bot.subject && (
              <span className="bg-pullim-slate-100 text-pullim-slate-600 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {bot.subject}
              </span>
            )}
            <span className="text-pullim-slate-500 ml-auto shrink-0 text-[10px] font-semibold">
              {items.length}개
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="bg-pullim-slate-200 h-1 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: groupHex }}
              />
            </div>
            <span className="text-pullim-slate-500 font-mono text-[10px] font-bold">
              {completedQ}/{totalQ}문항
            </span>
          </div>
        </div>
      </header>
      <ul className="space-y-2">
        {items.map(a => <AssignmentCard key={a.id} assignment={a} />)}
      </ul>
    </section>
  );
}

/* ─── Assignment Card — [08 § 15.6] 상태별 컬러/라이너 매핑 ─── */
function AssignmentCard({ assignment: a }: { assignment: Assignment }) {
  const m = modeMeta[a.mode];
  const Icon = m.icon;
  const visual = getAssignmentVisual(a);
  const progress = a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100;

  return (
    <li>
      <Link
        href={`/classbot/assignment/${a.id}`}
        className="bg-card hover:bg-pullim-slate-50/50 group block rounded-2xl border border-l-[4px] p-4 transition-colors"
        style={{ borderLeftColor: visual.linerHex }}
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
              <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', visual.dDayChipClass)}>
                <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                {visual.dDayLabel}
              </span>
              {a.source === 'bot-prescribed' && (
                <span className="text-pullim-lemon-ink font-bold">✨</span>
              )}
            </div>

            <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
            <div className="text-pullim-slate-500 mt-0.5 text-[11px]">
              {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
            </div>

            {/* 진행 — 상태별 컬러 */}
            <div className="mt-2 flex items-center gap-2">
              <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn('h-full rounded-full transition-all', visual.progressClass)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-pullim-slate-500 font-mono text-[10px] font-bold">
                {a.completedCount}/{a.questionCount}
              </span>
              <span className="bg-pullim-slate-50 text-pullim-slate-600 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {visual.semanticLabel}
              </span>
            </div>

            {a.reasonHint && (
              <p className="text-pullim-blue-700 mt-2 text-[11px] leading-relaxed">
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
