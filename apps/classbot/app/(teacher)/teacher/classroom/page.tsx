import { School } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { ClassroomWorkspace } from './classroom-workspace';

/**
 * 내 수업방 (`/teacher/classroom`) — 내 반 목록 · 참여 코드 · 반 상세로 가는 문.
 *
 * 종전에는 교사가 **반을 열 자리도, 참여 코드를 볼 자리도 앱 어디에도 없었다** —
 * 학생 화면은 코드를 넣으라 하는데 그 코드를 내는 화면이 없었다. 이 화면이 그 자리다.
 *
 * **전부 정본이다**(완성 설계 § 6.2 「교사 · 내 수업방」): 목록은 pullim-api `GET /classbot/bots?role=teacher`(계획
 * PR 5a), 반 만들기는 `POST /classbot/classes`(5b — pullim-api PR 2 가 문을 열어 5a 때 가려 뒀던 폼을 정본에 붙였다),
 * 코드는 `POST /classbot/classes/:classId/join-codes`(만료 +48h · 재발급은 갈아 끼우기). 명단과 봇은 반 상세(`./[id]`)의
 * 탭이다.
 *
 * 봇 관리(`/teacher/bots`)와의 역할 분리:
 *   봇 관리 — 「이 봇을 어떻게 굴릴까」 (안전 등급 · 말투)
 *   이 화면 — 「반을 열고 누가 들어오나」 (반 만들기 · 참여 코드) · 반마다 「자세히」로 반 상세(명단 · 봇 · 과제)
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
        description: '반을 만들고, 참여 코드를 내어 학생에게 알려주는 곳이에요.',
      }}
    >
      <ClassroomWorkspace />
    </TeacherPageShell>
  );
}
