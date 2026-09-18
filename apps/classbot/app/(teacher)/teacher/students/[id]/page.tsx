import { UserRound } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 학생 한 명의 기록 — 2026-09-18 · **읽어 올 문이 없다.**
 *
 * 여기에는 KPI 여섯 칸(도달 상태 · 요구 수준 · 닿은 수준 · 지름길 시도 · 범위 이탈 · 마지막 활동) ·
 * 기간 알약 · 대화 주제 분포 막대 · 이탈 이력 · 막힌 지점 · 대화 기록 뷰어 · 「이 학생의 채점」 ·
 * 과정 평가 루브릭이 서 있었고, **그 전부가 지어낸 학생 스무 명 위에서 돌았다**
 * (`lib/mock/classbot-monitoring` · `lib/mock/classbot-student-report` · `lib/mock/classbot-grading-roster`).
 * 과정 평가의 「저장」은 서버로 가지 않았고, 채점 패널의 링크는 이제 없는 화면으로 갔다.
 *
 * ── 왜 정본으로 갈아 끼우지 않았나 ──────────────────────────────────────────
 * 한 학생의 대화를 읽는 문은 정본에 있다 — 다만 **반 id 가 있어야** 열린다
 * (`GET /classbot/classes/:classId/chat?studentId=`). 이 라우트가 받는 것은 학생 id 하나뿐이라
 * 어느 반의 대화인지 고를 수가 없다. 그리고 **그 대화를 이미 그리는 화면이 있다** —
 * 반 상세의 「대화」 탭이고, 학급 관제소 표의 줄이 학생을 고른 채 그리로 보낸다
 * (`monitor/monitor-console.tsx` → `classTabHref(classId, 'chat', studentId)`).
 * 과정 평가·루브릭·기간 비교는 정본 25개 라우트 어디에도 문이 없다.
 *
 * **id 를 보지 않는다.** 어떤 id 로 들어와도 답이 같기 때문이다 — 「그 학생이 없다(404)」가 아니라
 * **「이 주소로는 읽어 올 길이 없다」**가 참이다. 없는 것을 「못 찾았어요」로 말하면 교사가 학생을 의심한다.
 *
 * **라우트를 남긴 까닭** — 레일이 이 경로를 학급 관제소 소속으로 못박고 있고
 * (`components/shell/nav-config.ts` 의 `matchPrefix: ['/teacher/students']`), 오늘까지 dev preview 에
 * 살아 있던 주소라 밖에 남은 링크가 있다. 지우면 그 링크가 Next 기본 404 로 떨어진다 —
 * 나가는 길도 설명도 없는 화면이다.
 *
 * **들어온 곳을 되돌려 주던 `./entry-source.ts` 는 함께 걷었다.** `?from=` 을 붙이는 자리가
 * 트리 전체에서 0 이 됐기 때문이다(발신자 넷 중 둘은 #370 이, 나머지 둘은 이 PR 이 걷었다).
 * 돌아갈 곳은 그 규칙의 기본값이던 학급 관제소 하나로 고정한다.
 */
export default function TeacherStudentReportPage() {
  return (
    <TeacherPageShell
      backHref="/teacher/monitor"
      backLabel="학급 관제소"
      header={{
        eyebrow: { icon: UserRound, text: '학생 기록' },
        title: '학생 한 명 보기',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <EmptyState
          icon={UserRound}
          title="이 주소로는 학생 기록을 읽어 올 수 없어요"
          description="학생이 봇과 나눈 이야기는 반을 고른 다음에야 읽을 수 있어요. 학급 관제소에서 반을 고르고 학생 줄을 누르면 그 학생의 봇 대화로 바로 들어가요."
          action={{ href: '/teacher/monitor', label: '학급 관제소', ariaLabel: '학급 관제소로 가기' }}
        />
      </section>
    </TeacherPageShell>
  );
}
