import { Users } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { monitoredClass, monitoredRoster, monitoringSummary } from '@/lib/mock/classbot-monitoring';
import { MonitorRoster } from '../monitor/monitor-roster';

/**
 * 학생 목록 — `/teacher/students/[id]` 의 부모 경로가 빈 화면이 되지 않도록 둔 얇은 화면.
 *
 * 관제소(`/teacher/monitor`)와 같은 명단·같은 컴포넌트를 쓴다.
 * 학급 단위 요약(다시 가르칠 개념 등)은 관제소에만 두고 여기서는 명단만 보여준다.
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
