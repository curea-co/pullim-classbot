import { Store } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { MarketplaceWorkspace } from './marketplace-workspace';

/**
 * 봇 마켓(교사) — 학생이 보는 것과 **같은 목록**을 교사 셸에서 본다.
 *
 * 왜 교사에게도 필요한가: 자기 봇을 올리고 나면 「그래서 남들 눈에 어떻게 보이나」를
 * 확인할 데가 있어야 한다. 그 확인을 학생 셸로 건너가서 하게 두면 교사가 학생 화면에
 * 들어앉는 셈이라, 같은 목록을 이쪽 셸에도 둔다. 대신 **내가 올린 봇에는 표시**가 붙는다.
 *
 * 공유 버튼은 여기가 아니라 내 수업방(`/teacher/classroom`) 카드에 있다 —
 * 공유는 「이 반의 봇」에 거는 일이라 그 봇이 사는 자리에서 건다.
 *
 * 본문은 클라이언트에서 읽는다. 「내 봇」 판정이 신원에 매인 값이라
 * 서버에서 미리 그려 두면 캐시된 남의 표시가 보일 수 있다.
 */
export default function TeacherMarketplacePage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Store, text: '둘러보기' },
        title: '봇 마켓',
        description: '선생님들이 공유한 봇을 둘러보고, 내가 공유한 봇이 어떻게 보이는지 확인해요.',
      }}
    >
      <MarketplaceWorkspace />
    </TeacherPageShell>
  );
}
