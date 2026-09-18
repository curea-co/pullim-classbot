import { ClipboardCheck } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 채점 한 건 — 2026-09-18 · **읽어 올 문이 없다.**
 *
 * 여기에는 루브릭 편집기·AI 초안 코멘트·「그대로 승인」/「수정 후 승인」·변경률 계기·위기 게이트가
 * 서 있었고, 그 전부가 목 한 건(`lib/mock/classbot-grading-roster` 의 `allGradingItems`) 위에서 돌았다.
 * 확정은 서버가 아니라 **이 브라우저의 localStorage**(`lib/store/grading.ts`)에만 남아서, 다른 기기로
 * 옮기면 방금 승인한 채점이 없었다. 「승인 완료」라고 적힌 채로.
 *
 * **id 를 보지 않는다.** 어떤 id 로 들어와도 답이 같기 때문이다 — 채점 한 건을 읽는 문이
 * 정본(pullim-api)에 없으므로 「그 건이 없다(404)」가 아니라 **「읽어 올 길이 없다」**가 참이다.
 * 없는 것을 「못 찾았다」로 말하면 교사가 id 를 의심한다.
 *
 * **라우트를 지우지 않고 남긴 까닭**은 아직 이리로 오는 길이 살아 있어서다 —
 * 학생 상세의 채점 패널(`../../students/[id]/student-grading-panel.tsx`)이 목 항목마다 링크를 그린다.
 * 그 트리가 걷히면(뒤 PR) 여기로 오는 길이 하나도 없어지고, 그때 이 파일을 함께 지우면 된다.
 * 지금 지우면 살아 있는 링크가 Next 기본 404 로 떨어진다 — 나가는 길도 설명도 없는 화면이다.
 */
export default function GradingDetailPage() {
  return (
    <TeacherPageShell
      backHref="/teacher/grading"
      backLabel="채점 허브"
      header={{
        eyebrow: { icon: ClipboardCheck, text: '채점 허브' },
        title: '채점 한 건',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <EmptyState
          icon={ClipboardCheck}
          title="이 채점 건을 읽어 올 수 없어요"
          description="채점 한 건을 읽고 확정하는 길이 서버에 아직 없어요. 학생이 낸 답과 서버가 매긴 점수는 낸 과제에서 볼 수 있어요."
          action={{ href: '/teacher/assignment', label: '낸 과제', ariaLabel: '낸 과제로 가기' }}
        />
      </section>
    </TeacherPageShell>
  );
}
