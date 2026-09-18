import { Users } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 학생 목록 — 2026-09-18 · **이 화면은 통째로 목이었다.**
 *
 * 빈 계정으로 들어와도 「중1-3반 과학 학생 20명」이 서고, 없는 학생 스무 줄이 도달·목표 대비 깊이·
 * 지름길·범위 이탈·최근 접속까지 달고 깔렸다. 거르개 알약 여섯 개와 정렬 넷도 그 위에서 돌았다.
 * 원천은 `lib/mock/classbot-monitoring`(20명 스냅샷)과 `lib/mock/classbot-student-report`(이탈 표)
 * 둘이고, 화면·거르개는 `./monitor-roster.tsx` · `./roster-filters.ts` 였다 — 셋 다 이 PR 이 걷었다.
 *
 * ── 왜 정본으로 갈아 끼우지 않았나 ──────────────────────────────────────────
 * **명단을 읽는 문은 정본에 있다**(`GET /classbot/classes/:id/members`). 그런데 그 문이 주는 것을
 * **이미 학급 관제소(`/teacher/monitor`)가 통째로 그린다** — 반 고르기 + 명단 ∪ 신호 집계 + 학생 줄.
 * 여기에 같은 명단을 한 벌 더 세우면 두 화면이 각자 그리게 되고, 어느 쪽이 최신인지 알 수 없다.
 * (#370 이 리포트 센터의 「등록된 학생 명단」을 같은 까닭으로 내 수업방에 넘겼다.)
 *
 * 그리고 이 화면이 담던 열들 — 도달 상태 · 요구 수준 대비 닿은 수준 · 지름길 시도 · 범위 이탈 —
 * 은 **서버에 원천이 아예 없다.** 정본이 주는 신호는 규칙으로 잡은 다섯 종(답 구하기 · 부적절한 말 ·
 * 위기 신호 · 반복 시도 · 무의미 입력)이고, 그 표는 관제소가 이미 그린다.
 *
 * ── 세우면서 지킨 것 ───────────────────────────────────────────────────────
 *  - **모르는 것을 0 이라 말하지 않는다.** 「학생 0명」이 아니라 「여기서 세지 않는다」다.
 *  - **나가는 길은 정본을 읽는 화면으로만.** 학급 관제소 하나다.
 *  - **자리와 이름은 남긴다.** 레일이 이 경로를 학급 관제소 소속으로 못박고 있고
 *    (`components/shell/nav-config.ts` 의 `matchPrefix: ['/teacher/students']`),
 *    라우트를 지우면 그 접두사가 없는 자리를 가리킨다.
 */
export default function TeacherStudentsPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Users, text: '학생 목록' },
        title: '학생 기록',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="학생 명단" />
        <EmptyState
          icon={Users}
          title="학생 명단을 여기서 따로 세우지 않아요"
          description="반 학생 명단과 봇 대화에서 잡힌 신호는 학급 관제소가 반별로 보여줘요. 같은 명단을 두 화면이 각자 그리지 않으려고 이 화면은 비워 뒀어요."
          action={{ href: '/teacher/monitor', label: '학급 관제소', ariaLabel: '학급 관제소로 가기' }}
        />
      </section>
    </TeacherPageShell>
  );
}
