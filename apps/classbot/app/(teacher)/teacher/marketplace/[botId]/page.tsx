'use client';

import { use } from 'react';

import { MarketplaceBotDetail } from '@/components/classbot/marketplace';

/**
 * 봇 상세(교사 셸) — 학생이 보는 것과 같은 본문이다.
 * 교사 화면의 세로 눈금(`space-y-7`)만 얹어서 넘긴다.
 */
export default function TeacherMarketplaceBotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = use(params);

  return (
    <MarketplaceBotDetail
      botId={botId}
      backHref="/teacher/marketplace"
      backLabel="봇 마켓"
      viewer="teacher"
      className="space-y-7"
    />
  );
}
