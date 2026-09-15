'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot, Send, Plus, Sparkles, Clock, Target, AlertCircle, ArrowRight, Inbox,
  Rocket, Shield, Wrench, School, Pause, Play,
  MoreHorizontal,
} from 'lucide-react';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { EmptyState } from '@/components/classbot/empty-state';
import { classroomLabel } from '@/components/builder/builder-types';
import { Chip } from '@/components/ui/chip';
import {
  currentTeacher, studentAssignments, scopeMeta, type Assignment,
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
import { SectionHeading } from '@/components/shell/section-heading';
import { cn } from '@/lib/utils';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

/**
 * 클래스봇 운영 메인 (SCR-C-17) — 「내가 만든 봇들이 어느 학급에 붙어서 어떻게 돌고 있나」.
 *
 * 이 화면이 하지 않는 것:
 *  - 학생 관제(명단·활동·도달 상태) → 학급 관제소(/teacher/monitor). 봇마다 길만 열어둔다.
 *  - 등록 학생 관리(명단 활성/비활성) — **지금 이 기능은 어디에도 없다.** 넘겨 줄 화면이 있어서
 *    걷은 게 아니다. 학급(/teacher/classroom)·학생(/teacher/students)·관제소(/teacher/monitor)는
 *    다 읽기 전용 명단이고(classroom 은 이름·들어온 날 두 칸짜리 표, students 는 관제소 명단을
 *    그대로 쓰는 얇은 화면), 세 트리 어디에도 「비활성」 토글이 없다. enrollment 를 BE 가
 *    내려줄 때 제 화면에 붙는다. 걷은 이유는 그 섹션이 사실이 아니어서다 — 「중2 수학 A반」
 *    한 반만 하드코딩이라 위 봇 목록과 이어지지 않았고, 스스로 「데모 — 새로고침 시 초기화」라
 *    적을 만큼 저장도 없는 토글이었다.
 *  - 안전 등급 변경 → 봇 관리(/teacher/bots/[botId]?tab=safety). 여기서는 지금 등급만 읽어준다.
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
  const drafts = useAssignmentStore((s) => s.drafts);
  /*
    회수한 과제는 이 화면에서도 내린다. 이 섹션이 답하는 질문은 「이 봇이 지금 뭘 돌리고 있나」라
    회수된 것이 섞이면 봇이 더 바빠 보인다. 교사가 회수한 것을 다시 볼 자리는 낸 과제 목록이고,
    거기서는 「회수됨」으로 갈라 보인다(`/teacher/assignment?status=withdrawn`).
    KPI 도 같은 셈을 읽어야 링크를 눌러 도착한 목록과 안 어긋난다.
  */
  const live = useMemo(
    () => dispatched.filter((a) => a.dispatchStatus !== 'withdrawn'),
    [dispatched],
  );
  const assignments = useMemo<AssignmentRow[]>(
    () => [...live, ...studentAssignments],
    [live],
  );

  const botRows = getTeacherBotRows();
  const summary = getTeacherBotSummary(botRows);

  return (
    <div className="space-y-7">
      <Suspense fallback={null}>
        <CreatedBanner />
      </Suspense>

      <PageHeader
        eyebrow={{ icon: Bot, text: '클래스봇 운영' }}
        title="내 클래스봇"
        description={`${currentTeacher.name} 선생님 · ${currentTeacher.organization}`}
        /*
          봇을 새로 만드는 버튼은 이 헤더와 아래 「내 봇」 빈 상태 둘 중 하나만 뜬다 —
          봇이 있으면 이 헤더 CTA, 없으면 빈 상태의 「봇 만들기」.

          근거는 `03 § 4.4.5` 의 「둘은 같은 화면에 함께 나오지 않는다 — 봇이 없으면 헤더 CTA 를
          내리고 빈 상태 액션 하나만 둔다」인데, **그 절은 스스로를 봇 관리(`/teacher/bots`)로
          한정한다.** 그러니 이 화면에 적용하는 것은 그 판례를 따르는 **유추**다.
          (`07 § 6.6.2(2)` 는 「같은 화면 버튼끼리 구분돼야 한다」는 **라벨 구분** 조항이라
          배타 규칙의 출처가 아니다 — `03 § 4.4.5` 가 그 조항을 다시 인용할 뿐이다.)

          이름이 옆 화면의 「새 봇」과 갈리는 것은 알고 두는 것이다 — `07 § 6.6.3` 표에 이 자리가
          없어 막는 규칙이 없고, `bots/page.tsx` 주석이 이 자리를 빌더 이식 TODO 의 「함께 고칠 곳」
          으로 이미 지목해 뒀다. 이름은 그 이식과 함께 움직인다.
        */
        action={
          botRows.length > 0 ? (
            <Link
              href="/teacher/builder"
              data-testid="classbot-new-cta"
              className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              새 클래스봇
            </Link>
          ) : undefined
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
        {/*
          낸 과제는 이제 갈 곳이 있다 — 숫자만 보여 주고 끊던 자리였다 (`proc/spec/14 § 3.2` 진입점 2).
          **회수한 과제는 세지 않는다**(위 `live`) — 「낸 과제」라는 말이 가리키는 것이 아니다.
          도착한 목록은 초안도 함께 그리므로 그 수를 더한다. 이 둘이 어긋나면 「2건」을 눌러
          5줄짜리 목록에 도착한다.
        */}
        <KpiStatLink
          label="낸 과제"
          value={`${assignments.length + drafts.length}건`}
          href="/teacher/assignment"
        />
      </KpiStatBar>

      {/* 봇 목록 — 이 화면의 본체 */}
      <BotOpsList rows={botRows} assignments={assignments} />

      {/* 낸 과제 — 봇별로 묶어서 본다 */}
      <DispatchedAssignments assignments={assignments} rows={botRows} />
    </div>
  );
}

/* ─── 봇 목록 — 봇마다 학급 배정·안전 등급·낸 과제·동선 ─── */

// 행 데이터 = store dispatched(UserAssignment) + mock 시드(Assignment) 혼합 — targetStudentIds 는 발송분만 보유.
type AssignmentRow = Assignment & { targetStudentIds?: string[] };

function BotOpsList({ rows, assignments }: { rows: TeacherBotRow[]; assignments: AssignmentRow[] }) {
  return (
    <section id="bot-list" data-testid="bot-ops-list" className="scroll-mt-20">
      {/*
        제목 옆 「봇 만들기」 링크는 걷어냈다 — 같은 화면 헤더의 「새 클래스봇」과 같은 곳으로 가는
        같은 버튼이라 한 화면이 같은 말을 두 번 했다 (`07 § 6.3` 「같은 정보를 두 번 말하지 않는다」 ·
        `§ 6.5` 체크리스트).

        **「길이 하나뿐」이 된 것은 아니다.** 지금 모은 것은 헤더 CTA 하나이고, 아래 카드의
        「아직 붙은 학급이 없어요」 빈 상태 액션 「학급에 붙이기」도 같은 `/teacher/builder` 로 간다.
        죽은 갈래도 아니다 — `getTeacherBotRows()` 가 「만들어 두고 아직 안 붙인 봇」을
        `classrooms: []` 로 떨어뜨리므로, 봇을 막 만든 교사는 헤더 CTA 와 그 링크를 함께 본다.
        그 자리는 라벨이 하는 말(붙이기)과 도착지(빌더)가 어긋난 자리라 이번 범위 밖으로 두고
        따로 본다 — 여기서 같이 걷으면 그 어긋남이 고쳐지지 않은 채 숨는다.
      */}
      <SectionHeading title="내 봇" />

      {rows.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="아직 만든 봇이 없어요"
          description="봇을 만들어 학급에 붙이면 여기에서 운영 상태를 볼 수 있어요."
          action={{ href: '/teacher/builder', label: '봇 만들기' }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
 *
 * **둘만 남긴다 — 그 봇을 고치는 길과 그 봇으로 과제를 내는 길.**
 * 둘 다 어느 봇의 더보기를 눌렀는지가 링크에 실린다. 봇을 가리키지 못하는 길은 여기 두지 않는다.
 *
 * 걷어낸 셋:
 *  - 「봇 관리」·「안전 등급 바꾸기」 — 같은 화면(`/teacher/bots/[botId]`)으로 가는 길이
 *    한 메뉴에 둘이었다. 봇 관리는 왼쪽 레일에 제 자리가 있다.
 *  - 「학급 관제소」 — 봇이 아니라 학급을 보는 화면이라 **어느 봇의 더보기를 눌렀는지가
 *    실리지 않는다.** 위쪽 「등록 학생」 카드가 같은 데로 간다.
 */
function botMenuLinks(botId: string) {
  return [
    { href: `/teacher/builder/${botId}`,            icon: Wrench, label: '수정하기' },
    { href: `/teacher/assignment/new?bot=${botId}`, icon: Send,   label: '과제 내기' },
  ];
}

function BotCardMenu({ botId, botName, running }: { botId: string; botName: string; running: boolean }) {
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
        {botMenuLinks(botId).map(({ href, icon: Icon, label }) => (
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
 *  덜어낸 것: 말투(봇 관리에서 본다), 안전 등급 설명문(scope.allow — 배지로 갈음),
 *            바닥 링크 5개(더보기 안으로), 「진행 상황 보기」 앵커(바로 아래 낸 과제 섹션).
 * 카드 본체는 누르는 자리가 아니다 — 봇 하나짜리 화면이 아직 없어서 갈 데가 없다.
 */
function BotOpsCard({ row, assignmentCount }: { row: TeacherBotRow; assignmentCount: number }) {
  const { bot, ops, studentCount } = row;
  const running = ops.runState === 'running';
  const scope = scopeMeta[bot.scope];

  return (
    <li data-testid={`bot-ops-card-${bot.id}`} className="bg-card flex flex-col rounded-2xl border p-5">
      {/* 정체 — 이름 · 과목 · 학년 · 지금 도는지 · 안전 등급 */}
      <div className="flex items-start gap-3">
        <BotAvatar subject={bot.subject} name={bot.name} size="lg" />
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
            {/* 안전 등급 — 배지 하나로 읽어준다. 설명·변경은 봇 관리(왼쪽 레일). */}
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
            <p className="text-pullim-slate-500 mt-0.5 text-2xs">{ops.pauseReason}</p>
          )}
        </div>
        <BotCardMenu botId={bot.id} botName={bot.name} running={running} />
      </div>

      {/* 붙어 있는 학급 */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">
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
                className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg px-3 py-2"
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
/**
 * 모드 배지 3종 — [08 § 15.6] 「뱃지 3종(연습/오답정복/시험)이 모두 파랑 계열로 보이던 회귀를 해결」.
 * 그래서 **셋은 서로 다른 면**이어야 한다. 같은 표가 정한 값 그대로:
 *   연습     → brand 계열 옅은 면
 *   오답정복 → `accent.lime`   (레몬이 여기 쓰이는 근거. [§ 1.6] 남용 금지의 예외다)
 *   시험     → `surface.inverse` solid (navy) — 시험은 오류가 아니라 모드 전환이라 빨강이 아니다
 * `fg` 는 각 면 위에서 읽히는 글자색이다. 레몬 위에 흰 글씨를 얹으면 안 읽힌다.
 */
export const modeMeta = {
  'practice':       { ...assignmentModeBadge.practice,          color: assignmentModeBadge.practice.bg,          icon: Target },
  'exam':           { ...assignmentModeBadge.exam,              color: assignmentModeBadge.exam.bg,              icon: AlertCircle },
  'wrong-conquest': { ...assignmentModeBadge['wrong-conquest'], color: assignmentModeBadge['wrong-conquest'].bg, icon: Sparkles },
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
    <section id="dispatched" data-testid="dispatched-section" className="bg-card scroll-mt-20 rounded-2xl border p-5">
      <SectionHeading
        title="낸 과제"
        /*
          「오늘 N건」은 걷어냈다. 그 값은 날짜를 본 것이 아니라 `assignedAt` 라벨에 '오늘'·'방금'이
          들어 있는지를 센 것이라, **두 방향 모두 틀려 있었다**:

           - **과다 계수(로컬 경로)** — 출제 화면이 `assignedAt: '방금 냈어요'` 를 박고
             (`teacher/assignment/new/assignment-form.tsx` · `components/classbot/submission-status-sheet.tsx`)
             store 가 그것을 localStorage 로 굳힌다(`pullim-assignments`).
             그래서 **닷새 전에 낸 과제도 영원히 「오늘」로 세어졌다.**
           - **과소 계수(BE 경로)** — BE 동기화 행은 `assignedAt = row.dispatchedAt ?? ''` 로 ISO 가
             들어온다(`lib/store/assignments.ts`). '오늘'·'방금'이 있을 리 없어 **영영 0** 이었다.

          **고칠 수 있는 값이기는 하다** — `UserAssignment.dispatchedAt` 이 로컬 발송과 BE 동기화
          양쪽에 ISO 로 실리므로, KST 날짜로 견주면 두 경로 모두에서 맞는 「오늘 N건」이 나온다.
          **그 길을 닫는 게 아니라 지금은 안 하는 것**이다 — 사용자가 이 자리를 걷으라고 정했고
          (2026-09-15), 걷는 시점의 값은 위 두 방향으로 다 틀려 있었다.
          되살릴 때는 문자열 매칭이 아니라 `dispatchedAt` 의 KST 날짜로 센다.
        */
        description={`학생 풀이 진행 ${totalCompleted}/${totalCompleted + totalPending}문항`}
        action={
          <Link
            href="/teacher/assignment/new"
            data-testid="new-assignment-cta"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            과제 내기
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
                <span className="text-pullim-slate-500 min-w-0 truncate text-2xs">{g.classLabel}</span>
                {/*
                  이 봇으로 걸러진 목록으로 — 목록 쪽은 `?bot=` 를 받는 자리를 열어 두었는데
                  **보내는 쪽이 없었다**(`assignment-filters.ts` 의 `filterRows`).
                */}
                <Link
                  href={`/teacher/assignment?bot=${encodeURIComponent(g.botId)}`}
                  className="text-pullim-slate-500 hover:text-pullim-blue-700 ml-auto shrink-0 font-mono text-2xs font-bold"
                >
                  {g.items.length}건
                </Link>
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
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', mode.color, mode.fg)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-2xs">
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
            <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', mode.color, mode.fg)}>
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

          {/*
            개입 셋(리마인드 · 코멘트 · 오답 다시 내기)은 **과제 상세로 옮겼다**
            (`proc/spec/14 § 3.3.4`). 여기 있던 이유는 갈 자리가 없어서였다 — 이 화면의 질문은
            「봇이 잘 돌고 있나」이고, 「이 과제가 어떻게 되고 있나」는 다른 질문이다.
            그래서 남기는 것은 그리로 가는 길 하나뿐이다.
          */}
          <div className="mt-2">
            <Link
              href={`/teacher/assignment/${a.id}`}
              className="text-pullim-blue-600 hover:text-pullim-blue-700 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1 rounded-lg text-2xs font-bold outline-none focus-visible:ring-2"
            >
              학생별 현황
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
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

  // 두 분기 모두 데모 제약을 드러낸다. 빌더는 화면 안 상태로만 움직이고 저장하지 않아서
  // (핸드오프 § 4.1), 이 페이지로 넘어오면 새 봇은 이 배너 말고 아무 데도 남지 않는다.
  // 「넣었어요」·「봇은 남아 있고」처럼 쓰면 교사가 봇이 계속 있다고 믿고 나간다.
  const rooms = (params.get('rooms') ?? '').split(',').filter(Boolean);
  const roomNames = rooms.map(classroomLabel).join(' · ');

  return (
    <section className="bg-pullim-blue-50 border-pullim-blue-200 text-pullim-blue-900 rounded-2xl border p-5">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        <strong className="text-sm">방금 만든 봇: {created}</strong>
      </div>
      <p className="text-pullim-blue-700 mt-1 text-2xs">
        {rooms.length
          ? `${roomNames}에 넣기로 골랐어요. 다만 이건 데모라 이 봇은 저장되지 않아요 — v1 backend 연결 뒤에 실제로 남고 학생에게도 보여요.`
          : '반은 아직 안 골랐어요. 다만 이건 데모라 이 봇은 저장되지 않아요 — v1 backend 연결 뒤에 실제로 남아요.'}
      </p>
    </section>
  );
}
