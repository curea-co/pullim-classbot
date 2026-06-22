'use client';

import Link from 'next/link';
import {
  ArrowRight, Bell, ClipboardList, ClipboardCheck, MessageSquareText, Radio,
} from 'lucide-react';
import {
  getMyBots, type ClassBot, type StudentEnrollment,
} from '@/lib/mock';
import { useRosterMe } from '@/lib/current-user';
import { useMergedAssignments, useAssignmentStore } from '@/lib/store/assignments';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getBotHomePreview } from '@/lib/mock/classbot-home-preview';
import { getWellnessBotComment } from '@/lib/mock/classbot-wellness-bot';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { SectionHeading } from '@/components/shell/section-heading';

/**
 * 학생 홈 — V15 변형 (KPI header + V09 bot grid).
 *
 * 첫 시선이 "오늘 얼마나 바쁜지" 압축 카운트로 떨어지도록
 * KPI header 한 줄을 최상단에 두고, 그 아래 V09 구조를 잇는다.
 *
 * 구성:
 *   1. KPI header — "오늘 N개 새 알림" + KpiStatBar(라이브/마감/한 마디)
 *   2. 2-col grid — 내 클래스봇(좌) + 새로 온 것(우)
 *   3. 받은 과제 다 보기 CTA
 */
export default function StudentClassbotPage() {
  const me = useRosterMe();
  const myBots = getMyBots();
  // per-student mock 조회 키 — 제출 기록(solve)과 동일하게 roster id 사용.
  const myStudentId = me.id;

  const activeLive = useLiveStore(s => s.active);
  const liveBots = myBots.filter(b => Boolean(activeLive[b.bot.id]));

  const allAssignments = useMergedAssignments(me.id);
  const incompleteAssignments = allAssignments.filter(a => a.completedCount < a.questionCount);
  const urgentCount = allAssignments.filter(
    a => a.completedCount < a.questionCount && (a.dDay === '오늘' || a.dDay === 'D-1'),
  ).length;

  const submissions = useAssignmentStore(s => s.submissions);
  const recentGradedCount = submissions
    .filter(s => s.studentId === myStudentId)
    .filter(s => Date.now() - new Date(s.submittedAt).getTime() < 5 * 60_000).length;

  const wellnessComment = getWellnessBotComment(me.id);
  const wellnessUnread = wellnessComment ? 1 : 0;

  const newAssignmentCount = incompleteAssignments.length;
  const liveCount = liveBots.length;
  const totalNew = newAssignmentCount + liveCount + recentGradedCount + wellnessUnread;

  return (
    <div className="space-y-4">
      {/* 1. KPI Header — 첫 시선 압축 카운트 */}
      <KpiHeader
        totalNew={totalNew}
        liveCount={liveCount}
        urgentCount={urgentCount}
        wellnessUnread={wellnessUnread}
      />

      {/* 2. 2-col grid — 내 클래스봇(좌) + 새로 온 것(우) */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* 내 클래스봇 — 가로 strip (정체성) */}
        <MyBotsStrip
          bots={myBots}
          activeLive={activeLive}
        />

        {/* 새로 온 것 — 2x2 카테고리 grid */}
        <NewItemsGrid
          assignmentCount={newAssignmentCount}
          gradedCount={recentGradedCount}
          wellnessUnread={wellnessUnread}
          liveCount={liveCount}
          liveHref={liveBots[0] ? `/classbot/live/${liveBots[0].bot.id}` : '/classbot/replay'}
        />
      </section>

      {/* 3. 받은 과제 다 보기 CTA */}
      <Link
        href="/classbot/assignment"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 text-white flex items-center justify-between gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-colors shadow-pullim-sm"
      >
        <span className="inline-flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          받은 과제 다 보기
          {newAssignmentCount > 0 && (
            <span className="bg-pullim-lemon text-pullim-lemon-ink rounded-full px-2 py-0.5 font-mono text-xs">
              {newAssignmentCount}
            </span>
          )}
        </span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ─── KPI Header ─── */
function KpiHeader({
  totalNew, liveCount, urgentCount, wellnessUnread,
}: {
  totalNew: number;
  liveCount: number;
  urgentCount: number;
  wellnessUnread: number;
}) {
  if (totalNew === 0) {
    return (
      <EmptyState
        tone="plain"
        icon={Bell}
        title="전부 따라잡았어요 🎉"
        description="봇과 자유롭게 대화하며 한 발 더 나가볼까요?"
        action={{ href: '/classbot/chat', label: '봇과 대화하기' }}
      />
    );
  }

  return (
    <section className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-4 shadow-pullim-sm">
      {/* lemon glow */}
      <div
        aria-hidden
        className="glow-lemon absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
      />
      <div className="relative">
        <div className="text-pullim-blue-100 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Bell className="h-3 w-3" />
          오늘 새 알림
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-pullim-lemon font-mono text-4xl font-bold leading-none">
            {totalNew}
          </span>
          <span className="text-white/80 text-sm font-semibold">개</span>
        </div>
        <KpiStatBar cols={3} className="mt-3 border-white/10 bg-white/10 text-white">
          <KpiStat label="라이브" value={String(liveCount)} tone="alert" onDark />
          <KpiStat label="마감" value={String(urgentCount)} tone="alert" onDark />
          <KpiStat label="한 마디" value={String(wellnessUnread)} tone="accent" onDark />
        </KpiStatBar>
      </div>
    </section>
  );
}

/* ─── 내 클래스봇 가로 strip (V09 정체성) ─── */
function MyBotsStrip({
  bots,
  activeLive,
}: {
  bots: { bot: ClassBot; enrollment: StudentEnrollment }[];
  activeLive: Record<string, unknown>;
}) {
  return (
    <section>
      <SectionHeading
        title="내 클래스봇"
        action={<span className="text-pullim-slate-500 text-xs font-bold">{bots.length}명</span>}
      />
      <ul className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
        {bots.map((slot) => (
          <BotStripItem
            key={slot.bot.id}
            bot={slot.bot}
            enrollment={slot.enrollment}
            isLiveNow={Boolean(activeLive[slot.bot.id])}
          />
        ))}
        <li>
          <Link
            href="/classbot/discover"
            className="border-pullim-slate-200 text-pullim-slate-300 hover:border-pullim-blue-300 hover:text-pullim-blue-500 flex h-full min-h-[68px] flex-col items-center justify-center rounded-xl border border-dashed transition-colors"
          >
            <span className="text-lg leading-none">＋</span>
            <span className="text-xs font-semibold mt-0.5">추가</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function BotStripItem({
  bot, isLiveNow,
}: {
  bot: ClassBot;
  enrollment: StudentEnrollment;
  isLiveNow: boolean;
}) {
  const sig = botSignature(bot);
  const preview = getBotHomePreview(bot.id);
  // 배지 — 라이브 최우선, 그 외 미리보기 시각이 "오늘"이면 mini dot
  const hasNewToday = !isLiveNow && preview?.lastAt.startsWith('오늘');

  return (
    <li>
      <Link
        href={`/classbot/chat?bot=${bot.id}`}
        className={cn(
          'group flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all',
          isLiveNow
            ? 'border-pullim-danger/40 bg-pullim-danger/5'
            : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/40',
        )}
      >
        <div className="relative">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
              isLiveNow && 'ring-pullim-lemon ring-2 pullim-anim-bot-breath',
            )}
            style={{ backgroundColor: sig.hex }}
          >
            {bot.avatarEmoji}
          </span>
          {isLiveNow && (
            <span className="bg-pullim-danger absolute -top-1 -right-1 inline-flex h-4 items-center gap-0.5 rounded-full px-1 text-[10px] font-bold text-white">
              <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
              LV
            </span>
          )}
          {hasNewToday && (
            <span className="bg-pullim-blue-600 absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white" />
          )}
        </div>
        <div className="text-pullim-slate-900 line-clamp-1 w-full text-xs font-bold leading-tight">
          {bot.name}
        </div>
      </Link>
    </li>
  );
}

/* ─── 새로 온 것 — 2x2 카테고리 grid ─── */
function NewItemsGrid({
  assignmentCount, gradedCount, wellnessUnread, liveCount, liveHref,
}: {
  assignmentCount: number;
  gradedCount: number;
  wellnessUnread: number;
  liveCount: number;
  liveHref: string;
}) {
  return (
    <section>
      <SectionHeading
        title="새로 온 것"
        action={
          <Link href="/classbot/replay" className="text-pullim-slate-500 hover:text-pullim-blue-600 text-xs font-semibold">
            리플레이 →
          </Link>
        }
      />
      <ul className="grid grid-cols-2 gap-2">
        <CategoryCell
          href="/classbot/assignment"
          icon={ClipboardList}
          label="과제"
          count={assignmentCount}
          tone="blue"
        />
        <CategoryCell
          href="/classbot/assignment"
          icon={ClipboardCheck}
          label="채점"
          count={gradedCount}
          tone="blue"
        />
        <CategoryCell
          href="/classbot/wellness"
          icon={MessageSquareText}
          label="한 마디"
          count={wellnessUnread}
          tone="lemon"
        />
        <CategoryCell
          href={liveHref}
          icon={Radio}
          label="라이브"
          count={liveCount}
          tone="red"
          pulse={liveCount > 0}
        />
      </ul>
    </section>
  );
}

function CategoryCell({
  href, icon: Icon, label, count, tone, pulse,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  tone: 'blue' | 'lemon' | 'red';
  pulse?: boolean;
}) {
  const hasNew = count > 0;
  const toneClasses = {
    blue:  { iconBg: 'bg-pullim-blue-50 text-pullim-blue-700',     countText: 'text-pullim-blue-700'   },
    lemon: { iconBg: 'bg-pullim-lemon/30 text-pullim-lemon-ink',   countText: 'text-pullim-lemon-ink' },
    red:   { iconBg: 'bg-pullim-danger/10 text-pullim-danger',     countText: 'text-pullim-danger'    },
  }[tone];

  return (
    <li>
      <Link
        href={href}
        className={cn(
          'group bg-card flex items-center gap-3 rounded-xl border p-3 transition-all',
          hasNew
            ? 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/30'
            : 'border-pullim-slate-100 hover:border-pullim-slate-200',
        )}
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            toneClasses.iconBg,
          )}
        >
          <Icon className={cn('h-5 w-5', pulse && 'pullim-anim-live-pulse')} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-700 text-xs font-semibold uppercase tracking-wider">
            {label}
          </div>
          <div className={cn(
            'font-mono text-xl font-bold leading-tight',
            hasNew ? toneClasses.countText : 'text-pullim-slate-400',
          )}>
            {count}
            <span className="text-pullim-slate-400 ml-1 text-xs font-semibold">건</span>
          </div>
        </div>
        {hasNew && (
          <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 shrink-0 transition-colors" />
        )}
      </Link>
    </li>
  );
}
