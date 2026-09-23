'use client';

import { MarketplaceBotList } from '@/components/classbot/marketplace';

/**
 * 교사 셀의 공식 봇 마켓.
 *
 * ADR-094 범위는 pullim-api가 공개한 풀림 공식 봇을 둘러보고, 교사가 자신의
 * 반에 할당할 수 있게 하는 것까지다. 교사 봇을 마켓에 게시·해제하는 표면은
 * open item 이므로 종전 same-origin `useTeacherClassrooms` 조회와 「내 봇 공유」 절을 제거한다.
 */
export function MarketplaceWorkspace() {
  return (
    <MarketplaceBotList
      detailHref={(botId) => `/teacher/marketplace/${botId}`}
      emptyDescription="공개된 풀림 공식 봇이 생기면 이곳에서 둘러볼 수 있어요."
    />
  );
}
