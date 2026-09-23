'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, Sparkles, AlertTriangle, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { assignmentModeMeta as modeMeta } from '@/components/classbot/assignment-mode-meta';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { useMyRooms, type RoomSlot } from '@/components/classbot/home/my-rooms';
import type { AssignmentReadRow } from '@/hooks/api/read/types';
import { useVisibleAssignments } from './use-assignment-reads';
import { botSignature } from '@/lib/tokens/bot-signature';
import { getAssignmentVisual } from '@/lib/tokens/assignment-state';
import { cn } from '@/lib/utils';

/**
 * D-day 칩 앞 아이콘 — 색이 아니라 **모양**으로 상태를 한 번 더 말한다 ([08 § 14.1] 색만으로 의미 전달 금지).
 * 지연은 경고 삼각형, 완료는 체크, 나머지는 시계.
 */
const dDayIcon = { overdue: AlertTriangle, complete: CheckCircle2 } as const;

/** 그룹 표시용 봇 메타 — 참여 반 카드 + 과제 행 메타를 합쳐 파생. */
interface GroupBot {
  id: string;
  subject: string;
  /** 그룹 헤더 표시 이름 — 반 봇 이름(있으면) 또는 「선생님」. */
  label: string;
}

/**
 * 학생 받은 과제 목록 — 정본 `GET /classbot/assignments?audience=student` **하나만** 읽는다
 * (2026-09-16 계획 §06 R7 · FE PR 6).
 *
 * **개인 배정과 반 단위 발사를 함께 본다.** 선생님이 반 전체에 쏜 과제는 학생 1인 행을 만들지 않고
 * 대상 표가 비어 있는 한 행으로 남는다 — 서버의 술어(「현재 멤버 AND (타겟 없음 OR 본인 타겟)」)가 그것을
 * 펼쳐 주고, 여기서는 개인 과제와 똑같이 그린다.
 *
 * 종전의 데모 폴백(비로그인이면 localStorage 의 교사 발사분을 합쳐 보이던 `useMergedAssignments`)은 걷었다 —
 * 비로그인은 이 화면에 오지 않고(PR 4 RoleGuard), 세션이 끊긴 401 은 로그인 안내로 선다.
 * 봇별 그룹핑은 과제 행의 `botId`(=반 id)로 묶고, 헤더 페르소나(봇 배지·이름)는 참여 중인 반 목록을 조인해
 * 표시한다([08 § 15.6] `[봇 · N개]` 패턴).
 *
 * **「냈는가」는 행의 `submitted` 한 칸이 말한다**(pullim-api #681 · `use-assignment-reads.ts` 머리주석의 표).
 * `state` 로 판정하던 종전 코드는 낸 과제를 계속 「안 낸 것」으로 그렸다 — 그 칸이 과제당 하나뿐이고 배포 폼이
 * 늘 `'todo'` 를 넣어서다. 서버가 아직 그 칸을 안 실어 「모른다」인 동안에는 **세지도 그리지도 않는다** —
 * 이 화면에서 0 은 「안 냈다」로 읽히기 때문이다.
 */
export default function StudentAssignmentListPage() {
  const { data, isLoading, isUnauthenticated, isError, refetch } = useVisibleAssignments();
  // 그룹 헤더 페르소나 조인용 — 참여 중인 반. 늦게 와도 과제는 먼저 그린다(`my-rooms.ts` `isError` 주석).
  const { rooms } = useMyRooms();

  return (
    <div className="space-y-4">
      <BackLink href="/classbot">클래스봇 홈</BackLink>

      <AssignmentListBody
        data={data}
        rooms={rooms}
        isLoading={isLoading}
        isUnauthenticated={isUnauthenticated}
        isError={isError}
        onRetry={() => void refetch()}
      />
    </div>
  );
}

function AssignmentListBody({
  data, rooms, isLoading, isUnauthenticated, isError, onRetry,
}: {
  data: { assignments: AssignmentReadRow[] } | undefined;
  rooms: RoomSlot[];
  isLoading: boolean;
  isUnauthenticated: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isUnauthenticated) return <ReadLoginGate label="받은 과제" />;
  if (isError) return <ReadErrorState onRetry={onRetry} />;
  if (isLoading || !data) return <AssignmentListSkeleton />;

  const assignments = data.assignments;
  // 셀 수 있는 것은 **서버가 말해 준 것뿐**이다(`submitted` · `use-assignment-reads.ts` 머리주석의 표).
  // 「모른다」(#681 배포 전 서버 · 운영자 관점)는 어느 쪽에도 세지 않는다 — 못 읽은 것을 「안 냄」으로 세면
  // 그 수가 곧 거짓말이 된다.
  const submittedCount = assignments.filter(a => a.submitted === true).length;
  const unsubmittedCount = assignments.filter(a => a.submitted === false).length;
  // **전부** 알 때만 센다. 한 줄이라도 모르면 두 수의 합이 머리줄의 「받은 과제 N건」과 어긋나고,
  // 그 어긋남은 「나머지는 안 냈다」로 읽힌다 — 한 응답에서 갈리는 일이 없어야 정상이지만, 여기서
  // 「하나라도 알면 센다」로 열어 두면 그 비정상이 조용히 거짓말로 그려진다.
  const knowsSubmission = submittedCount + unsubmittedCount === assignments.length;

  // botId → 봇(페르소나 메타) 조인 맵 — 참여 중인 반에서 온다.
  const botById = new Map(rooms.map(r => [r.bot.id, r.bot]));

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
          // 반 봇 이름이 먼저다. 정본 행에는 교사 표시명이 없어 `assignedBy` 가 빈 값으로 온다
          // (`use-assignment-reads.ts` 머리주석 · pullim-api PR 2 members 조인 전) — 그때의 「선생님」은
          // 여기 화면의 폴백이고, 카드도 같은 라벨을 받아 한 화면이 두 말을 하지 않는다.
          label: meta?.name || a.assignedBy || '선생님',
        },
        items: [a],
      });
    }
  }
  const grouped = [...groups.values()];

  return (
    <>
      <PageHeader
        title={<>받은 과제 <span className="text-pullim-blue-600">{assignments.length}</span>건</>}
      />

      {assignments.length === 0 ? (
        <EmptyState icon={Inbox} title="아직 받은 과제가 없어요" description="선생님이 새 과제를 내면 여기에 표시돼요." />
      ) : (
        <>
          {/* 제출 요약 두 칸 — 서버가 「냈다/안 냈다」를 말해 줄 때만 선다.
              종전 세 칸(「진행 중」·「대기」·「완료」)은 전부 읽을 곳이 없어졌다:
                · 「진행 중」 = `state === 'in-progress'` 인데 그 값을 쓰는 곳이 서버에 없다(배포 폼이 늘 `'todo'`)
                  — **영영 0 이던 칸이라 지웠다.** 「몇 번까지 풀었나」는 중간 저장이 생기는 별건 설계의 몫이다.
                · 「대기」 = `state === 'todo'` 인데 같은 이유로 **늘 전체 건수**였다(머리줄의 「받은 과제 N건」과 같은 수).
                · 「완료」 = 문항 수 합인데 `completedCount` 가 제출 여부의 투영이라 아래 「냈어요」와 같은 말이다.
              아무것도 모르는 동안(=#681 배포 전)에는 **바를 그리지 않는다** — 0/0 을 세우면 「다 안 냈다」로 읽힌다. */}
          {knowsSubmission && (
            <KpiStatBar cols={2}>
              <KpiStat label="냈어요" value={`${submittedCount}건`} tone="accent" />
              <KpiStat label="아직이에요" value={`${unsubmittedCount}건`} tone="default" />
            </KpiStatBar>
          )}

          {/* 묶음은 봇 머리줄이 보여준다 — 화면에 없는 것은 정렬 기준뿐이라 그것만 남긴다 ([07 § 6.7]) */}
          <SectionHeading title="모든 과제" description="새로 받은 과제가 위에 있어요." />

          <div className="space-y-4">
            {grouped.map(({ bot, items }) => (
              <BotGroupSection key={bot.id} bot={bot} items={items} />
            ))}
          </div>
        </>
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
  // 이 묶음의 진척 — 제출 여부의 투영이라(`use-assignment-reads.ts`) **전부 알 때만** 그린다. 한 줄이라도
  // 모르면 분모가 「N개」 머리줄과 어긋나고, 0% 막대는 「하나도 안 냈다」는 주장이 된다(KPI 와 같은 규칙).
  const knowsSubmission = items.every(a => a.submitted !== null);
  const totalQ = items.reduce((s, a) => s + a.questionCount, 0);
  const completedQ = items.reduce((s, a) => s + a.completedCount, 0);
  const progress = totalQ === 0 ? 0 : (completedQ / totalQ) * 100;
  // 묶음 표시는 머리줄(봇 배지·시그니처 점)이 한다 — 라이너까지 칠하면 한 화면 hue 가 [08 § 14.1] 한도를 넘는다
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        <BotAvatar subject={bot.subject} name={bot.label} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {/* [08 § 15.6] 그룹 헤더가 요구하는 시그니처 점 — 명단을 훑을 때의 보조 단서다 */}
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: groupHex }}
            />
            <h3 className="text-pullim-slate-900 truncate text-sm font-bold tracking-tight">
              {bot.label}
            </h3>
            {bot.subject && (
              <span className="bg-pullim-slate-100 text-pullim-slate-600 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-2xs font-semibold">
                {bot.subject}
              </span>
            )}
            <span className="text-pullim-slate-500 ml-auto shrink-0 text-2xs font-semibold">
              {items.length}개
            </span>
          </div>
          {knowsSubmission && (
            <div className="mt-1 flex items-center gap-2">
              {/* 진척 막대는 데이터라 브랜드 블루로 — 봇 표시는 머리줄의 시그니처 점이 한다(위 묶음 표시 주석과 같은 말) */}
              <div className="bg-pullim-slate-200 h-1 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-pullim-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-pullim-slate-500 font-mono text-2xs font-bold">
                {completedQ}/{totalQ}문항
              </span>
            </div>
          )}
        </div>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map(a => <AssignmentCard key={a.id} assignment={a} botLabel={bot.label} />)}
      </ul>
    </section>
  );
}

/* ─── Assignment Card ─── */
function AssignmentCard({ assignment: a, botLabel }: { assignment: AssignmentReadRow; botLabel: string }) {
  const m = modeMeta[a.mode];
  const Icon = m.icon;
  // 읽는 칸은 mode·dDay·state·submitted 넷이고 행이 그 넷을 다 가진다 — 종전의 `as never` 캐스팅은
  // `submitted` 가 실제로 실리는지를 타입이 못 보게 막으므로 걷었다(`AssignmentVisualInput`).
  const visual = getAssignmentVisual(a);
  const DDayIcon = dDayIcon[visual.state as keyof typeof dDayIcon] ?? Clock;
  // 진척은 제출 여부의 투영이다 — 모르면(서버가 아직 안 싣거나 운영자 관점) 0% 막대 대신 **안 그린다.**
  const knowsSubmission = a.submitted !== null;
  const progress = a.questionCount === 0 ? 0 : (a.completedCount / a.questionCount) * 100;

  return (
    <li>
      <Link
        href={`/classbot/assignment/${a.id}`}
        className="bg-card hover:bg-pullim-slate-50/50 group block h-full rounded-2xl border p-4 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', m.color, m.fg)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-2xs">
              {/* 그룹 머리줄과 같은 라벨 — 봇 이름 → 교사 표시명 → 「선생님」(위 그룹 조립 주석). */}
              <span className="text-pullim-slate-500 font-bold">{botLabel}</span>
              <span className="text-pullim-slate-300">·</span>
              <span className="text-pullim-slate-500">{a.assignedAtLabel}</span>
              <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', visual.dDayChipClass)}>
                <DDayIcon className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
                {visual.dDayLabel}
              </span>
              {a.source === 'bot-prescribed' && (
                <span className="bg-pullim-slate-100 text-pullim-slate-600 rounded-full px-1.5 py-0.5 font-bold">
                  봇 처방
                </span>
              )}
            </div>

            <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
            <div className="text-pullim-slate-500 mt-0.5 text-2xs">
              {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
            </div>

            {/* 진행 — 상태별 컬러. 막대·문항 수는 제출 여부를 알 때만, 글자 라벨은 늘 선다 */}
            <div className="mt-2 flex items-center gap-2">
              {knowsSubmission && (
                <>
                  <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className={cn('h-full rounded-full transition-all', visual.progressClass)}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-pullim-slate-500 font-mono text-micro font-bold">
                    {a.completedCount}/{a.questionCount}
                  </span>
                </>
              )}
              <span className="bg-pullim-slate-50 text-pullim-slate-600 ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-bold">
                {visual.semanticLabel}
              </span>
            </div>

            {a.reasonHint && (
              <p className="text-pullim-blue-700 mt-2 text-xs leading-relaxed">
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
