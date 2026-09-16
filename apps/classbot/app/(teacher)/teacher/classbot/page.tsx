'use client';

import { Suspense, useCallback, useMemo, useRef, useState, type Ref } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot, Send, Plus, Sparkles, Clock, Target, AlertCircle, ArrowRight, Inbox,
  Rocket, Shield, Wrench, School, Pause, Play,
  MoreHorizontal, Trash2,
} from 'lucide-react';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { EmptyState } from '@/components/classbot/empty-state';
import { BotDeleteDialog } from '@/components/classbot/bot-delete-dialog';
import { classroomLabel } from '@/components/builder/builder-types';
import { Chip } from '@/components/ui/chip';
import {
  currentTeacher, scopeMeta, josa,
} from '@/lib/mock';
import {
  getTeacherBotRows, getTeacherBotSummary, runStateLabels, type TeacherBotRow,
} from '@/lib/mock/classbot-teacher-ops';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { useOperatorClasses } from '@/hooks/api/classroom';
import type { AssignmentSummaryDto } from '@/lib/api/classbot-dto';
import { dDayLabel, dispatchedAtLabel } from '@/lib/assignment-labels';
import {
  isDueSoon, modeOf, remainingOf, toTeacherClass, type TeacherClass,
} from '@/app/(teacher)/teacher/assignment/assignment-filters';
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
  /*
    낸 과제는 **정본**에서 읽는다 — `GET /classbot/assignments?audience=teacher`(2026-09-16 계획 §06 R11 · FE PR 6).
    종전의 localStorage 스토어 + mock 시드(`studentAssignments`) 합산은 걷었다. 반 이름은 정본 반 목록에서 조인한다.
    정본에는 회수·초안이 없어(내는 순간 `sent`) 여기서 거를 것도 없다 — 목록 전부가 「낸 과제」다.
    KPI 도 같은 셈을 읽어야 링크를 눌러 도착한 목록(「전체」)과 안 어긋난다.
  */
  const teacherAssignments = useTeacherAssignments();
  const teacherClasses = useOperatorClasses();
  const allAssignments = useMemo<AssignmentRow[]>(
    () => teacherAssignments.data ?? [],
    [teacherAssignments.data],
  );
  const classIndex = useMemo(
    () => new Map<string, TeacherClass>((teacherClasses.data ?? []).map(toTeacherClass).map((c) => [c.id, c])),
    [teacherClasses.data],
  );

  /*
    삭제는 **화면 안 상태로만** 돈다 — 지운 봇의 id 를 여기 모아 두고 걸러낸다.
    `lib/mock/*` 의 배열을 직접 지우지 않는 까닭: mock 모듈은 이 화면만 읽는 게 아니라
    학생 화면·관제소·과제 폼이 함께 읽는 공유 데이터다. 거기서 지우면 이 화면에서 누른
    버튼이 남의 화면까지 바꾼다.
    진짜 삭제는 BE 별건이고, 그 방향은 `03 § 4.4.8` 이 정본으로 적어 뒀다 —
    **하드 삭제를 만들지 않고 `archived_at` 소프트 삭제 + 목록 필터로 간다.**
    까닭은 `class_bots` 가 이미 11개 테이블의 `ON DELETE CASCADE` 부모라,
    `DELETE` 한 줄이 학생의 대화·제출·과제·성취를 교사 버튼 하나로 지우기 때문이다.

    ── 이 리포의 판례 둘과 이 자리의 관계 ──────────────────────────────────────
    이 화면에는 「사실이 아닌 것은 걷는다」와 「되돌릴 수 없는 일에만 되묻는다」가 이미
    판례로 적혀 있다. 이 삭제는 둘 다에 걸리는 모양이라, 왜 그래도 이렇게 두는지를
    여기 적어 둔다 — 다음 사람이 세 판단을 같이 읽으라고.

    ㉠ #320 이 이 파일 머리주석에 「등록 학생 관리」를 걷은 이유를 적어 뒀다 —
      「그 섹션이 사실이 아니어서다 … 스스로 「데모 — 새로고침 시 초기화」라 적을 만큼
      **저장도 없는 토글**이었다」. 이 삭제도 저장이 없다(새로고침이면 봇이 돌아온다).
      **다른 점은 걷을 자리가 아니라 놓을 자리라는 것**이다 — 그 섹션은 넘겨 줄 화면도,
      BE 가 내려줄 데이터도, 정본 방향을 적은 문서도 없이 토글만 있었다. 봇 삭제는
      **권위 문서가 갈 자리를 이름 대고 정해 뒀다**(`03 § 4.2.1`·`§ 4.4.8`) — 이 화면의
      버튼이 「지금은 화면 안 데모」라는 것, 모달이 고정 문구라는 것, 그리고 BE 가
      `archived_at` 소프트 삭제로 간다는 것까지 그 두 절이 적는다.
      ⚠️ **스키마에 그 컬럼이 이미 있는 것은 아니다** — `§ 4.4.8 (a)` 가 「`deleted_at`·
      `archived_at`·`status` 같은 소프트 삭제 컬럼은 `class_bots` 에 없다. 지금 있는 것은
      하드 삭제 한 길뿐이다」라고 못박는다(직접 확인했다 — `lib/db/schema.ts`·`drizzle/`
      어디에도 없다). 있는 것은 **결정**이지 **컬럼**이 아니다.
      그래서 이 PR 은 그 앞단(되묻는 판·포커스·숫자 동반 감소)을 먼저 세운다.
      **BE 가 붙을 때 바뀌는 곳은 `handleDelete` 하나가 아니다** — `§ 4.4.8 (e)` 가
      같이 고쳐야 하는 술어를 전수로 센다((e-1) 읽기 일곱 · (e-2) 쓰기 검증 넷 ·
      일부러 안 거르는 ⛔ 둘). 여기서 서는 것은 그 BE 작업의 **화면 쪽 절반**이다.
    ㉡ 되묻기 관용구는 「되돌릴 수 없는 일에만 되묻는다」이고 두 자리가 그 기준을 주석으로
      못 박아 뒀다 — `classroom/join-code-block.tsx`(「코드 다시 내기는 **되돌릴 수 없다**」),
      `classbot/my-bots/my-bot-card.tsx`(「빼기는 되묻지 않는다 — 다시 담으면 그만이라
      되돌릴 수 없는 일이 아니다」). **지금 구현만 재면 이 삭제는 후자 쪽**이다.
      그런데도 되묻는 판을 먼저 세우는 까닭은, 이 자리에 올 진짜 삭제가 학생의 대화·제출·
      성취까지 함께 지우는 11테이블 cascade 라서다(바로 위). 되묻는 판을 BE 와 같이
      들이면 그때 급히 지어야 하고, 그 판이 접근성까지 맞는지 아무도 못 본다.
      `my-bot-card` 주석도 「대화 기록까지 지우게 되는 P4 부터는 이 판단을 다시 봐야
      한다」로 같은 방향을 가리킨다 — 여기가 그 P4 쪽 자리다.

    화면에 「데모 — 새로고침 시 초기화」 같은 안내는 **넣지 않는다.** 규칙서·권위 문서
    어디에도 그 안내를 강제하는 조항이 없고, 검토 끝에 사용자가 넣지 않기로 정했다.
    (넣지 않기로 한 결정이지, 안 본 자리가 아니다.)
  */
  const [deletedBotIds, setDeletedBotIds] = useState<ReadonlySet<string>>(() => new Set());
  const [deleteNotice, setDeleteNotice] = useState('');
  const botListRef = useRef<HTMLElement>(null);

  const allRows = useMemo(() => getTeacherBotRows(), []);

  /*
    숫자가 거짓말하지 않게 — 이 화면에서 그 봇을 세는 자리가 넷이다(카드 · 상단 통계 4칸 ·
    「낸 과제」 묶음). **한 군데서 거른 목록을 넷이 모두 받아 쓴다.**

    거르는 목록도 넷이다 — 봇(`botRows`) · 낸 과제(`assignments`) · 초안(`visibleDrafts`) ·
    그 셋을 받아 세는 `summary`. **넷 다 같은 `deletedBotIds` 를 지난다.** 하나라도 빠뜨리면
    카드는 사라졌는데 숫자만 안 줄어드는, 이 화면이 막으려던 바로 그 모양이 된다.

    `getTeacherBotSummary()` 의 시그니처를 넓히는 길(⑴)은 택하지 않았다 — 이미
    `rows` 를 받고 기본값으로만 mock 전체를 읽고 있어서, 걸러진 목록을 넘기기만 하면
    된다(⑵). 공유 mock 모듈을 건드리지 않고 끝나는 쪽이 이 PR 의 경계에도 맞는다.
  */
  const botRows = useMemo(
    () => allRows.filter(r => !deletedBotIds.has(r.bot.id)),
    [allRows, deletedBotIds],
  );
  const summary = getTeacherBotSummary(botRows);

  /*
    지운 봇의 과제도 함께 내린다. 목록에서만 빼면 `groupByClass` 가 그 과제들을
    「반 목록에 없는 반」 묶음으로 되살려, 지운 봇의 과제가 이름만 바뀐 채 남는다.
    (bot == class 라 `classId` 를 봇 id 와 견준다. 초안은 이 화면이 더 세지 않는다 — 정본 목록에 초안이 없다.)
  */
  const assignments = useMemo(
    () => allAssignments.filter(a => !deletedBotIds.has(a.classId)),
    [allAssignments, deletedBotIds],
  );

  const handleDelete = useCallback((botId: string, botName: string) => {
    setDeletedBotIds(prev => {
      if (prev.has(botId)) return prev;
      const next = new Set(prev);
      next.add(botId);
      return next;
    });
    /*
      지우면 그 카드가 사라지므로 포커스를 돌려줄 「더보기」 트리거도 함께 없어진다.
      그대로 두면 포커스가 `body` 로 떨어져 낭독기가 문서 처음으로 되감긴다.
      「내 봇」 목록으로 옮겨 준다 — 봇을 다 지운 경우에는 같은 자리에 빈 상태가 선다.
      그 `<section>` 에는 `aria-label` 로 이름을 달아 뒀다(`BotOpsList`). 이름 없는 곳으로
      포커스를 던지면 도착해도 낭독기가 부를 말이 없다.

      **알림은 포커스가 자리를 잡은 뒤에 싣는다.** 둘을 같은 커밋에 두면 polite 라이브
      리전 발화와 포커스 이동이 한 프레임 안에서 겹쳐, 낭독기가 「…을 삭제했어요」를
      끊고 새 포커스 대상을 읽는다(흔한 충돌이다). 순서를 「포커스 → 알림」으로 못박으면
      「내 봇, 영역」 다음에 「국어봇을 삭제했어요」가 이어 읽힌다.
    */
    requestAnimationFrame(() => {
      botListRef.current?.focus();
      setDeleteNotice(`${josa(botName, '을/를')} 삭제했어요.`);
    });
  }, []);

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

          이름은 이제 갈리지 않는다 — 교사 홈 · 이 화면 · [봇 관리] 셋이 **「새 클래스봇」** 한 이름이다
          (`proc/spec/03 § 4.4.5` 의 2026-09-16 개정). 종전에는 [봇 관리]만 「새 봇」이었고 그 갈림을
          알고 두었는데, 그 판단이 뒤집혔다. 빌더 만든 뒤 화면(`components/builder/done-view.tsx`)도
          같은 이름으로 맞췄다. `07 § 6.6.3` 표는 이제 [봇 관리] 헤더 행을 담는다 — 이 화면 헤더는
          여전히 그 표에 없지만, 어긋날 이름이 없으므로 막는 규칙이 필요하지도 않다.
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
      <KpiStatBar cols={4} size="lg">
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
          정본 목록 전부를 센다(위 `allAssignments`) — 도착한 목록의 「전체」와 같아야 「2건」을 눌러 2줄짜리 목록에 도착한다.

          ⚠️ **봇 삭제에 대해서는 그 불변식이 지금 깨져 있다 — 알고 두는 것이다.**
          여기 세는 목록은 지운 봇을 걸렀지만, 도착지 `/teacher/assignment` 는 정본을 그대로 그린다 —
          삭제가 이 화면 안 상태(`deletedBotIds`)라 저 화면은 그 사실을 알 길이 없다. 이 어긋남은
          「삭제가 화면 안 데모」라는 성격에서 그대로 따라오고(`03 § 4.2.1`), 봇 삭제가 정본으로 가는 날 닫힌다.
        */}
        <KpiStatLink
          label="낸 과제"
          value={`${assignments.length}건`}
          href="/teacher/assignment"
        />
      </KpiStatBar>

      {/* 봇 목록 — 이 화면의 본체 */}
      <BotOpsList
        ref={botListRef}
        rows={botRows}
        assignments={assignments}
        onDelete={handleDelete}
        notice={deleteNotice}
      />

      {/* 낸 과제 — 반(=봇)별로 묶어서 본다 */}
      <DispatchedAssignments
        assignments={assignments}
        classes={classIndex}
        isPending={teacherAssignments.isPending}
        isError={teacherAssignments.isError}
      />
    </div>
  );
}

/* ─── 봇 목록 — 봇마다 학급 배정·안전 등급·낸 과제·동선 ─── */

// 행 데이터 = 정본 요약 한 행. 봇 카드와의 조인 키는 `classId`(bot == class).
type AssignmentRow = AssignmentSummaryDto;

function BotOpsList({
  ref,
  rows,
  assignments,
  onDelete,
  notice,
}: {
  ref?: Ref<HTMLElement>;
  rows: TeacherBotRow[];
  assignments: AssignmentRow[];
  onDelete: (botId: string, botName: string) => void;
  /** 삭제 직후 낭독기에 읽어줄 말 — 눈으로 읽는 안내가 아니다 */
  notice: string;
}) {
  return (
    <section
      ref={ref}
      id="bot-list"
      data-testid="bot-ops-list"
      /*
        지운 뒤 포커스를 받아 주는 자리 — 사라진 「더보기」 버튼에 포커스가 남지 않게 한다.
        탭 순서에는 끼지 않는다(`-1`).

        **이름을 단다.** 이름 없는 `<section>` 은 낭독기에 부를 말이 없어서, 포커스가
        도착해도 아무 말 없이 조용하다. `aria-label` 로 아래 `SectionHeading` 과 같은 말을
        달아 둔다 — 셸 프리미티브(`components/shell/section-heading.tsx`)는 제목에 id 를
        받지 않아 `aria-labelledby` 로 잇자면 공유 컴포넌트를 넓혀야 하고, 그건 이 PR 의
        경계 밖이다. 두 글자가 갈리면 이름만 바뀌는 것이라 조용히 틀리지도 않는다.

        **포커스 표시를 살린다.** `outline-none` 만 두면 판의 「삭제」를 엔터로 누른
        키보드 사용자가 아무 표시 없는 자리로 옮겨진다(크롬은 키보드 상호작용 직후의
        프로그램적 포커스에도 `:focus-visible` 을 준다). 마우스로 눌렀을 때는 링이 뜨지
        않게 `focus-visible:` 로 좁힌다 — 이 리포의 다른 포커스 대상과 같은 관용구다
        (같은 파일 `DropdownMenuTrigger`, `my-bot-card.tsx`).
      */
      aria-label="내 봇"
      tabIndex={-1}
      className="focus-visible:ring-pullim-blue-400/50 scroll-mt-20 rounded-xl outline-none focus-visible:ring-2"
    >
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

      {/*
        지운 사실은 낭독기에만 알린다 — 화면에는 남기지 않는다.
        이 글이 채워지는 시점은 포커스가 이 `<section>` 에 닿은 **뒤**다(`handleDelete`) —
        같은 프레임에 겹치면 polite 발화가 포커스 이동에 잘린다.
      */}
      <p className="sr-only" role="status">
        {notice}
      </p>

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
              assignmentCount={assignments.filter(a => a.classId === row.bot.id).length}
              onDelete={onDelete}
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
 * **「봇 삭제」도 카드에 따로 깔지 않고 이 안에 둔다** — 같은 까닭이고, 위험한 버튼일수록
 * 카드마다 깔려 있으면 잘못 눌린다.
 *
 * **나가는 길은 둘만 남긴다 — 그 봇을 고치는 길과 그 봇으로 과제를 내는 길.**
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

function BotCardMenu({
  botId,
  botName,
  running,
  onDelete,
}: {
  botId: string;
  botName: string;
  running: boolean;
  onDelete: (botId: string, botName: string) => void;
}) {
  const RunIcon = running ? Pause : Play;
  /*
    판이 닫힐 때 포커스를 돌려줄 자리를 손으로 대 준다.
    (base-ui 기본값으로도 여기로 돌아온다 — 드롭다운이 닫히며 제 트리거로 포커스를 되돌리기
    때문이다. 그래도 명시하는 까닭은 `bot-delete-dialog.tsx` 머리주석에 적어 뒀다.)
  */
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
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
          {/*
            삭제는 되돌릴 수 없는 일이라 위 둘과 눈으로도 갈려야 한다 —
            이 리포의 danger 토큰(`AlertCard tone="danger"` 가 쓰는 `--color-pullim-danger`)
            을 그대로 쓴다. 메뉴의 `variant="destructive"` 는 PUDS `--destructive` 를 따라가
            이 화면의 빨강과 다른 빨강이 된다.
            링크가 아니라 버튼이다 — 누르면 어디로 가는 게 아니라 여기서 한 번 더 묻는다.

            **그 사실을 `aria-haspopup="dialog"` 로 낭독기에도 싣는다.** 옆의 두 항목
            (`수정하기`·`과제 내기`)은 링크라 저절로 구별되지만 이 항목만 겉보기가 같고
            하는 일이 다르다. 종전 회수 판(`withdraw-controls.tsx` — 정본에 회수 문이 없어 FE PR 6 에서 지웠다)이
            같은 문제를 이름 대고 적어 뒀었다 — 「평범한 button 을 쓰면 base-ui 가 `aria-haspopup`·`aria-expanded` 를
            안 달고 … 키보드·스크린리더 사용자가 화면에서 제 자리를 잃는다」. 여기서는 메뉴 항목이라
            `DialogTrigger` 를 쓸 수 없다 — 트리거 노릇을 하려면 판이 열려 있는 동안 붙어
            있어야 하는데, 이 항목은 누르는 순간 메뉴와 함께 언마운트된다. 그래서 그 주석이
            걱정한 둘을 나눠 푼다 — 포커스 복귀는 `finalFocus` 로, 힌트는 이 한 줄로.
            `aria-expanded` 는 얹지 않는다: 이 항목은 눌린 순간 메뉴와 함께 사라져
            「열려 있는 상태」를 가질 수 없고, 없는 상태를 `false` 로 말하면 그게 거짓말이다.
          */}
          <DropdownMenuItem
            data-testid={`bot-delete-${botId}`}
            aria-haspopup="dialog"
            className="text-pullim-danger focus:bg-pullim-danger-bg focus:text-pullim-danger px-2 py-1.5 [&_svg]:text-pullim-danger"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            봇 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BotDeleteDialog
        botName={botName}
        open={confirming}
        onOpenChange={setConfirming}
        onConfirm={() => onDelete(botId, botName)}
        finalFocus={triggerRef}
      />
    </>
  );
}

/**
 * 봇 카드 — 「이 봇이 지금 제대로 돌고 있나」에 필요한 것만 남긴다.
 *  남긴 것: 이름·과목·학년 / 운영 상태(멈춤이면 이유) / 안전 등급 배지 / 붙은 학급과 인원 / 낸 과제 수.
 *  덜어낸 것: 말투(봇 관리에서 본다), 안전 등급 설명문(scope.allow — 배지로 갈음),
 *            바닥 링크 5개(더보기 안으로), 「진행 상황 보기」 앵커(바로 아래 낸 과제 섹션).
 * 카드 본체는 누르는 자리가 아니다 — 봇 하나짜리 화면이 아직 없어서 갈 데가 없다.
 */
function BotOpsCard({
  row,
  assignmentCount,
  onDelete,
}: {
  row: TeacherBotRow;
  assignmentCount: number;
  onDelete: (botId: string, botName: string) => void;
}) {
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
        <BotCardMenu botId={bot.id} botName={bot.name} running={running} onDelete={onDelete} />
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

/**
 * 반(=봇)별로 묶는다 — 조인 키는 정본 행의 `classId`(bot == class). 이름은 정본 반 목록(`useOperatorClasses`)에서,
 * 거기 없는 반의 과제는 맨 뒤에 「반 목록에 없는 반」으로 따로 둔다(지어낸 이름을 붙이지 않는다).
 */
function groupByClass(assignments: AssignmentRow[], classes: ReadonlyMap<string, TeacherClass>) {
  const byClass = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const list = byClass.get(a.classId);
    if (list) list.push(a);
    else byClass.set(a.classId, [a]);
  }
  const groups: { classId: string; name: string; meta: string; items: AssignmentRow[] }[] = [];
  for (const [classId, items] of byClass) {
    const klass = classes.get(classId);
    groups.push({
      classId,
      name: klass?.name ?? '반 이름 없음',
      meta: klass
        ? [klass.subject, klass.grade].filter(Boolean).join(' ') || '반 목록에 있는 반'
        : '반 목록에 없는 반',
      items,
    });
  }
  return groups;
}

function DispatchedAssignments({
  assignments,
  classes,
  isPending,
  isError,
}: {
  assignments: AssignmentRow[];
  classes: ReadonlyMap<string, TeacherClass>;
  isPending: boolean;
  isError: boolean;
}) {
  const totalQuestions = assignments.reduce((s, a) => s + a.questionCount, 0);
  const groups = groupByClass(assignments, classes);

  return (
    <section id="dispatched" data-testid="dispatched-section" className="bg-card scroll-mt-20 rounded-2xl border p-5">
      <SectionHeading
        title="낸 과제"
        /*
          부제는 정본 목록이 실제로 세는 값만 말한다 — 건수와 문항 수. 종전의 「학생 풀이 진행 N/M문항」은
          localStorage 제출 기록을 합산한 값이라 정본과 함께 걷었다. 학생 풀이 진행은 과제 상세(`/submissions`)가 답한다.
          「오늘 N건」도 두지 않는다(2026-09-15 결정 — 라벨 문자열로 세던 값이 두 방향으로 틀려 있었다).
        */
        description={`${assignments.length}건 · ${totalQuestions}문항`}
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
      {isPending ? (
        <p className="text-pullim-slate-500 py-6 text-center text-sm">불러오는 중이에요…</p>
      ) : isError ? (
        <p role="alert" className="text-pullim-danger py-6 text-center text-sm">낸 과제를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      ) : groups.length === 0 ? (
        <EmptyState icon={Inbox} title="아직 낸 과제가 없어요" action={{ href: '/teacher/assignment/new', label: '과제 내기' }} />
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <div key={g.classId} data-testid={`dispatched-group-${g.classId}`}>
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <h3 className="text-pullim-slate-900 text-xs font-bold">{g.name}</h3>
                <span className="text-pullim-slate-500 min-w-0 truncate text-2xs">{g.meta}</span>
                {/* 이 반으로 걸러진 목록으로 — 목록 쪽은 `?class=` 를 받는다(`assignment-filters.ts`). */}
                <Link
                  href={`/teacher/assignment?class=${encodeURIComponent(g.classId)}`}
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

/**
 * 과제 한 줄 — 정본 요약 행이 아는 것만 그린다. 진행 바·정답률은 두지 않는다(목록 DTO 에 제출 집계가 없고,
 * 줄마다 `/submissions` 를 부르면 N+1 이다) — 「학생별 현황」 링크가 그 답이 있는 상세로 보낸다.
 */
function DispatchedRow({ assignment: a }: { assignment: AssignmentRow }) {
  const mode = modeMeta[modeOf(a)];
  const Icon = mode.icon;
  // 마감은 지금 기준 — 정본 `dDay` 는 낼 때 굳힌 정수라 `dispatchedAt` 로 다시 센다(`assignment-filters.ts`).
  const remaining = remainingOf(a);
  const isUrgent = isDueSoon(a);

  return (
    <li data-testid={`dispatched-row-${a.id}`} className="bg-pullim-slate-50/50 hover:bg-pullim-slate-50 rounded-xl p-3 transition-colors">
      <div className="flex items-start gap-3">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', mode.color, mode.fg)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-2xs">
            <span className="text-pullim-slate-500 font-bold">
              <Clock className="-mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {dispatchedAtLabel(a.dispatchedAt) || '낸 시각 없음'}
            </span>
            <span className="text-pullim-slate-300">·</span>
            <span className={cn('font-mono font-bold', isUrgent ? 'text-pullim-danger' : 'text-pullim-slate-500')}>
              {dDayLabel(remaining)} ({a.dueLabel})
            </span>
            <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', mode.color, mode.fg)}>
              {mode.label}
            </span>
          </div>
          <div className="text-pullim-slate-900 mt-1 text-sm font-bold">{a.title}</div>
          <div className="text-pullim-slate-500 mt-0.5 text-2xs">
            {a.scope} · {a.questionCount}문항 · 난이도 {a.difficulty}
          </div>

          {/*
            개입 셋(리마인드 · 코멘트 · 오답 다시 내기)은 이 화면에 없다 — 이 화면의 질문은 「봇이 잘 돌고 있나」이고,
            「이 과제가 어떻게 되고 있나」는 과제 상세가 답한다. 종전 리마인드 버튼·제출 현황 시트는 은퇴한 로컬 제출
            레인·목 명단 위에 서 있어 FE PR 6 에서 걷었고, 명단 문이 pullim-api 에 열린 뒤(5b) 별건으로 되살린다.
            그리로 가는 길 하나만 남긴다.
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
