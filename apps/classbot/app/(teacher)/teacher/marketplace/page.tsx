import { Store } from 'lucide-react';

import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { MarketplaceWorkspace } from './marketplace-workspace';

/**
 * 봇 마켓(교사) — 학생이 보는 것과 같은 정본 목록을 교사 셀에서 본다.
 *
 * ADR-094의 첫 마켓은 풀림 공식 봇을 둘러보고 교사의 반에 활용하는 곳이다.
 * 교사 봇 게시·해제는 후속 결정이므로 현재 화면에서 약속하지 않는다.
 */
export default function TeacherMarketplacePage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: Store, text: '둘러보기' },
        title: '봇 마켓',
        description: '풀림이 제공하는 공식 봇을 둘러보고 수업에 활용해 보세요.',
      }}
    >
      <MarketplaceWorkspace />
    </TeacherPageShell>
  );
}
