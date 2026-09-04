'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { School } from 'lucide-react';

import { MarketplaceBotList } from '@/components/classbot/marketplace';
import { useTeacherClassrooms } from '@/hooks/api/classroom';

/**
 * 교사 셸의 마켓 본문 — 목록은 공용 컴포넌트가 그리고, 여기서는 **「내 봇」이 무엇인지**만 판정한다.
 *
 * 판정을 이름 대조(`teacherName === 내 이름`)로 하지 않는다 — 동명이인 선생님이 있으면
 * 남의 봇에 내 표시가 붙는다. 대신 내가 연 수업방의 `botId` 집합과 대조한다.
 * 그 목록은 서버가 소유자 조건으로 뽑아 준 것이라 오탐이 없다.
 *
 * 이 조회가 실패해도(학생이 URL 로 들어와 403 을 받는 경우 등) 화면을 에러로 덮지 않는다 —
 * 마켓 목록 자체는 역할과 무관하게 열려 있고, 그때는 「내 봇」 표시만 없이 그린다.
 */
export function MarketplaceWorkspace() {
  const mine = useTeacherClassrooms();

  const ownBotIds = useMemo(() => {
    const ids = (mine.data?.classrooms ?? [])
      .map((room) => room.botId)
      .filter((id): id is string => Boolean(id));
    return new Set(ids);
  }, [mine.data]);

  return (
    <MarketplaceBotList
      detailHref={(botId) => `/teacher/marketplace/${botId}`}
      ownBotIds={ownBotIds}
      emptyDescription="내 수업방 카드에서 봇을 올리면 여기에 가장 먼저 보여요."
      headingAction={
        <Link
          href="/teacher/classroom"
          aria-label="내 수업방으로 가서 봇 공유하기"
          className="bg-card hover:bg-pullim-slate-50 text-pullim-slate-700 inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50"
        >
          <School className="h-3.5 w-3.5" aria-hidden />
          내 수업방에서 올리기
        </Link>
      }
    />
  );
}
