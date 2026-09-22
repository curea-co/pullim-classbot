'use client';

import { Store } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { MarketplaceBotList } from '@/components/classbot/marketplace';
import { PageHeader } from '@/components/shell/page-header';

/**
 * 봇 마켓(학생) — pullim-api가 공개한 공식 봇을 둘러보고 담는 곳.
 *
 * ADR-094 범위에서는 풀림 공식 봇만 게시된다. 담기는 공식 봇과 혼자 공부할
 * 전용 공간을 만드는 일이고, 참여 코드는 선생님의 반에 들어가는 별도 동작이다.
 */
export default function ClassbotDiscoverPage() {
  return (
    <div className="space-y-5">
      <BackLink href="/classbot">클래스봇 홈</BackLink>
      <PageHeader
        eyebrow={{ icon: Store, text: '풀림 클래스봇' }}
        title="봇 마켓"
        description="풀림 공식 봇을 둘러봐요. 마음에 들면 담아서 혼자 공부하고, 선생님 반에 들어가려면 참여 코드를 따로 받아요."
      />

      <MarketplaceBotList
        detailHref={(botId) => `/classbot/discover/${botId}`}
        emptyDescription="공개된 풀림 공식 봇이 생기면 이곳에서 둘러볼 수 있어요."
        showSelfAdd
      />
    </div>
  );
}
