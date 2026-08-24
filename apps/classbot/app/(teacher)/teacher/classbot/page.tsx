'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot, Send, Plus, Sparkles, Clock, Target, AlertCircle, ArrowRight, Inbox,
  Rocket, ToggleRight, Shield, Wrench, Settings, Gauge, School, Pause, Play,
  MoreHorizontal,
} from 'lucide-react';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { RemindButton } from '@/components/classbot/remind-button';
import { SubmissionStatusSheet } from '@/components/classbot/submission-status-sheet';
import { EmptyState } from '@/components/classbot/empty-state';
import { classroomLabel } from '@/components/builder/builder-types';
import { Chip } from '@/components/ui/chip';
import {
  currentTeacher, myClassBot, studentAssignments, classRoster, scopeMeta, type Assignment,
} from '@/lib/mock';
import {
  getTeacherBotRows, getTeacherBotSummary, runStateLabels, type TeacherBotRow,
} from '@/lib/mock/classbot-teacher-ops';
import { useAssignmentStore, useAssignmentProgress } from '@/lib/store/assignments';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { SectionHeading } from '@/components/shell/section-heading';
import { cn } from '@/lib/utils';

/**
 * 클래스봇 운영 메인 (SCR-C-17) — 「내가 만든 봇들이 어느 학급에 붙어서 어떻게 돌고 있나」.
 *
 * 이 화면이 하지 않는 것:
 *  - 학생 관제(명단·활동·도달 상태) → 학급 관제소(/teacher/monitor). 봇마다 길만 열어둔다.
 *  - 안전 등급 변경 → 봇 설정(/teacher/settings?tab=safety). 여기서는 지금 등급만 읽어준다.
 *
 * 액션 규칙: 봇에서 나가는 길은 카드 우상단 「더보기」 하나에 모은다.
 *  카드마다 링크를 깔면 봇 수만큼 곱해져 화면이 링크로 덮인다.
 *  같은 화면 안 앵커 이동(#bot-list·#dispatched)은 액션이 아니라 스크롤이라 두지 않는다.
 *
 * 기획 보류 — 라이브 수업(SCR-C-19)·퀴즈 운영(SCR-C-20). 재개 시 되살린다.
 *  걷어낸 것: LiveBroadcastControls(방송 시작·종료·슬라이드 제어·학생 질문 모더레이션),
 *  LiveFeedPanel(라이브 피드 pane), QuizLauncher(퀴즈 pane), ClassKpiBar(라이브 6종 KPI),
 *  StudentRoster(학생 명단 pane · 위기 신호 카드 — 학급 관제소 몫).
 *  컴포넌트 파일은 지우지 않고 그대로 둔다 —
 *  components/classbot/{live-broadcast-controls,live-feed-panel,quiz-launcher,class-kpi-bar,student-roster}.tsx
 */
export default function TeacherClassbotPage() {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const assignments = useMemo<AssignmentRow[]>(
    () => [...dispatched, ...studentAssignments],
    [dispatched],
  );

  const botRows = getTeacherBotRows();
  const summary = getTeacherBotSummary(botRows);

  return (
    <div className="space-y-4 py-4 lg:py-6">
      <Suspense fallback={null}>
        <CreatedBanner />
      </Suspense>

      <PageHeader
        eyebrow={{ icon: Bot, text: '클래스봇 운영' }}
        title="내 클래스봇"
        description={`${currentTeacher.name} 선생님 · ${currentTeacher.organization}`}
        action={
          <Link
            href="/teacher/builder"
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            새 클래스봇
          </Link>
        }
      />

      {/*
        봇 운영 요약 — 학생 도달·활동 지표는 담지 않는다(학급 관제소 몫).

        카드 안에 텍스트 링크를 또 넣지 않는다. 나가는 길이 있는 카드는 카드째 링크(KpiStatLink),
        없는 카드는 숫자만(KpiStat). 「봇 목록(#bot-list)」·「과제 현황(#dispatched)」은
        바로 아래 있는 같은 화면 섹션으로 내려가는 스크롤이라 액션으로 세지 않고 걷어냈다.
      */}
      <KpiStatBar cols={4}>
        <KpiStat
          label="운영 중"
          value={`${summary.runningCount}/${summary.botCount}개`}
          tone="accent"
        />
        <KpiStat label="붙은 학급" value={`${summary.classroomCount}개`} />
        <KpiStatLink
          label="등록 학생"
          value={`${summary.studentCount}명`}
          href="/teacher/monitor"
        />
        <KpiStat label="낸 과제" value={`${assignments.length}건`} />
      </KpiStatBar>

      {/* 봇 목록 — 이 화면의 본체 */}
      <BotOpsList rows={botRows} assignments={assignments} />

      {/* 낸 과제 — 봇별로 묶어서 본다 */}
      <DispatchedAssignments assignments={assignments} rows={botRows} />

      {/* 등록 학생 관리 — enrollment 토글 */}
      <EnrollmentToggleSection />

      <FlywheelNote>
        학생 질문·오답 데이터는 익명화되어 사고유도 모델로 흘러가고, 자주 막힌 패턴은 학생의 <strong>풀림 복습</strong>에 처방으로 자동 추가돼요.
      </FlywheelNote>
    </div>
  );
}

/* ─── 봇 목록 — 봇마다 학급 배정·안전 등급·낸 과제·동선 ─── */

// 행 데이터 = store dispatched(UserAssignment) + mock 시드(Assignment) 혼합 — targetStudentIds 는 발송분만 보유.
type AssignmentRow = Assignment & { targetStudentIds?: string[] };

function BotOpsList({ rows, assignments }: { rows: TeacherBotRow[]; assignments: AssignmentRow[] }) {
  return (
    <section id="bot-list" data-testid="bot-ops-list" className="scroll-mt-20">
      <SectionHeading
        title="내 봇"
        action={
          <Link
            href="/teacher/builder"
            className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-0.5 text-xs font-bold"
          >
            봇 만들기 <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="아직 만든 봇이 없어요"
          description="봇을 만들어 학급에 붙이면 여기에서 운영 상태를 볼 수 있어요."
          action={{ href: '/teacher/builder', label: '봇 만들기' }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map(row => (
            <BotOpsCard
              key={row.bot.id}
              row={row}
              assignmentCount={assignments.filter(a => a.botId === row.bot.id).length}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 봇 하나에서 나가는 길 — 전부 「더보기」 안에 모은다.
 * 카드마다 링크를 깔면 봇 3개에 12개가 반복돼 정작 「지금 잘 도나」가 안 읽힌다.
 */
const botMenuLinks = [
  { href: '/teacher/builder',              icon: Wrench,   label: '봇 손보기' },
  { href: '/teacher/settings',             icon: Settings, label: '봇 설정' },
  { href: '/teacher/settings?tab=safety',  icon: Shield,   label: '안전 등급 바꾸기' },
  { href: '/teacher/assignment/new',       icon: Send,     label: '과제 내기' },
  // 학생 관제는 이 화면이 하지 않는다 — 관제소로 보낸다
  { href: '/teacher/monitor',              icon: Gauge,    label: '학급 관제소' },
];

function BotCardMenu({ botName, running }: { botName: string; running: boolean }) {
  const RunIcon = running ? Pause : Play;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${botName} 더보기`}
        className="text-pullim-slate-500 hover:bg-pullim-slate-50 hover:text-pullim-slate-900 focus-visible:ring-pullim-blue-400/50 -mt-1 -mr-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-2xs font-bold transition-colors outline-none focus-visible:ring-2"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        더보기
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {botMenuLinks.map(({ href, icon: Icon, label }) => (
          <DropdownMenuItem key={href} className="p-0">
            <Link href={href} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm">
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/* 멈추기·다시 돌리기는 아직 준비 중 — 자리는 두되 누를 수 없다 */}
        <DropdownMenuItem disabled className="px-2 py-1.5">
          <RunIcon className="h-4 w-4" aria-hidden />
          {running ? '봇 멈추기' : '봇 다시 돌리기'}
          <DropdownMenuShortcut className="tracking-normal">준비 중</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 봇 카드 — 「이 봇이 지금 제대로 돌고 있나」에 필요한 것만 남긴다.
 *  남긴 것: 이름·과목·학년 / 운영 상태(멈춤이면 이유) / 안전 등급 배지 / 붙은 학급과 인원 / 낸 과제 수.
 *  덜어낸 것: 말투(봇 설정에서 본다), 안전 등급 설명문(scope.allow — 배지로 갈음),
 *            바닥 링크 5개(더보기 안으로), 「진행 상황 보기」 앵커(바로 아래 낸 과제 섹션).
 * 카드 본체는 누르는 자리가 아니다 — 봇 하나짜리 화면이 아직 없어서 갈 데가 없다.
 */
function BotOpsCard({ row, assignmentCount }: { row: TeacherBotRow; assignmentCount: number }) {
  const { bot, ops, studentCount } = row;
  const running = ops.runState === 'running';
  const scope = scopeMeta[bot.scope];

  return (
    <li data-testid={`bot-ops-card-${bot.id}`} className="bg-card flex flex-col rounded-2xl border p-4">
      {/* 정체 — 이름 · 과목 · 학년 · 지금 도는지 · 안전 등급 */}
      <div className="flex items-start gap-3">
        <span className="bg-pullim-blue-50 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl" aria-hidden>
          {bot.avatarEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-pullim-slate-900 text-sm font-bold">{bot.name}</h3>
            <Chip tone={running ? 'info' : 'neutral'} className="py-1">
              {running ? (
                <span className="bg-pullim-blue-600 inline-block h-1.5 w-1.5 rounded-full" aria-hidden />
              ) : (
                <Pause className="h-2.5 w-2.5" aria-hidden />
              )}
              {runStateLabels[ops.runState]}
            </Chip>
            {/* 안전 등급 — 배지 하나로 읽어준다. 설명·변경은 봇 설정(더보기 안). */}
            <Chip tone="outline" className="py-1">
              <Shield className="text-pullim-blue-600" aria-hidden />
              <span>
                <span className="sr-only">안전 등급 </span>
                <span className="font-mono">{scope.short}</span> {scope.label}
              </span>
            </Chip>
          </div>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            {bot.subject} · {bot.grade}
          </p>
          {!running && ops.pauseReason && (
            <p className="text-pullim-slate-500 mt-0.5 text-micro">{ops.pauseReason}</p>
          )}
        </div>
        <BotCardMenu botName={bot.name} running={running} />
      </div>

      {/* 붙어 있는 학급 */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-pullim-slate-500 text-micro font-bold tracking-wider uppercase">
            붙어 있는 학급
          </div>
          {/* 반이 여럿일 때만 합계를 얹는다 — 한 반이면 아래 학급 줄과 같은 숫자라 중복이다 */}
          {ops.classrooms.length > 1 && (
            <span className="text-pullim-slate-500 shrink-0 font-mono text-2xs font-bold">
              모두 {studentCount}명
            </span>
          )}
        </div>
        {ops.classrooms.length === 0 ? (
          <EmptyState
            tone="plain"
            size="sm"
            title="아직 붙은 학급이 없어요"
            description="봇을 학급에 붙이면 학생이 참여 코드로 들어올 수 있어요."
            action={{ href: '/teacher/builder', label: '학급에 붙이기' }}
          />
        ) : (
          <ul className="mt-1 space-y-1">
            {ops.classrooms.map(c => (
              <li
                key={c.id}
                className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              >
                <School className="text-pullim-blue-500 h-3 w-3 shrink-0" aria-hidden />
                <span className="text-pullim-slate-900 min-w-0 flex-1 truncate text-xs font-bold">
                  {c.label}
                </span>
                <span className="text-pullim-slate-500 shrink-0 font-mono text-2xs font-bold">
                  {c.studentCount}명
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 낸 과제 — 몇 건 냈는지만. 자세한 건 아래 「낸 과제」 섹션에서 본다. */}
      <p className="text-pullim-slate-500 mt-auto pt-3 text-2xs">
        {assignmentCount === 0 ? (
          '아직 낸 과제가 없어요'
        ) : (
          <>
            낸 과제 <b className="text-pullim-slate-700 font-mono">{assignmentCount}건</b>
          </>
        )}
      </p>
    </li>
  );
}

/* ─── 낸 과제 — 봇이 학생에게 보낸 풀이 컨텍스트 ─── */
const modeMeta = {
  'practice':       { label: '연습',     color: 'bg-pullim-blue-400',   icon: Target },
  'exam':           { label: '시험',     color: 'bg-pullim-danger',      icon: AlertCircle },
  'wrong-conquest': { label: '오답정복', color: 'bg-pullim-blue-700',    icon: Sparkles },
} as const;

/** 봇 순서(카탈로그)대로 묶는다. 카탈로그에 없는 봇의 과제는 맨 뒤에 따로 둔다. */
function groupByBot(assignments: AssignmentRow[], rows: TeacherBotRow[]) {
  const byBot = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const list = byBot.get(a.botId);
    if (list) list.push(a);
    else byBot.set(a.botId, [a]);
  }

  const groups: { botId: string; botName: string; classLabel: string; items: AssignmentRow[] }[] = [];
  for (const r of rows) {
    const items = byBot.get(r.bot.id);
    if (!items) continue;
    byBot.delete(r.bot.id);
    groups.push({
      botId: r.bot.id,
      botName: r.bot.name,
      classLabel: r.ops.classrooms.map(c => c.label).join(' · ') || '붙은 학급 없음',
      items,
    });
  }
  for (const [botId, items] of byBot) {
    groups.push({
      botId,
      botName: items[0]?.assignedBy || '봇 미지정',
      classLabel: '봇 목록에 없는 봇',
      items,
    });
  }
  return groups;
}

function DispatchedAssignments({
  assignments,
  rows,
}: {
  assignments: AssignmentRow[];
  rows: TeacherBotRow[];
}) {
  const submissions = useAssignmentStore((s) => s.submissions);
  const totalSent = assignments.reduce((s, a) => s + (a.assignedAt.includes('오늘') || a.assignedAt.includes('방금') ? 1 : 0), 0);
  // 진행률 합산은 store submission 기준 — 실시간 반영
  const totalCompleted = assignments.reduce((s, a) => {
    const mine = submissions.filter((sub) => sub.assignmentId === a.id);
    const submittedStudentCount = new Set(mine.map((sub) => sub.studentId)).size;
    return s + Math.min(a.completedCount + submittedStudentCount, a.questionCount);
  }, 0);
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const totalPending = totalQuestions - totalCompleted;
  const groups = groupByBot(assignments, rows);

  return (
    <section id="dispatched" data-testid="dispatched-section" className="bg-card scroll-mt-20 rounded-2xl border p-4">
      <SectionHeading
        title="낸 과제"
        description={`오늘 ${totalSent}건 · 학생 풀이 진행 ${totalCompleted}/${totalCompleted + totalPending}문항`}
        action={
          <Link
            href="/teacher/assignment/new"
            data-testid="new-assignment-cta"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            새 과제
          </Link>
        }
      />
      {groups.length === 0 ? (
        <EmptyState icon={Inbox} title="아직 낸 과제가 없어요" action={{ href: '/teacher/assignment/new', label: '과제 내기' }} />
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.botId} data-testid={`dispatched-group-${g.botId}`}>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <h3 className="text-pullim-slate-900 text-xs font-bold">{g.botName}</h3>
                <span className="text-pullim-slate-500 min-w-0 truncate text-micro">{g.classLabel}</span>
                <span className="text-pullim-slate-400 ml-auto shrink-0 font-mono text-micro font-bold">
                  {g.items.length}건
                </span>
              </div>
              <ul className="space-y-2">
                {g.items.map(a => <DispatchedRow key={a.id} assignment={a} />)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DispatchedRow({ assignment: a }: { assignment: AssignmentRow }) {
  const mode = modeMeta[a.mode];
  const Icon = mode.icon;
  const { completedCount, avgScore, latestSubmittedAt } = useAssignmentProgress(a);
  const progress = a.questionCount === 0 ? 0 : (completedCount / a.questionCount) * 100;
  const isUrgent = a.dDay === '오늘' || a.dDay === 'D-1';
  // 최근 제출 인디케이터 — 최근 30초 내 제출
  const isFresh = latestSubmittedAt
    ? Date.now() - new Date(latestSubmittedAt).getTime() < 30_000
    : false;
  // 표시 정답률 — 시드의 recentAccuracy 우선, 없으면 store avgScore
  const displayAccuracy = a.recentAccuracy ?? avgScore;

  return (
    <li data-testid={`dispatched-row-${a.id}`} className="bg-pullim-slate-50/50 hover:bg-pullim-slate-50 rounded-xl p-3 transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white', mode.color)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-micro">
            {/* 보낸 때 — 라벨 문구는 발송한 쪽(과제 폼·BE)이 갖는다. 여기서 말꼬리를 덧붙이지 않는다. */}
            <span className="text-pullim-slate-500 font-bold">
              <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {a.assignedAt}
            </span>
            <span className="text-pullim-slate-300">·</span>
            <span className={cn('font-mono font-bold', isUrgent ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
              {a.dDay} ({a.dueLabel})
            </span>
            {isFresh && (
              <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold">
                <span className="bg-pullim-blue-600 inline-block h-1 w-1 animate-pulse rounded-full" />
                방금 제출
              </span>
            )}
            <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', mode.color, 'text-white')}>
              {mode.label}
            </span>
          </div>
          <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-2xs">
            {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
          </div>

          {/* 진행 바 + 학생 정답률 */}
          <div className="mt-2 flex items-center gap-2">
            <div className="bg-pullim-slate-200 h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full transition-all', displayAccuracy && displayAccuracy >= 70 ? 'bg-pullim-blue-600' : 'bg-pullim-blue-400')}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span data-testid={`progress-${a.id}`} className="text-pullim-slate-500 font-mono text-micro font-bold">
              {completedCount}/{a.questionCount}
            </span>
            {displayAccuracy != null && (
              <span className={cn('font-mono text-micro font-bold', displayAccuracy >= 70 ? 'text-pullim-blue-700' : 'text-pullim-slate-500')}>
                {displayAccuracy}%
              </span>
            )}
          </div>

          {/* 개입 — 미제출 리마인드(PR-1) + 제출 현황 시트(PR-2: 코멘트·오답 재발송) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <RemindButton
              assignmentId={a.id}
              botId={a.botId}
              title={a.title}
              targetStudentIds={a.targetStudentIds}
            />
            <SubmissionStatusSheet assignment={a} />
          </div>
        </div>
        {/* 아이콘만 — 9x9 버튼 안에서 글자가 넘치지 않게 이름은 읽어주기용으로만 둔다 */}
        <ComingSoonButton icon={Send} note="같은 과제 다시 보내기" className="text-pullim-blue-600 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <span className="sr-only">같은 과제 다시 보내기</span>
        </ComingSoonButton>
      </div>
    </li>
  );
}

/* ─── 봇 만든 직후 banner — ?created=<name>&rooms=<id,id> ─── */
function CreatedBanner() {
  const params = useSearchParams();
  const created = params.get('created');
  if (!created) return null;

  // 반을 안 고르고 나가도 봇은 남는다 — 그 경우를 「고른 반에 나타나요」로 안내하면 거짓말이 된다.
  const rooms = (params.get('rooms') ?? '').split(',').filter(Boolean);
  const roomNames = rooms.map(classroomLabel).join(' · ');

  return (
    <section className="bg-pullim-blue-50 border-pullim-blue-200 text-pullim-blue-900 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        <strong className="text-sm">방금 만든 봇: {created}</strong>
      </div>
      <p className="text-pullim-blue-700 mt-1 text-2xs">
        {rooms.length
          ? `${roomNames}의 학생 홈에 나타나요 (데모). 아래 봇 목록은 v1 backend 연결 후 실제로 갱신돼요.`
          : '아직 반에 넣지 않았어요. 봇은 그대로 남아 있고, 반에 넣으면 그때부터 학생에게 보여요.'}
      </p>
    </section>
  );
}

/* ─── 등록 학생 토글 — enrollment 활성/비활성 (client-side mock) ─── */
function EnrollmentToggleSection() {
  const [inactive, setInactive] = useState<Set<string>>(new Set());
  const enrolled = classRoster;
  const activeCount = enrolled.length - inactive.size;

  function toggle(id: string) {
    setInactive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="bg-card rounded-2xl border p-4">
      <SectionHeading
        title="등록 학생 관리"
        // 명단 mock 은 수학봇 A반 한 반치다 — 어느 반 명단인지 밝히고 쓴다.
        description={`${myClassBot.name} · 중2 수학 A반 · ${enrolled.length}명 등록 · 활성 ${activeCount}명 · 비활성 ${inactive.size}명`}
        action={
          <span className="text-pullim-slate-400 text-micro">데모 — 새로고침 시 초기화</span>
        }
      />
      {enrolled.length === 0 ? (
        <EmptyState
          tone="plain"
          size="sm"
          title="등록된 학생이 없어요"
          description="학생이 참여 코드로 들어오면 여기에 쌓여요."
        />
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-3">
          {enrolled.map(s => {
            const off = inactive.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  aria-pressed={!off}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors',
                    off
                      ? 'border-pullim-slate-200 bg-pullim-slate-50 text-pullim-slate-400'
                      : 'border-pullim-blue-200 bg-pullim-blue-50/50 text-pullim-slate-900 hover:border-pullim-blue-400',
                  )}
                >
                  <span className={cn('font-bold', off && 'line-through')}>{s.name}</span>
                  <ToggleRight className={cn('h-3.5 w-3.5', off ? 'rotate-180 text-pullim-slate-400' : 'text-pullim-blue-600')} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
