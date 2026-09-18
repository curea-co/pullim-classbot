import { BarChart3 } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 리포트 센터 — 2026-09-18 · **이 화면도 통째로 목이었다.**
 *
 * 빈 계정으로 들어와도 리포트 여섯 건(학부모·학생·수업 종료·학급·기간·실시간)이 목록에 서고,
 * KPI 넉 장(발송 대기 · 초안 · 위기 알림 · 먼저 볼 학생)이 숫자를 말하고, 없는 학생 스무 명이
 * 「등록된 학생」 명단으로 줄을 이뤘다. 원천은 셋이다 — `lib/mock/classbot.ts` 의 `reports`·
 * `crisisAlerts`, `lib/mock/classbot-monitoring` 의 `monitoredRoster`,
 * `lib/mock/classbot-teacher-home` 의 「먼저 볼 학생」 판정.
 *
 * 화면 아래에는 「승인된 리포트는 24시간 안에 카카오톡으로 자동 발송돼요」까지 적혀 있었다.
 * 보내는 문도, 승인하는 문도, 만드는 문도 없다.
 *
 * ── 왜 정본으로 갈아 끼우지 않았나 ──────────────────────────────────────────
 * **정본(pullim-api)에 리포트 문이 아예 없다** — 만들지도, 읽지도, 승인·발송하지도 못한다
 * (인계 문서 결함 10). 채점 허브(`../grading/page.tsx`)와 같은 자리다.
 *
 * 이 화면이 리포트 말고 하나 더 하던 일이 **「등록된 학생 전원 명단」**인데, 그것도 목이었다
 * (`monitoredRoster` — `m01`…`m20`). 다만 그 일만은 **이미 정본으로 서 있는 화면이 있다** —
 * 내 수업방의 반 명단이다(`GET /classbot/classes/:id/members` · `../classroom/[id]/classroom-roster.tsx`).
 * 그래서 명단을 여기에 다시 세우지 않고 **그리로 보낸다.** 같은 명단을 두 화면이 각자 그리면
 * 어느 쪽이 지금 반인지 교사가 알 수 없다.
 *
 * ── 세우면서 지킨 것 ───────────────────────────────────────────────────────
 *  - **모르는 것을 0 이라 말하지 않는다.** 「발송 대기 0건」·「등록된 학생 0명」으로 세우지 않았다 —
 *    세어 본 적이 없다.
 *  - **나가는 길은 정본을 읽는 화면으로만 낸다.** 종전 명단 줄이 데려가던 학생 상세
 *    (`/teacher/students/*`)는 아직 목이라 보내지 않는다.
 *  - **상세 라우트(`[id]`)는 지웠다.** 이리로 오는 길이 리포트 목록 하나뿐이었고, 그 목록이
 *    사라지면서 링크가 한 줄도 남지 않는다. (채점 상세는 학생 상세에서 오는 길이 아직 살아 있어
 *    남겼다 — `../grading/[id]/page.tsx`.)
 */
export default function TeacherReportsPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: BarChart3, text: '리포트 센터' },
        title: '학생·학부모 리포트',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="리포트" />
        <EmptyState
          icon={BarChart3}
          title="리포트를 아직 읽어 올 수 없어요"
          description="학생·학부모 리포트를 만들고 보내는 길이 서버에 아직 없어요. 반과 학생 명단은 내 수업방에서 볼 수 있어요."
          action={{ href: '/teacher/classroom', label: '내 수업방', ariaLabel: '내 수업방으로 가기' }}
        />
      </section>
    </TeacherPageShell>
  );
}
