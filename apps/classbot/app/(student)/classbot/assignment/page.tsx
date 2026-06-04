'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Sparkles, Target, AlertCircle, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyAssignments, useMyBots } from '@/hooks/api/read/use-student-reads';
import type { AssignmentReadRow, BotReadRow } from '@/hooks/api/read/types';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getAssignmentVisual } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';

type AssignmentMode = AssignmentReadRow['mode'];

const modeMeta: Record<AssignmentMode, { label: string; color: string; icon: typeof Target }> = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700',    icon: Sparkles },
};

/** 봇 페르소나 미상 시 그룹 헤더 폴백 이모지([08 § 15.6] 페르소나 식별 보존용). */
const FALLBACK_BOT_EMOJI = '🧑‍🏫';

/** 그룹 표시용 봇 메타 — `/api/bots` 봇 행 + 과제 행 메타를 합쳐 파생. */
interface GroupBot {
  id: string;
  subject: string;
  /** 봇 아바타 이모지([08 § 15.6] 페르소나 식별) — `/api/bots` 우선, 미상 시 폴백. */
  avatarEmoji: string;
  /** 그룹 헤더 표시 이름 — 봇 이름(있으면) 또는 과제 발송자. */
  label: string;
}

/**
 * 학생 받은 과제 목록 — Phase 7 Stage 2: `GET /api/assignments`(실DB·인증) 배선.
 *
 * mock(`useMergedAssignments`/`getMyBots`) 제거. **전부 세션(JWT sub) 명의 실API** 만
 * 쓰는 단일 신원 surface 다(봇 메타도 같은 sub-scoped `/api/bots` 조인 — 데모/mock 혼합
 * 없음). 미로그인은 로그인 게이트(D1 로그인월), 로딩/빈/에러 상태를 각각 처리한다.
 * 봇별 그룹핑은 과제 행의 `botId` 로 묶고, 헤더 페르소나(아바타·이름)는 `/api/bots` 행을
 * `botId` 로 조인해 표시한다([08 § 15.6] `[🧑‍🏫 수학이 형 · N개]` 패턴 유지).
 */
export default function StudentAssignmentListPage() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useMyAssignments();
  // 그룹 헤더 페르소나 조인용 — 같은 sub-scoped 소스. 봇 메타 미도착이어도 과제는 렌더.
  const { data: botsData } = useMyBots();

  return (
    <div className="space-y-4">
      <Link
        href="/classbot"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        클래스봇 홈
      </Link>

      <AssignmentListBody
        data={data}
        bots={botsData?.bots ?? []}
        isLoading={isLoading}
        isUnauthenticated={isUnauthenticated}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function AssignmentListBody({
  data, bots, isLoading, isUnauthenticated, isError, onRetry,
}: {
  data: { assignments: AssignmentReadRow[] } | undefined;
  bots: BotReadRow[];
  isLoading: boolean;
  isUnauthenticated: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isUnauthenticated) return <ReadLoginGate label="받은 과제" />;
  if (isError) return <ReadErrorState onRetry={onRetry} />;
  if (isLoading || !data) return <AssignmentListSkeleton />;

  const assignments = data.assignments;
  const inProgress = assignments.filter(a => a.state === 'in-progress').length;
  const todo = assignments.filter(a => a.state === 'todo').length;
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const completed = assignments.reduce((s, a) => s + a.completedCount, 0);

  // botId → 봇 행(페르소나 메타) 조인 맵.
  const botById = new Map(bots.map(b => [b.id, b]));

  // 봇별 그룹핑 — 과제 행에 등장하는 botId 순서를 유지.
  const groups = new Map<string, { bot: GroupBot; items: AssignmentReadRow[] }>();
  for (const a of assignments) {
    const existing = groups.get(a.botId);
    if (existing) {
      existing.items.push(a);
    } else {
      const meta = botById.get(a.botId);
      groups.set(a.botId, {
        bot: {
          id: a.botId,
          subject: meta?.subject ?? a.subject,
          avatarEmoji: meta?.avatarEmoji ?? FALLBACK_BOT_EMOJI,
          label: meta?.name ?? a.assignedBy,
        },
        items: [a],
      });
    }
  }
  const grouped = [...groups.values()];

  return (
    <>
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
    </>
  );
}

function AssignmentListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/* ─── 봇별 그룹 헤더 ─── */
function BotGroupSection({ bot, items }: { bot: GroupBot; items: AssignmentReadRow[] }) {
  const sig = botSignature(bot);
  const groupHex = sig.hex;
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
              {bot.label}
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

/* ─── Assignment Card ─── */
function AssignmentCard({ assignment: a }: { assignment: AssignmentReadRow }) {
  const m = modeMeta[a.mode];
  const Icon = m.icon;
  // getAssignmentVisual 은 mode/dDay/state 만 읽는다 — read row 와 호환.
  const visual = getAssignmentVisual({ ...a, assignedAt: a.assignedAtLabel } as never);
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
              <span className="text-pullim-slate-500">{a.assignedAtLabel}</span>
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
