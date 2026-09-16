import { School } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { ClassroomWorkspace } from './classroom-workspace';

/**
 * 내 수업방 (`/teacher/classroom`) — 내 반 목록 · 참여 코드 · 반 상세로 가는 문.
 *
 * 종전에는 교사가 **반을 열 자리도, 참여 코드를 볼 자리도 앱 어디에도 없었다** —
 * 학생 화면은 코드를 넣으라 하는데 그 코드를 내는 화면이 없었다. 이 화면이 그 자리다.
 *
 * **읽는 곳이 정본으로 바뀌었다**(계획 PR 5a · 완성 설계 § 6.2 「교사 · 내 수업방」): 목록은 pullim-api
 * `GET /classbot/bots?role=teacher`, 코드는 `POST /classbot/classes/:classId/join-codes`. 반 만들기는 정본에
 * 문이 없어(pullim-api PR 2) 5b 까지 가려 둔다 — `classroom-workspace.tsx` 의 `CLASS_CREATE_AVAILABLE`.
 * 명단도 같은 이유로 카드에서 내렸고 반 상세(`./[id]`)의 탭으로 5b 에 돌아온다.
 *
 * 봇 관리(`/teacher/bots`)와의 역할 분리:
 *   봇 관리 — 「이 봇을 어떻게 굴릴까」 (안전 등급 · 말투)
 *   이 화면 — 「누가 이 반에 들어오나」 (참여 코드) · 반마다 「자세히」로 반 상세
 *
 * 화면 본문은 전부 클라이언트에서 읽는다 — 신원이 OS 쿠키에 매인 데이터라
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
        description: '내 반의 참여 코드를 새로 내어 학생에게 알려주는 곳이에요.',
      }}
    >
      <ClassroomWorkspace />
    </TeacherPageShell>
  );
}
