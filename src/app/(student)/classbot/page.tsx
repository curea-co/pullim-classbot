'use client';

import Link from 'next/link';
import {
  ArrowRight, Eye, History, MessageCircle, Play, Sparkles, Target, AlertCircle, Heart,
  GraduationCap, Compass, Inbox, MessageSquareText, ClipboardList, Radio,
} from 'lucide-react';
import {
  classRoster, currentPersona,
  type Assignment,
  getMyBots, type ClassBot, type StudentEnrollment,
} from '@/lib/mock';
import { useMergedAssignments } from '@/lib/store/assignments';
import { LiveQuizCard } from '@/components/classbot/live-quiz-card';
import { GradingNotificationCard } from '@/components/classbot/grading-notification-card';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { useLiveStore } from '@/lib/store/live';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getAssignmentVisual } from '@/lib/tokens/assignment-state';
import { getBotHomePreview } from '@/lib/mock/classbot-home-preview';
import { cn } from '@/lib/utils';

const modeMeta = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400'   },
  'exam':           { label: '시험',     color: 'bg-pullim-danger'      },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700'    },
} as const;

const sourceMeta = {
  'teacher-assigned': '선생님 과제',
  'bot-prescribed':   '봇 처방',
  'self':             '내가 추가',
} as const;

export default function StudentClassbotPage() {
  const me = classRoster.find(s => s.name === currentPersona.name) ?? classRoster[0];
  const myBots = getMyBots();
  const activeLive = useLiveStore(s => s.active);
  // 학생은 "지금 실제 라이브 진행 중" 봇만 본다 — bot.isLive(seed) 무시, liveStore가 truth
  const liveBots = myBots.filter(b => Boolean(activeLive[b.bot.id]));
  const allAssignments = useMergedAssignments(me.id);
  const primary = allAssignments[0];
  const others = allAssignments.slice(1);

  // 봇별 미완료 과제 수 — 봇 카드 카운트 ([04 § 9.2])
  const incompleteByBot = new Map<string, number>();
  for (const a of allAssignments) {
    if (a.completedCount >= a.questionCount) continue;
    incompleteByBot.set(a.botId, (incompleteByBot.get(a.botId) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      {/*
        [04 § 9.1] 학생 홈 블록 우선순위 — 시간 가치순:
          1. 지금 LIVE (있을 때만)
          2. 내 클래스봇 (5개) — 메시지·과제 미리보기 포함
          3. 진행 중 과제 1개 (가장 임박)
          4. 받은 과제 (others)
          5. 오늘의 KPI / 웰빙 한 줄
          6. 최근 리플레이 진입 (빠른 진입)
      */}

      {/* 1. 지금 LIVE ([08 § 15.3] navy solid + 4px lime 좌측 라이너 + LIVE 펄스) */}
      {liveBots.length > 0 && <LiveSection liveBots={liveBots.map(b => b.bot)} />}

      {/* 2. 내 클래스봇 — 카드 정보 보강 (마지막 메시지 + 미완료 카운트 + 1차 CTA) */}
      <MyBotsStrip bots={myBots} incompleteByBot={incompleteByBot} activeLive={activeLive} />

      {/* 채점 완료 알림 — 최근 5분 내 submission */}
      <GradingNotificationCard />

      {/* 3. 진행 중 과제 1개 — 가장 임박 */}
      {primary
        ? <PrimaryAssignmentCard assignment={primary} bots={myBots.map(b => b.bot)} />
        : <EmptyAssignmentCard />}

      {/* 4. 다른 과제 */}
      {others.length > 0 && (
        <section>
          <header className="mb-2 flex items-end justify-between">
            <h2 className="text-pullim-slate-900 text-sm font-bold tracking-tight">받은 과제</h2>
            <span className="text-pullim-slate-400 font-mono text-[10px]">{others.length}건</span>
          </header>
          <ul className="space-y-2">
            {others.map(a => <AssignmentRow key={a.id} assignment={a} bots={myBots.map(b => b.bot)} />)}
          </ul>
        </section>
      )}

      {/* 5. 내 활동 한 줄 — 오늘 KPI / 웰빙 */}
      <section className="bg-card flex items-center divide-x divide-pullim-slate-100 rounded-xl border">
        <Mini label="오늘 질문" value={`${me.botQuestions}회`} />
        <Mini label="정답률" value={`${me.accuracy}%`} accent />
        <Mini label="웰빙" value={`${me.wellbeing}/100`} icon={<Heart className="h-3 w-3" />} />
      </section>

      {/* 6. 빠른 진입 — 리플레이 우선 (LIVE/내 클래스봇은 위에서 처리) */}
      <section className="grid grid-cols-3 gap-2">
        <QuickEntry
          href="/classbot/replay"
          icon={History}
          label="리플레이"
          hint="3개 저장됨"
          accent
        />
        <QuickEntry
          href="/classbot/chat"
          icon={MessageCircle}
          label="봇 대화"
          hint={`${myBots.length}개 봇`}
        />
        <QuickEntry
          href="/classbot/discover"
          icon={Compass}
          label="봇 찾기"
          hint="공식 봇"
          locked
        />
      </section>

      {/* 모니터링 안내 */}
      <p className="text-pullim-slate-500 inline-flex items-center gap-1 text-[11px]">
        <Eye className="h-3 w-3" />
        등록된 선생님들이 활동을 실시간으로 봐요. 시험 기간엔 봇이 자동으로 차단돼요.
      </p>

      <FlywheelNote>
        풀이·질문은 각 봇 선생님 리포트로 흘러가고, 자주 막힌 패턴은 <strong>풀림 복습</strong>의 정복 큐로 자동 추가돼요.
      </FlywheelNote>
    </div>
  );
}

/* ─── LIVE 카드 시그니처 ([08 § 15.3] navy solid + lime 좌측 라이너 + 시청자 spring) ─── */
function LiveSection({ liveBots }: { liveBots: ClassBot[] }) {
  const first = liveBots[0];
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h2 className="text-pullim-slate-900 inline-flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
            <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
            LIVE
          </span>
          {liveBots.length}개 수업 진행 중
        </h2>
        <span className="text-pullim-slate-500 font-mono text-[10px]">
          {first.currentLesson?.startedAt}~{liveBots.length > 1 && ` · 외 ${liveBots.length - 1}건`}
        </span>
      </header>
      <Link
        href={`/classbot/chat?bot=${first.id}`}
        className="bg-pullim-slate-900 text-white relative block overflow-hidden rounded-2xl p-4 transition-transform active:scale-[0.99] shadow-pullim-sm"
        style={{ borderLeft: '4px solid var(--color-pullim-lemon)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="ring-pullim-lemon/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ring-2"
            style={{ backgroundColor: botSignature(first).hex }}
          >
            {first.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-lemon inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Radio className="pullim-anim-live-pulse h-3 w-3" />
              지금 입장
            </div>
            <div className="text-base font-bold">{first.name} 라이브</div>
            <div className="text-white/80 mt-0.5 truncate text-[11px]">
              {first.currentLesson?.title} · <LiveAudienceCount count={first.currentLesson?.studentCount ?? 0} />
            </div>
          </div>
          <span className="text-pullim-lemon text-2xl">→</span>
        </div>
      </Link>
      <LiveQuizCard />
    </section>
  );
}

/** 시청자 수 — mount 시 spring 모션 ([08 § 15.2.2]) */
function LiveAudienceCount({ count }: { count: number }) {
  return (
    <span className="pullim-anim-message-mount font-mono text-pullim-lemon font-bold">{count}명 참여 중</span>
  );
}

/* ─── 내 봇 N개 — 학생 정체성 strip ([04 § 9.2] 정보 보강) ─── */
function MyBotsStrip({
  bots,
  incompleteByBot,
  activeLive,
}: {
  bots: { bot: ClassBot; enrollment: StudentEnrollment }[];
  incompleteByBot: Map<string, number>;
  activeLive: Record<string, unknown>;
}) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-pullim-slate-900 inline-flex items-center gap-1 text-sm font-bold">
            <GraduationCap className="text-pullim-blue-600 h-3.5 w-3.5" />
            내 클래스봇
          </h2>
          <p className="text-pullim-slate-500 text-[11px]">
            {bots.length}명의 선생님이 배정한 봇
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {bots.map(({ bot, enrollment }) => (
          <BotCard
            key={bot.id}
            bot={bot}
            enrollment={enrollment}
            incompleteCount={incompleteByBot.get(bot.id) ?? 0}
            isLiveNow={Boolean(activeLive[bot.id])}
          />
        ))}
      </ul>
    </section>
  );
}

function BotCard({
  bot, enrollment, incompleteCount, isLiveNow,
}: {
  bot: ClassBot;
  enrollment: StudentEnrollment;
  incompleteCount: number;
  isLiveNow: boolean;
}) {
  const sig = botSignature(bot);
  const preview = getBotHomePreview(bot.id);
  const ctaLabel = isLiveNow ? '입장' : '대화';
  return (
    <li>
      <Link
        href={`/classbot/chat?bot=${bot.id}`}
        className={cn(
          'group flex flex-col gap-2.5 rounded-xl border p-3 transition-all',
          isLiveNow
            ? 'border-pullim-danger/30 bg-pullim-danger/5'
            : 'border-pullim-slate-200 hover:border-pullim-blue-300 hover:bg-pullim-blue-50/30',
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
              isLiveNow && 'ring-pullim-lemon ring-2',
            )}
            style={{ backgroundColor: sig.hex }}
          >
            {bot.avatarEmoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px]">
              {isLiveNow ? (
                <span className="bg-pullim-danger inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold text-white">
                  <span className="bg-white pullim-anim-live-pulse inline-block h-1 w-1 rounded-full" />
                  LIVE
                </span>
              ) : (
                <span className="bg-pullim-slate-100 text-pullim-slate-500 rounded-full px-1.5 py-0.5 font-bold">
                  대기
                </span>
              )}
              <span className="text-pullim-slate-400 ml-auto text-[10px]">
                {enrollment.classroomLabel}
              </span>
            </div>
            <div className="text-pullim-slate-900 mt-1 text-sm font-bold leading-tight">{bot.name}</div>
            <div className="text-pullim-slate-500 text-[10px] leading-snug">{bot.teacherName}</div>
          </div>
        </div>

        {/* 마지막 메시지 미리보기 + 카운트 — [04 § 9.2] */}
        {preview && (
          <div className="text-pullim-slate-500 border-pullim-slate-100 flex items-start gap-1.5 border-t pt-2 text-[11px] leading-snug">
            <MessageSquareText className="text-pullim-slate-400 mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-1 italic">{preview.lastMessage}</span>
          </div>
        )}

        <div className="text-pullim-slate-500 flex items-center justify-between text-[10px]">
          <div className="inline-flex items-center gap-2">
            {incompleteCount > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold">
                <ClipboardList className="h-3 w-3" />
                미완료 {incompleteCount}
              </span>
            )}
            {isLiveNow && (
              <span className="text-pullim-danger inline-flex items-center gap-0.5 font-semibold">
                <Radio className="h-3 w-3" />
                라이브 1
              </span>
            )}
            {preview && (
              <span className="text-pullim-slate-400">{preview.lastAt}</span>
            )}
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-transform group-hover:translate-x-0.5"
            style={{
              backgroundColor: isLiveNow ? sig.hex : 'var(--color-pullim-slate-100)',
              color: isLiveNow ? (sig.kind === 'math' ? '#5C6B0A' : '#FFFFFF') : 'var(--color-pullim-slate-700)',
            }}
          >
            {ctaLabel} →
          </span>
        </div>
      </Link>
    </li>
  );
}

/* ─── Primary Assignment 빈 상태 ─── */
function EmptyAssignmentCard() {
  return (
    <section className="bg-pullim-slate-50 border-pullim-slate-200 flex items-center gap-3 rounded-2xl border border-dashed p-5">
      <span className="bg-pullim-slate-100 text-pullim-slate-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Inbox className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-pullim-slate-900 text-sm font-bold">오늘 풀 과제가 없어요</h2>
        <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
          선생님이 새 과제를 발사하면 여기에 표시돼요. 그 사이 봇과 자유 대화나 리플레이를 둘러봐도 좋아요.
        </p>
      </div>
    </section>
  );
}

/* ─── Primary Assignment ─── */
function PrimaryAssignmentCard({ assignment: a, bots }: { assignment: Assignment; bots: ClassBot[] }) {
  const mode = modeMeta[a.mode];
  const progress = a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';
  const remaining = a.questionCount - a.completedCount;
  const fromBot = bots.find(b => b.id === a.botId);

  return (
    <Link
      href={a.solveHref}
      className="from-pullim-blue-700 to-pullim-blue-500 group relative block overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl transition-transform active:scale-[0.99]"
    >
      <div
        aria-hidden
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-pullim-lemon), transparent 70%)' }}
      />

      <div className="relative">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className={cn('rounded-full px-2 py-0.5 font-bold tracking-wider uppercase', mode.color)}>
            {mode.label}
          </span>
          <span className="bg-white/15 rounded-full px-2 py-0.5 font-bold backdrop-blur">
            {sourceMeta[a.source]}
          </span>
          <span className={cn(
            'rounded-full px-2 py-0.5 font-mono font-bold ml-auto',
            isUrgent ? 'bg-pullim-lemon text-pullim-lemon-ink' : 'bg-white/15 text-white',
          )}>
            {a.dDay}
          </span>
        </div>

        <h2 className="mt-2.5 text-xl font-bold tracking-tight">{a.title}</h2>
        <p className="text-pullim-blue-100 mt-0.5 text-xs">
          {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
        </p>

        <div className="mt-4">
          <div className="text-pullim-blue-100 mb-1 flex items-center justify-between text-[11px] font-semibold">
            <span>{a.completedCount}/{a.questionCount} 풀이 완료</span>
            <span className="text-pullim-lemon font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="bg-white/15 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-pullim-lemon h-full rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {a.reasonHint && (
          <p className="bg-white/10 backdrop-blur mt-3 rounded-lg px-3 py-2 text-[11px] leading-snug">
            <Sparkles className="text-pullim-lemon -mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
            {a.reasonHint}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-pullim-blue-100 inline-flex items-center gap-1 text-[11px]">
            {fromBot && <span className="text-base leading-none">{fromBot.avatarEmoji}</span>}
            {a.assignedBy} · {a.assignedAt}
          </span>
          <span className="bg-pullim-lemon text-pullim-lemon-ink inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-bold transition-transform group-hover:translate-x-0.5">
            <Play className="h-3.5 w-3.5" />
            {a.completedCount === 0 ? '시작' : `이어서 ${remaining}문항`}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Assignment Row — [08 § 15.6] 상태별 컬러/라이너 매핑 ─── */
function AssignmentRow({ assignment: a, bots }: { assignment: Assignment; bots: ClassBot[] }) {
  const mode = modeMeta[a.mode];
  const visual = getAssignmentVisual(a);
  const Icon = a.mode === 'wrong-conquest' ? Target : a.mode === 'exam' ? AlertCircle : Play;
  const fromBot = bots.find(b => b.id === a.botId);

  return (
    <li>
      <Link
        href={a.solveHref}
        className="bg-card hover:border-pullim-blue-300 flex items-center gap-3 rounded-xl border border-l-[4px] p-3.5 transition-colors"
        style={{ borderLeftColor: visual.linerHex }}
      >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', mode.color)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px]">
            {fromBot && <span className="text-sm">{fromBot.avatarEmoji}</span>}
            <span className="text-pullim-slate-500 font-bold">{a.assignedBy}</span>
            <span className="text-pullim-slate-300">·</span>
            <span className="text-pullim-slate-500">{sourceMeta[a.source]}</span>
            <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', visual.dDayChipClass)}>
              {visual.dDayLabel}
            </span>
          </div>
          <div className="text-pullim-slate-900 mt-0.5 text-sm font-bold">{a.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-[11px]">
            {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
          </div>
          {/* 진행 바 (mode/state 컬러 적용) */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="bg-pullim-slate-200 h-1 flex-1 overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full transition-all', visual.progressClass)}
                style={{ width: `${a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100}%` }}
              />
            </div>
            <span className="text-pullim-slate-500 font-mono text-[10px] font-bold">
              {a.completedCount}/{a.questionCount}
            </span>
          </div>
          {a.reasonHint && (
            <p className="text-pullim-slate-400 mt-1 line-clamp-1 text-[11px] italic">
              <Sparkles className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {a.reasonHint}
            </p>
          )}
        </div>
        <ArrowRight className="text-pullim-slate-300 h-4 w-4 shrink-0" />
      </Link>
    </li>
  );
}

/* ─── 빠른 진입 ─── */
function QuickEntry({
  href, icon: Icon, label, hint, accent, locked,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string; hint: string; accent?: boolean; locked?: boolean;
}) {
  const className = cn(
    'flex items-center gap-2.5 rounded-xl border p-3 transition-colors',
    locked
      ? 'bg-pullim-slate-50 border-pullim-slate-200 opacity-60 cursor-not-allowed'
      : accent
        ? 'bg-pullim-blue-50 border-pullim-blue-100 hover:bg-pullim-blue-100/70'
        : 'bg-card hover:border-pullim-blue-300',
  );
  const inner = (
    <>
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        locked ? 'bg-pullim-slate-100 text-pullim-slate-400'
          : accent ? 'bg-pullim-blue-600 text-white'
          : 'bg-pullim-slate-100 text-pullim-slate-700',
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className={cn(
          'text-sm font-bold',
          locked ? 'text-pullim-slate-500'
            : accent ? 'text-pullim-blue-700' : 'text-pullim-slate-900',
        )}>
          {label}
        </div>
        <div className="text-pullim-slate-500 text-[10px]">{hint}{locked && ' · 준비 중'}</div>
      </div>
    </>
  );
  if (locked) return <div className={className} aria-disabled="true">{inner}</div>;
  return <Link href={href} className={className}>{inner}</Link>;
}

function Mini({
  label, value, accent, icon,
}: {
  label: string; value: string; accent?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div className="flex-1 px-3 py-3 text-center">
      <div className="text-pullim-slate-500 inline-flex items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wider uppercase">
        {icon}
        {label}
      </div>
      <div className={cn('mt-0.5 font-mono text-base font-bold', accent ? 'text-pullim-blue-600' : 'text-pullim-slate-900')}>
        {value}
      </div>
    </div>
  );
}
