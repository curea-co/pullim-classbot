import { School } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { ClassroomWorkspace } from './classroom-workspace';

/**
 * 내 수업방 (`/teacher/classroom`) — 반 개설 · 참여 코드 · 참여 학생 명단.
 *
 * 종전에는 교사가 **반을 열 자리도, 참여 코드를 볼 자리도 앱 어디에도 없었다** —
 * 학생 화면은 코드를 넣으라 하는데 그 코드를 내는 화면이 없었다. 이 화면이 그 자리다.
 *
 * 봇 관리(`/teacher/bots`)와의 역할 분리:
 *   봇 관리 — 「이 봇을 어떻게 굴릴까」 (안전 등급 · 말투)
 *   이 화면 — 「누가 이 반에 들어오나」 (참여 코드 · 참여 학생)
 * 수업방 하나는 반 1행 + 봇 1행 한 쌍이라 같은 것을 두 화면이 나눠 본다.
 *
 * 화면 본문은 전부 클라이언트에서 읽는다 — 신원이 쿠키·토큰에 매인 데이터라
 * 서버에서 미리 그려 두면 캐시된 남의 반이 보일 수 있다.
 */
export default function TeacherClassroomPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: School, text: '수업방' },
        title: '내 수업방',
        description: '반을 열고 참여 코드를 학생에게 알려주는 곳이에요.',
      }}
    >
      <ClassroomWorkspace />
    </TeacherPageShell>
  );
}
