import { ClipboardCheck } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 채점 허브 — 2026-09-18 · **이 화면은 통째로 목이었다.**
 *
 * 빈 계정으로 들어와도 탭 둘(「학생 전체」·「채점 대기 큐」)이 서고, 없는 학생 스무 명이 줄을 이루고,
 * 없는 제출 일곱 건이 「검수 대기」로 쌓였다. KPI 넉 장(대기 · 검토중 · 오늘 승인 · 평균 변경률)도
 * 전부 지어낸 수였다. 원천은 셋이다 — `lib/mock/classbot-grading-roster`(채점 항목),
 * `lib/mock/classbot-monitoring`(학생 명단), `lib/mock/classbot.ts` 의 `gradingStats`(지표).
 *
 * ── 왜 정본으로 갈아 끼우지 않았나 ──────────────────────────────────────────
 * **정본(pullim-api)에 채점을 읽고 쓰는 문이 아예 없다.** 25개 라우트 어디에도 채점 초안·루브릭·
 * 교사 확정·리포트가 없다(인계 문서 결함 10 이 같은 사실을 적었다). 그래서 이 화면이 할 수 있는
 * 일은 「거짓 화면을 걷는 것」 하나뿐이고, 갈아 끼울 대상은 그 문이 열리는 날 생긴다.
 *
 * **낸 과제 쪽 문으로 대신 세울 수는 없었다.** 제출은 정본이 준다
 * (`GET /classbot/assignments/:id/submissions` — `useAssignmentSubmissions`). 그런데 그 문이 주는 것은
 * 「제출 한 줄 + 서버가 매긴 `scorePercent`」이고, 그것을 **이미 낸 과제 상세가 통째로 그린다**
 * (`../assignment/[id]/page.tsx` — 학생별 제출 표 · 반 참여 · 제출 · 채점됨 · 평균 점수).
 * 여기에 같은 표를 한 벌 더 세우면 교사는 어느 쪽이 최신인지 알 수 없고, 정작 이 화면의 일
 * (서술형 초안을 보고 점수를 고쳐 확정하는 것)은 **한 칸도 되지 않는다.** 그래서 두 번째 제출 목록을
 * 만드는 대신 **그 화면으로 보낸다.**
 *
 * ⚠ 낸 과제 상세는 아직 「채점은 채점 허브에서 해요 — 서술형 AI 초안이 거기로 갑니다」라고 적는다.
 * 그 문장은 이 화면이 목이던 시절에도 사실이 아니었다(초안이 거기로 간 적이 없다). 고치는 자리는
 * `app/(teacher)/teacher/assignment/**` 라 이 PR 의 경계 밖이고, 아래 빈 상태가 그 오해를 받아 낸다.
 *
 * ── 세우면서 지킨 것 ───────────────────────────────────────────────────────
 *  - **모르는 것을 0 이라 말하지 않는다.** 「검수할 채점이 0건」이 아니라 「읽어 올 수 없다」다.
 *    센 적이 없는 것을 0 으로 적는 것도 지어낸 값이다.
 *  - **나가는 길은 정본을 읽는 화면으로만 낸다.** 학생 상세(`/teacher/students/*`)·학급 관제소로
 *    보내지 않는다 — 그 둘은 아직 목이다.
 *  - **자리와 이름은 남긴다.** 레일이 이 라우트를 가리키고 있고(`components/shell/nav-config.ts`),
 *    머리만 남은 화면은 「안 열렸다」로 읽힌다.
 */
export default function TeacherGradingPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: ClipboardCheck, text: '채점 허브' },
        title: 'AI 초안 검수',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="검수할 채점" />
        <EmptyState
          icon={ClipboardCheck}
          title="채점 초안을 아직 읽어 올 수 없어요"
          description="AI가 만든 채점 초안을 주고받는 길이 서버에 아직 없어요. 학생이 낸 답과 서버가 매긴 점수는 낸 과제에서 볼 수 있어요."
          action={{ href: '/teacher/assignment', label: '낸 과제', ariaLabel: '낸 과제로 가기' }}
        />
      </section>
    </TeacherPageShell>
  );
}
