'use client';

import { use } from 'react';

import { MarketplaceBotDetail } from '@/components/classbot/marketplace';

/**
 * 봇 상세(학생 셸) — 본문은 교사 화면과 같은 컴포넌트가 그린다.
 * 이 파일이 하는 일은 URL 에서 봇 id 를 꺼내 학생 셸의 눈금으로 넘기는 것뿐이다.
 */
export default function DiscoverBotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = use(params);

  return (
    <MarketplaceBotDetail
      botId={botId}
      backHref="/classbot/discover"
      backLabel="봇 마켓"
      viewer="student"
    />
  );
}
