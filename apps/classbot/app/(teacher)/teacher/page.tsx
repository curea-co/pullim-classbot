'use client';

import Link from 'next/link';
import { LayoutDashboard, Plus, Send } from 'lucide-react';
import { DispatchedAssignmentsLink } from '@/components/classbot/dispatched-assignments-link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { useOperatorClasses } from '@/hooks/api/classroom';
import { useCurrentUser } from '@/lib/current-user';

/**
 * 교사 홈 (대시보드) — 「지금 뭐부터 손대지」 한 화면.
 *
 * ── 2026-09-18 · 이 화면은 통째로 목이었다 ──────────────────────────────────
 * 빈 계정으로 로그인해도 「안녕하세요, 김보람 선생님 · 대치프리미엄 수학학원 · 활성 봇 3개 ·
 * 학생 47명」이 뜨고, 있지도 않은 학생 다섯이 「먼저 볼 학생」에 섰다. 하나도 진짜가 아니었다.
 *
 * 걷은 것과 그 자리에 세운 것:
 *  - **인사말 이름** — `lib/mock` 의 `currentTeacher.name`(김보람) → **세션**(`useCurrentUser()`).
 *    셸 우상단 아바타가 읽던 그 이름이다 — 한 화면에서 두 이름이 서던 것도 함께 끝난다.
 *  - **소속(학원·학교)** — `currentTeacher.organization`(대치프리미엄 수학학원) → **걷었다.**
 *    세션 claim(id·email·role)에도, 정본 반 카드(`BotCardDto`)에도 소속 칸이 없다
 *    (`app/(teacher)/teacher/classroom/operator-class.ts` 가 「카드에 없는 것」으로 못박아 뒀다).
 *  - **활성 봇 3개 · 학생 47명** — `currentTeacher.{activeBots,totalStudents}` → **정본 반 개수**로.
 *    학생 총원은 세지 않는다(아래 `classCount` 주석).
 *  - **상단 KPI 넉 장**(도달 · 미도달 · 목표 수준 미달 · 오늘 안 들어옴) — `monitoringSummary` →
 *    **걷었다.** 학생의 도달·접속을 집계하는 문이 정본에 없다. 없는 집계를 빈 카드로 세워 두면
 *    「0명」이 또 하나의 거짓이 된다.
 *  - **「먼저 볼 학생」 표** — `pickAttentionStudents()` 가 고르던 목 학생 다섯 → **빈 상태**로.
 *    고를 근거(대화·막힌 개념·도달 기록)를 읽는 문이 정본에 없다. 표 컴포넌트
 *    `attention-roster.tsx` 는 소비처가 여기뿐이라 이 PR 이 함께 지웠다.
 *  - **「나를 기다리는 일」**(서술형 채점 12건 · 학부모 리포트 5건) — `pendingItems` → **걷었다.**
 *    채점·리포트 문이 정본에 없고, 그 숫자가 데려가던 두 화면(`/teacher/grading`·`/teacher/reports`)도
 *    아직 목이다. 목으로 가는 길을 홈에 남겨 두지 않는다.
 *
 * 남은 진짜 숫자 하나는 「낸 과제 N건」이고, 그것도 이 화면이 세지 않는다 —
 * `DispatchedAssignmentsLink` 가 정본(`GET /classbot/assignments?audience=teacher`)을 읽는다.
 *
 * ── 홈과 학급 관제소의 경계 (종전 그대로) ──────────────────────────────────
 *   - 홈       = 오늘 **먼저 볼 사람**. 예외만 짧게, 상세는 넘긴다.
 *   - 관제소   = 학급 전체 진단 — 다시 가르칠 개념 + 학생 20줄 + 필터.
 * 같은 것을 두 번 보여주면 어느 화면이 최신인지 교사가 알 수 없어 홈에서 걷어냈다.
 * 예전부터 걷혀 있던 것: 위기 신호 패널 · 다가오는 수업 · 운영 중 봇 카드 · 최근 학생 봇 질문 ·
 * 다시 가르칠 개념 · 학생 20줄 · 빠른 액션 4칸.
 *
 * **서버 컴포넌트였다가 클라이언트로 내려왔다** — 이름도 반 개수도 세션이 있어야 읽히는 값이라
 * 훅을 부른다. 「먼저 볼 학생」 표만 따로 클라이언트 파일로 떼어 두던 까닭이 바로 그 경계였고,
 * 표가 사라지며 그 파일도 함께 사라졌다.
 */
export default function TeacherHomePage() {
  const me = useCurrentUser();
  const classes = useOperatorClasses();

  /*
    이름은 **역할이 교사일 때만** 부른다. `RoleGuard` 는 세션 복원 전(`isReady=false`)에 children 을
    그대로 세워 두는데(첫 페인트를 비우지 않으려고 — `components/features/auth/role-guard.tsx`),
    그 한 박자 동안 `useCurrentUser()` 는 데모 폴백(학생 「서연」)을 돌려준다. 그대로 쓰면
    「안녕하세요, 서연 선생님」이 스쳐 지나간다 — 방금 걷어낸 바로 그 모양이다.
    admin 을 함께 세는 것은 가드와 같은 판정이다(`guardRoleOf` — admin 은 교사 화면을 쓴다).
  */
  const teacherName = me.role === 'teacher' || me.role === 'admin' ? me.name : '';

  /*
    반 개수는 정본에서 온다 — `GET /classbot/bots?role=teacher`(`useOperatorClasses`). 이 문은 아직
    bot == class(ADR-063)라 카드 한 장이 반 하나다. 아직 모르면(세션 복원 중·비로그인·읽기 실패)
    **줄 자체를 내린다** — 실패를 「0개」로 바꿔 말하지 않는다.

    **학생 총원은 세지 않는다.** 카드가 주는 `profile.enrolledCount` 는 반별 인원이라, 더하면 두 반을
    듣는 학생이 두 번 세어진다. 사람을 세는 문(`GET /classes/:classId/members`)은 반 하나짜리여서
    반 수만큼 부르는 일이 되는데, 머리 한 줄이 치를 값이 아니다. 「47명」을 「12명」으로 고쳐 적는 것은
    거짓을 고친 게 아니라 다른 거짓이다.
  */
  const classCount = classes.data?.length ?? null;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={{ icon: LayoutDashboard, text: '교사 대시보드' }}
        title={
          teacherName
            ? <>안녕하세요, <span className="text-pullim-blue-600">{teacherName}</span> 선생님</>
            : '안녕하세요'
        }
        description={
          classCount === null
            ? undefined
            : classCount === 0
            ? '아직 만든 반이 없어요'
            : `내 반 ${classCount}개`
        }
        action={
          <div className="flex gap-2">
            <Link
              href="/teacher/builder"
              className="bg-pullim-slate-900 hover:bg-pullim-slate-800 text-white inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold"
            >
              <Plus className="h-4 w-4" />
              새 클래스봇
            </Link>
            {/* 기획 보류 — 라이브 수업 입장. 재개 시 되살린다 */}
            <Link
              href="/teacher/assignment/new"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              <Send className="h-4 w-4" />
              과제 내기
            </Link>
          </div>
        }
      />

      {/*
        낸 과제로 가는 길 (`proc/spec/14 § 3.2` 진입점 3). 헤더 버튼은 「새로 내기」이고
        이 줄은 「이미 낸 것 보기」다 — 같은 트리인데 하는 일이 반대라 버튼 옆에 세우지 않는다.
        낸 과제가 없으면 이 줄 자체가 뜨지 않는다(그 컴포넌트 머리주석).
      */}
      <DispatchedAssignmentsLink />

      {/*
        이 화면의 본체. 지금은 빈 상태 하나다 — 「먼저 볼 학생」을 고르려면 학생이 어디서 막혔는지가
        있어야 하는데, 그 기록을 읽는 문이 정본에 없다. 자리를 통째로 걷지 않고 이름과 함께 남기는
        까닭은 홈이 무엇을 하는 화면인지를 교사가 알아야 해서다 — 머리 하나만 남은 화면은 「안 열렸다」로
        읽힌다. 나가는 길은 **정본을 읽는 화면**으로 낸다(내 수업방 — 반과 명단은 진짜다).
        학급 관제소로 보내지 않는 것은 그 화면이 아직 목이기 때문이다.
      */}
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="먼저 볼 학생" />
        <EmptyState
          tone="plain"
          size="sm"
          title="먼저 볼 학생을 아직 고를 수 없어요"
          description="학생이 어디서 막혔는지 읽어 오는 길이 아직 없어요. 반과 학생 명단은 내 수업방에서 볼 수 있어요."
          action={{ href: '/teacher/classroom', label: '내 수업방', ariaLabel: '내 수업방으로 가기' }}
        />
      </section>
    </div>
  );
}
