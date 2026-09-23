'use client';

import { Suspense, useCallback, useMemo, useRef, useState, type Ref } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bot, Send, Plus, Clock, ArrowRight, Inbox,
  Rocket, Wrench, School,
  Archive, MoreHorizontal,
} from 'lucide-react';
import { BotAvatar } from '@/components/classbot/bot-avatar';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { KpiStatLink } from '@/components/classbot/kpi-stat-link';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { EmptyState } from '@/components/classbot/empty-state';
import { assignmentModeMeta as modeMeta } from '@/components/classbot/assignment-mode-meta';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { BotDeleteDialog } from '@/components/classbot/bot-delete-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { josa } from '@/lib/mock';
import { useArchiveBot, useMyBots } from '@/hooks/api/bot';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { useOperatorClasses } from '@/hooks/api/classroom';
import { isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import type { ApiError } from '@pullim-classbot/api-client';
import { classNameOf, type AssignmentSummaryDto, type BotDto } from '@/lib/api/classbot-dto';
import { dDayLabel, dispatchedAtLabel } from '@/lib/assignment-labels';
import {
  isDueSoon, modeOf, remainingOf, toTeacherClass, type TeacherClass,
} from '@/app/(teacher)/teacher/assignment/assignment-filters';
/*
  안전 등급 칩은 봇 관리(`/teacher/bots`)와 **같은 부품**을 쓴다. 서버가 주는 `scope` 는 CHECK 없는
  integer 라 L1~L5 로 좁혀지지 않는 값이 올 수 있고, 그때 「가까운 등급」으로 고쳐 부르지 않고 숫자를
  그대로 말하는 판단이 그 파일에 적혀 있다. 여기서 같은 판단을 한 벌 더 쓰면 언젠가 한쪽만 바뀐다.
*/
import { ScopeChip } from '@/app/(teacher)/teacher/bots/bots-workspace';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { cn } from '@/lib/utils';

/**
 * 클래스봇 운영 메인 (SCR-C-17) — 「내가 만든 봇들이 어느 학급에 붙어서 어떻게 돌고 있나」.
 *
 * ── 2026-09-18 · 한 화면에 목과 정본이 나란히 서 있었다 ──────────────────────
 * 「낸 과제」 묶음은 이미 정본(`useTeacherAssignments`·`useOperatorClasses`)을 읽는데, 바로 위
 * 봇 목록과 상단 요약은 mock 카탈로그(`lib/mock/classbot-teacher-ops` 의 `getTeacherBotRows()`·
 * `getTeacherBotSummary()`)였다. 어느 교사가 열어도 같은 다섯 봇 — 국어봇·수학봇… — 이 떴고,
 * 「운영 중 3/5개 · 붙은 학급 6개 · 등록 학생 77명」이 그 위에 섰다. 하나도 그 교사의 것이 아니었다.
 *
 * 이제 봇 줄은 **정본**에서 온다 — `GET /classbot/me/bots`(`useMyBots` · api.md § 3.5b · 계획 PR 5d).
 * 봇 관리(`/teacher/bots`)가 읽는 것과 **같은 문·같은 행**이라 두 화면이 같은 봇을 말한다.
 * 이름·과목·학년·안전 등급은 1급 `bots` 표의 값이다(pullim-api #673 이 페르소나 입력원을
 * `class_bot_profiles` → `bots` 로 옮겼다 — 그 전에는 봇 이름 자리에 반 이름이 떨어졌다).
 *
 * 걷은 것 둘과 그 까닭 — **정본에 그 칸이 없다. 없는 값을 0 이나 기본값으로 세우지 않는다.**
 *  - **「운영 중」(운영 중/멈춤 · 멈춘 이유)** — `BotDto` 에 봇이 지금 학생에게 열려 있는지를
 *    말하는 칸이 없다. 카드의 상태 칩도, 더보기의 「봇 멈추기 / 다시 돌리기」 항목도 함께 걷었다 —
 *    그 항목은 **라벨이 갈리려면 지금 상태를 알아야 한다.** 둘 중 하나를 골라 적는 순간
 *    「준비 중」이라 적어 둔 자리가 지어낸 상태를 말하게 된다.
 *  - **「등록 학생 N명」** — 반 카드가 주는 `profile.enrolledCount` 는 **반별** 인원이라 더하면
 *    두 반을 듣는 학생이 두 번 세어진다. 사람을 세는 문(`GET /classes/:classId/members`)은
 *    반 하나짜리라 반 수만큼 부르는 일이 된다. 교사 홈이 같은 이유로 총원 합산을 거부했다
 *    (`app/(teacher)/teacher/page.tsx` 의 `classCount` 주석). 반 **하나**의 인원은 그 반 줄에 적는다 —
 *    그건 카드가 스스로 아는 값이다.
 *    그 칸은 **이 화면**에서 학급 관제소(`/teacher/monitor`)로 가던 하나뿐인 길이기도 했다.
 *    **되살리지 않는다** — 그 화면은 아직 목이고, 이 화면에서 목으로 가는 길을 새로 내지 않는다
 *    (교사 홈이 같은 판단을 적어 뒀다 — `app/(teacher)/teacher/page.tsx` 의 「먼저 볼 학생」 빈 상태).
 *    ⚠ **관제소가 앱에서 닫힌 것은 아니다** — 교사 레일에 상설 항목이 있고
 *    (`components/shell/nav-config.ts` 의 `/teacher/monitor` 「학급 관제소」),
 *    학생 화면(`app/(teacher)/teacher/students/page.tsx`)의 되돌아갈 곳도 거기다.
 *    레일은 이 화면의 범위 밖이고 종전부터 그랬다.
 *
 * 이 화면이 하지 않는 것:
 *  - 학생 관제(명단·활동·도달 상태) → 학급 관제소(/teacher/monitor). 위 까닭으로 **이 화면에서** 가는 길은 없다
 *    (레일에는 있다).
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
    봇·반·과제 셋 다 **정본**에서 읽는다.
     - 봇   `GET /classbot/me/bots`      — 내가 owner 인 봇 전부(최신순 · 없으면 `[]`)
     - 반   `GET /classbot/bots?role=teacher` — 아직 bot == class 인 옛 문이라 카드 한 장이 반 하나다
     - 과제 `GET /classbot/assignments?audience=teacher`(2026-09-16 계획 §06 R11 · FE PR 6)
    정본에는 회수·초안이 없어(내는 순간 `sent`) 여기서 거를 것도 없다 — 목록 전부가 「낸 과제」다.
    KPI 도 같은 셈을 읽어야 링크를 눌러 도착한 목록(「전체」)과 안 어긋난다.
  */
  const myBots = useMyBots();
  const teacherAssignments = useTeacherAssignments();
  const teacherClasses = useOperatorClasses();

  /**
   * 낸 과제 — **`null` 이 「아직 모른다」다.** 빈 배열과 갈라 둬야 읽는 중·실패에 「0건」이라 말하지
   * 않는다(모르는 것을 0 이라 부르는 것도 지어내기다).
   */
  const assignments = teacherAssignments.data ?? null;
  const classIndex = useMemo(
    () => new Map<string, TeacherClass>((teacherClasses.data ?? []).map(toTeacherClass).map((c) => [c.id, c])),
    [teacherClasses.data],
  );

  // 보관은 서버의 soft archive다. 활성 목록 캐시를 무효화해 운영 화면과 봇 관리가 같은 상태를 본다.
  const [deleteNotice, setDeleteNotice] = useState('');
  const botListRef = useRef<HTMLElement>(null);
  const archiveBot = useArchiveBot();

  /*
    숫자가 거짓말하지 않게 — 이 화면에서 그 봇을 세는 자리가 셋이다(카드 · 상단 통계 「내 봇」 ·
    「붙은 학급」). **한 군데서 거른 목록을 셋이 모두 받아 쓴다.** 하나라도 빠뜨리면 카드는 사라졌는데
    숫자만 안 줄어드는, 이 화면이 막으려던 바로 그 모양이 된다.

    **「낸 과제」는 이 거르기를 지나지 않는다 — 봇과 반이 갈린 뒤로 그게 맞다.** 과제는 반(`classId`)에
    달려 있고 봇을 이 화면에서 지워도 그 반과 그 반의 과제는 그대로 있다. 종전에는 bot == class 라
    지운 봇의 과제도 함께 내렸는데, 지금 그렇게 하면 **멀쩡히 살아 있는 반의 과제를 없는 것처럼**
    말하게 되고 도착지 `/teacher/assignment` 의 「전체」와도 어긋난다.
  */
  const bots = useMemo(() => myBots.data ?? [], [myBots.data]);
  /*
    붙은 학급 수는 **봇 행이 실어 준 `classIds`**(= `classes.bot_id == id`)로 센다 — 반 목록을
    못 읽어도 아는 값이다. 한 반은 봇 하나만 가리키므로 겹칠 일이 없지만, 세는 값이라 Set 으로 못박는다.
  */
  const attachedClassCount = useMemo(
    () => new Set(bots.flatMap((b) => b.classIds)).size,
    [bots],
  );

  const handleDelete = useCallback(async (botId: string, botName: string) => {
    await archiveBot.mutateAsync(botId);
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
      setDeleteNotice(`${josa(botName, '을/를')} 보관했어요.`);
    });
    toast.success(`${josa(botName, '을/를')} 보관했어요.`);
  }, [archiveBot]);

  return (
    <div className="space-y-7">
      <Suspense fallback={null}>
        <CreatedBanner />
      </Suspense>

      <PageHeader
        eyebrow={{ icon: Bot, text: '클래스봇 운영' }}
        title="내 클래스봇"
        /*
          여기에 「김보람 선생님 · 대치프리미엄 수학학원」이 있었다 — `lib/mock` 의 `currentTeacher` 다.
          빈 계정에도 그 이름과 그 학원이 떴다. 2026-09-18 에 그 목을 걷으며 **부제 자체를 내렸다.**
          이름을 세션(`useCurrentUser()`)으로 갈아 끼우지 않은 까닭은 **이 부제가 이름을 부를 자리가
          아니어서**다. 이 화면의 제목은 「내 클래스봇」이고 부제가 답할 것은 「어느 봇들인가」인데,
          거기 선생님 이름과 학원을 적는 것은 화면과 상관없는 명함이었다. 세션 이름이 필요한 자리는
          이미 둘 다 서 있다 — 인사하는 교사 홈(`app/(teacher)/teacher/page.tsx`)과 셸 프로필 메뉴
          (`components/shell/app-header.tsx` 의 `ProfileMenu` — 교사면 「<이름> 선생님」. 다만 그것은
          **메뉴를 열어야** 보이고, 우상단에 늘 서 있는 것은 이름 첫 글자 하나다).
          소속은 애초에 대신할 것이 없다 — 세션 claim(id·email·role)에도 정본 반 카드에도 소속 칸이 없다.
        */
        /*
          봇을 새로 만드는 버튼은 이 헤더와 아래 「내 봇」 빈 상태 둘 중 하나만 뜬다 —
          봇이 있으면 이 헤더 CTA, 없으면 빈 상태의 「봇 만들기」.
          **아직 모르는 동안(읽는 중·실패)에는 둘 다 뜨지 않는다** — 「있다」고도 「없다」고도
          말할 수 없는 자리이고, 봇 관리(`bots-workspace.tsx`)가 같은 판단을 적어 뒀다.

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
          bots.length > 0 ? (
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

        **아직 모르는 동안에는 바 자체를 세우지 않는다.** 읽는 중·실패에 「0개」를 그리면 그 0 이
        또 하나의 거짓이 된다(교사 홈이 반 개수 줄에 같은 판단을 적어 뒀다). 그래서 「낸 과제」 칸도
        정본 목록을 실제로 읽은 뒤에만 선다 — 그 칸만 다른 문에서 오기 때문이다.

        **`isError` 를 따로 보는 까닭**: react-query 는 한 번 성공한 뒤 백그라운드 갱신이 깨져도
        마지막 `data` 를 들고 있는다. `data` 만 보면 아래 목록이 「로그인이 필요해요」라 말하는
        동안 이 바가 「내 봇 1개」라고 말한다 — 지어낸 값은 아니지만(마지막으로 참이었던 값)
        같은 화면의 두 자리가 서로 다른 말을 한다. 바를 함께 내려 그 어긋남을 닫는다.

        카드 안에 텍스트 링크를 또 넣지 않는다. 나가는 길이 있는 카드는 카드째 링크(KpiStatLink),
        없는 카드는 숫자만(KpiStat).
      */}
      {myBots.data !== undefined && !myBots.isError && (
        <KpiStatBar cols={assignments === null ? 2 : 3} size="lg">
          <KpiStat label="내 봇" value={`${bots.length}개`} tone="accent" />
          <KpiStat label="붙은 학급" value={`${attachedClassCount}개`} />
          {assignments !== null && (
            <KpiStatLink
              label="낸 과제"
              value={`${assignments.length}건`}
              href="/teacher/assignment"
            />
          )}
        </KpiStatBar>
      )}

      {/* 봇 목록 — 이 화면의 본체 */}
      <BotOpsList
        ref={botListRef}
        bots={bots}
        classes={classIndex}
        assignments={assignments}
        isPending={myBots.isPending}
        error={myBots.isError ? myBots.error : null}
        onRetry={() => void myBots.refetch()}
        onDelete={handleDelete}
        notice={deleteNotice}
      />

      {/* 낸 과제 — 반별로 묶어서 본다 */}
      <DispatchedAssignments
        assignments={assignments ?? []}
        classes={classIndex}
        isPending={teacherAssignments.isPending}
        isError={teacherAssignments.isError}
      />
    </div>
  );
}

/* ─── 봇 목록 — 봇마다 학급 배정·안전 등급·낸 과제·동선 ─── */

// 행 데이터 = 정본 요약 한 행. 반 카드와의 조인 키는 `classId`.
type AssignmentRow = AssignmentSummaryDto;

function BotOpsList({
  ref,
  bots,
  classes,
  assignments,
  isPending,
  error,
  onRetry,
  onDelete,
  notice,
}: {
  ref?: Ref<HTMLElement>;
  bots: BotDto[];
  classes: ReadonlyMap<string, TeacherClass>;
  /** `null` = 낸 과제를 아직 모른다 — 카드가 「아직 낸 과제가 없어요」라 말하면 안 되는 상태 */
  assignments: AssignmentRow[] | null;
  isPending: boolean;
  error: ApiError | null;
  onRetry: () => void;
  onDelete: (botId: string, botName: string) => Promise<void>;
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
        죽은 갈래도 아니다 — `POST /classbot/bots` 로 만든 봇은 어느 반에도 안 붙어 있으므로
        (`classIds: []` — `hooks/api/bot.ts` `useCreateBot`), 봇을 막 만든 교사는 헤더 CTA 와
        그 링크를 함께 본다.
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

      {/*
        mock 은 늦지도 실패하지도 않아서 필요 없던 상태 셋이 정본과 함께 온다 —
        읽는 중(뼈대) · 세션 끊김(로그인 안내) · 읽기 실패(다시 시도).
        401 을 빨간 에러 카드로 그리지 않는 까닭은 `bots-workspace.tsx` 와 같다 —
        `classbotRead` 가 이미 OS 로그인으로 보내는 중이고, 그 한 박자를 게이트가 든다.
        게이트 문장은 `${label}를 보려면` 이라 라벨은 받침 없는 말이어야 한다(「내 봇를」 ✗).
      */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true" data-testid="bot-ops-loading">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : error ? (
        isUnauthorized(error) ? (
          <ReadLoginGate label="봇 운영 상태" />
        ) : (
          <ReadErrorState onRetry={onRetry} />
        )
      ) : bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="아직 만든 봇이 없어요"
          description="봇을 만들어 학급에 붙이면 여기에서 운영 상태를 볼 수 있어요."
          action={{ href: '/teacher/builder', label: '봇 만들기' }}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bots.map(bot => (
            <BotOpsCard
              key={bot.id}
              bot={bot}
              classes={classes}
              assignmentCount={
                assignments === null
                  ? null
                  : assignments.filter(a => bot.classIds.includes(a.classId)).length
              }
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
 * 걷어낸 넷:
 *  - 「봇 관리」·「안전 등급 바꾸기」 — 같은 화면(`/teacher/bots/[botId]`)으로 가는 길이
 *    한 메뉴에 둘이었다. 봇 관리는 왼쪽 레일에 제 자리가 있다.
 *  - 「학급 관제소」 — 봇이 아니라 학급을 보는 화면이라 **어느 봇의 더보기를 눌렀는지가
 *    실리지 않는다.** (그 화면은 아직 목이기도 하다 — 작업판 머리주석.)
 *  - **「봇 멈추기 / 다시 돌리기」** — 「준비 중」으로 자리만 잡아 두던 항목인데, 라벨이
 *    갈리려면 **그 봇이 지금 도는지를 알아야 한다.** `BotDto` 에 그 칸이 없으니
 *    둘 중 하나를 골라 적는 순간 화면이 모르는 상태를 말하게 된다. 그래서 항목째 걷었다.
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
  onDelete,
}: {
  botId: string;
  botName: string;
  onDelete: (botId: string, botName: string) => Promise<void>;
}) {
  /*
    판이 닫힐 때 포커스를 돌려줄 자리를 손으로 대 준다.
    (base-ui 기본값으로도 여기로 돌아온다 — 드롭다운이 닫히며 제 트리거로 포커스를 되돌리기
    때문이다. 그래도 명시하는 까닭은 `bot-delete-dialog.tsx` 머리주석에 적어 뒀다.)
  */
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

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
          {/*
            보관은 현재 운영에서 봇을 내리는 일이라 위 둘과 눈으로도 갈려야 한다 —
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
            <Archive className="h-4 w-4" aria-hidden />
            봇 보관
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BotDeleteDialog
        botName={botName}
        open={confirming}
        onOpenChange={setConfirming}
        isPending={isArchiving}
        error={archiveError}
        onConfirm={() => {
          setArchiveError(null);
          setIsArchiving(true);
          void onDelete(botId, botName)
            .then(() => setConfirming(false))
            .catch((error) => setArchiveError(
              statusOf(error) === 409
                ? '반에서 사용 중인 봇은 보관할 수 없어요. 붙어 있는 모든 반에서 먼저 봇을 떼어 주세요.'
                : '봇을 보관하지 못했어요. 잠시 후 다시 시도해 주세요.',
            ))
            .finally(() => setIsArchiving(false));
        }}
        finalFocus={triggerRef}
      />
    </>
  );
}

/**
 * 봇 카드 — 「이 봇이 지금 제대로 돌고 있나」에 필요한 것만 남긴다.
 *  남긴 것: 이름·과목·학년 / 안전 등급 배지 / 붙은 학급과 반별 인원 / 낸 과제 수.
 *  덜어낸 것: 운영 상태 칩과 멈춘 이유(정본에 그 칸이 없다 — 작업판 머리주석),
 *            말투(봇 관리에서 본다), 안전 등급 설명문(배지로 갈음),
 *            바닥 링크 5개(더보기 안으로), 「진행 상황 보기」 앵커(바로 아래 낸 과제 섹션).
 * 카드 본체는 누르는 자리가 아니다 — 봇 하나짜리 화면이 아직 없어서 갈 데가 없다.
 *
 * **서버에 없는 값은 줄에 싣지 않는다.** `subject`·`grade` 는 `BotDto` 에서 null 이 될 수 있고,
 * 그때는 그 칸을 통째로 빼지 빈 글자나 가운뎃점만 남은 줄(`· 중3`)을 그리지 않는다.
 *
 * @param bot - 정본 봇 한 행(`GET /classbot/me/bots`)
 * @param classes - 정본 반 목록 색인. 봇의 `classIds` 를 이름·인원으로 푸는 데 쓴다
 * @param assignmentCount - 이 봇이 붙은 반들의 낸 과제 수 · `null` = 아직 모른다
 */
function BotOpsCard({
  bot,
  classes,
  assignmentCount,
  onDelete,
}: {
  bot: BotDto;
  classes: ReadonlyMap<string, TeacherClass>;
  assignmentCount: number | null;
  onDelete: (botId: string, botName: string) => Promise<void>;
}) {
  // 과목·학년 중 있는 것만 잇는다 — 둘 다 없으면 줄 자체가 없다.
  const facts = [bot.subject, bot.grade].filter((v): v is string => Boolean(v)).join(' · ');
  /*
    붙은 반 — 이름은 **반 목록**에서 푼다. 반 목록을 아직 못 읽었거나 그 사이 반이 사라졌으면
    그 id 는 이름 없이 남는다. 그때 줄을 지어내지 않고 「아직 못 읽은 반이 몇 개」라고만 말한다 —
    **모르는 것을 「붙은 학급 없음」으로 바꿔 말하면 그게 거짓이다.**
  */
  const rooms = bot.classIds
    .map(id => classes.get(id))
    .filter((c): c is TeacherClass => c !== undefined);
  const unnamedCount = bot.classIds.length - rooms.length;

  return (
    <li data-testid={`bot-ops-card-${bot.id}`} className="bg-card flex flex-col rounded-2xl border p-5">
      {/* 정체 — 이름 · 과목 · 학년 · 안전 등급 */}
      <div className="flex items-start gap-3">
        <BotAvatar subject={bot.subject} name={bot.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-pullim-slate-900 text-sm font-bold">{bot.name}</h3>
            {/* 안전 등급 — 배지 하나로 읽어준다. 설명·변경은 봇 관리(왼쪽 레일). */}
            <ScopeChip scope={bot.scope} />
          </div>
          {facts && <p className="text-pullim-slate-500 mt-0.5 text-2xs">{facts}</p>}
        </div>
        <BotCardMenu botId={bot.id} botName={bot.name} onDelete={onDelete} />
      </div>

      {/* 붙어 있는 학급 */}
      <div className="mt-3">
        <div className="text-pullim-slate-500 text-2xs font-bold tracking-wider uppercase">
          붙어 있는 학급
        </div>
        {bot.classIds.length === 0 ? (
          <EmptyState
            tone="plain"
            size="sm"
            title="아직 붙은 학급이 없어요"
            description="봇을 학급에 붙이면 학생이 참여 코드로 들어올 수 있어요."
            action={{ href: '/teacher/builder', label: '학급에 붙이기' }}
          />
        ) : (
          <ul className="mt-1 space-y-1">
            {rooms.map(room => (
              <li
                key={room.id}
                className="bg-pullim-slate-50/50 flex items-center gap-2 rounded-lg px-3 py-2"
              >
                <School className="text-pullim-blue-500 h-3 w-3 shrink-0" aria-hidden />
                <span className="text-pullim-slate-900 min-w-0 flex-1 truncate text-xs font-bold">
                  {room.name}
                </span>
                {/* 인원은 반 카드가 스스로 아는 값이다. 프로필이 없는 반은 모르므로 칸째 뺀다. */}
                {room.enrolledCount !== null && (
                  <span className="text-pullim-slate-500 shrink-0 font-mono text-2xs font-bold">
                    {room.enrolledCount}명
                  </span>
                )}
              </li>
            ))}
            {unnamedCount > 0 && (
              <li className="text-pullim-slate-500 px-3 py-2 text-2xs">
                반 이름을 아직 못 읽었어요 ({unnamedCount}개)
              </li>
            )}
          </ul>
        )}
      </div>

      {/* 낸 과제 — 몇 건 냈는지만. 자세한 건 아래 「낸 과제」 섹션에서 본다. */}
      {assignmentCount !== null && (
        <p className="text-pullim-slate-500 mt-auto pt-3 text-2xs">
          {assignmentCount === 0 ? (
            '아직 낸 과제가 없어요'
          ) : (
            <>
              낸 과제 <b className="text-pullim-slate-700 font-mono">{assignmentCount}건</b>
            </>
          )}
        </p>
      )}
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
/**
 * 반별로 묶는다 — 조인 키는 정본 행의 `classId`. 이름은 정본 반 목록(`useOperatorClasses`)에서,
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
          읽는 중·실패에는 부제를 내린다 — 그때의 「0건 · 0문항」은 셈이 아니라 아직 안 읽은 것이다.
        */
        description={isPending || isError ? undefined : `${assignments.length}건 · ${totalQuestions}문항`}
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
  const classes = useOperatorClasses();
  const created = params.get('created');

  /*
    **이 배너의 말이 계획 PR 5d 에서 뒤집혔다.** 종전 주석은 「빌더는 화면 안 상태로만 움직이고 저장하지
    않아서(핸드오프 § 4.1) 새 봇은 이 배너 말고 아무 데도 남지 않는다」였고, 그래서 두 분기 모두 「데모라
    저장되지 않아요」로 끝났다. 이제 빌더는 `POST /classbot/bots` 로 **진짜 만들고** 고른 반마다
    `PUT /classbot/classes/:classId/bot` 으로 붙인 뒤에야 여기로 온다.

    그 문장을 그대로 두면 **없어졌다고 말하는 봇이 실제로는 서버에 있다.** 교사는 봇이 날아간 줄 알고
    같은 봇을 또 만든다 — 지우는 문이 없어서 그 중복은 남는다. 그래서 문장을 지운 것이지 다듬은 것이 아니다.
  */
  const rooms = (params.get('rooms') ?? '').split(',').filter(Boolean);
  // 반 이름은 **정본 목록**에서 찾는다. 종전의 `classroomLabel` 은 목 학급 표라(`builder-types.ts`)
  // 정본 반 id 를 모르고 **그 id 를 그대로 돌려준다** — 교사가 uuid 를 읽게 된다.
  const names = rooms
    .map((id) => {
      const room = classes.data?.find((r) => r.id === id);
      // `room.name` 은 이제 봇 이름이다(pullim-api #679) — 여기서 부를 것은 **반** 이름이다.
      return room ? classNameOf(room) : undefined;
    })
    .filter((name): name is string => Boolean(name));

  if (!created) return null;

  return (
    <section className="bg-pullim-blue-50 border-pullim-blue-200 text-pullim-blue-900 rounded-2xl border p-5">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        <strong className="text-sm">방금 만든 봇: {created}</strong>
      </div>
      <p className="text-pullim-blue-700 mt-1 text-2xs" data-testid="created-banner-note">
        {rooms.length === 0
          ? '봇을 만들었어요. 아직 반에는 안 넣었어요 — 반 상세의 「봇」 탭에서 넣을 수 있어요.'
          : names.length === rooms.length
            ? `봇을 만들어 ${names.join(' · ')}에 넣었어요.`
            : `봇을 만들어 ${rooms.length}개 반에 넣었어요.`}
      </p>
    </section>
  );
}
