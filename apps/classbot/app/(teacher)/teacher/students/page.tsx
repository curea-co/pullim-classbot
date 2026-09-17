import { Users } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { monitoredClass, monitoredRoster, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { MonitorRoster } from './monitor-roster';

/**
 * 학생 목록 — `/teacher/students/[id]` 의 부모 경로가 빈 화면이 되지 않도록 둔 얇은 화면.
 *
 * 명단은 목이다(`./monitor-roster.tsx` · `lib/mock/classbot-monitoring` 20명 스냅샷 · 계획 PR 8 은퇴 대상). 종전에는
 * 학급 관제소(`/teacher/monitor`)가 같은 명단을 썼지만, 계획 PR 7 이 관제소를 정본 신호 표로 바꿔 이제 이 목 명단을
 * 읽는 화면은 여기 하나다. 학급 단위 요약은 두지 않고 명단만 보여준다.
 */
export default function TeacherStudentsPage() {
  return (
    <TeacherPageShell
      backHref="/teacher/monitor"
      backLabel="학급 관제소"
      header={{
        eyebrow: { icon: Users, text: '학생 목록' },
        title: `${monitoredClass.classroomLabel} 학생 ${monitoringSummary.total}명`,
        description: '학생을 누르면 대화 기록과 과정 평가로 가요.',
      }}
    >
      <MonitorRoster
        students={monitoredRoster}
        context={`${monitoredClass.botName} · ${monitoredClass.unit} · ${monitoredClass.updatedAtLabel}`}
      />
    </TeacherPageShell>
  );
}
