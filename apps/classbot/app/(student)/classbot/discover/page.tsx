'use client';

import Link from 'next/link';
import { Bookmark, Store } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { MarketplaceBotList } from '@/components/classbot/marketplace';
import { PageHeader } from '@/components/shell/page-header';

/**
 * 봇 마켓(학생) — 선생님들이 올린 봇을 둘러보고 **담는** 곳.
 *
 * 종전에는 mock `getOfficialTutors()` 세 개(수학·영어·과학 마스터)와 「곧 만날 봇」
 * 예고 셋을 그렸다. 둘 다 걷어냈다 — 이제 이 화면에 뜨는 것은 **교사가 실제로 공유한 봇**이고,
 * 그 옆에 오지 않을 봇 예고를 나란히 두면 어느 쪽이 진짜인지 구별되지 않는다.
 *
 * 설명 문구는 예전에 **둘러보기까지만** 약속했다. 그때는 이 화면에 담는 동작이 없어서
 * 그게 사실이었지만 **지금은 담을 수 있다** — 그러니 「둘러보는 곳」은 이제 거짓이다.
 *
 * 지금 문구가 지키는 선은 하나다: **담기와 참여 코드를 나란히, 다른 것으로 적는다.**
 *  - **담기** — 봇을 얻는다. 「내가 담은 봇」에 들어가고 1:1 로 쓴다. 누구나, 바로.
 *  - **참여 코드** — 선생님의 **반**을 얻는다. 과제를 받고 명단에 오른다. 선생님이 줄 때만.
 * 크고 작은 관계가 아니라서 「코드를 받아야 쓸 수 있어요」로 되돌리지 마라 — 그건 담기가
 * 생기기 전에도 정확하지 않았고(코드가 여는 것은 반이지 봇을 쓸 자격이 아니다) 지금은
 * 화면이 하는 일과 정면으로 어긋난다.
 */
export default function ClassbotDiscoverPage() {
  return (
    <div className="space-y-5">
      <BackLink href="/classbot">클래스봇 홈</BackLink>
      <PageHeader
        eyebrow={{ icon: Store, text: '풀림 클래스봇' }}
        title="봇 마켓"
        description="선생님들이 만들어 공유한 봇을 둘러봐요. 마음에 들면 담아서 내 봇으로 두고, 선생님 반에 들어가려면 참여 코드를 따로 받아요."
      />

      <MarketplaceBotList
        detailHref={(botId) => `/classbot/discover/${botId}`}
        emptyDescription="선생님이 봇을 올리면 여기에 보여요. 지금 듣는 수업은 내 수업방에서 볼 수 있어요."
        showSelfAdd
        /*
          담은 봇으로 가는 길을 페이지 헤더가 아니라 목록 제목 옆에 둔다.
          헤더에 두면 좁은 화면에서 버튼이 제목 옆 자리를 먹어 설명문이 서너 글자씩
          끊긴다(`PageHeader` 는 안 접히고 글자 쪽이 줄어든다). 목록 제목은 좁아지면
          위아래로 접히므로 설명문이 제 폭을 쓴다. 교사 셸이 「내 수업방」 링크를
          같은 자리에 두는 것도 같은 이유다.
          모바일 하단 탭은 셋뿐이라(홈·과제·대화) 이 링크가 폰에서 담은 봇으로 가는
          유일한 지름길이다 — 없애지 마라.
        */
        headingAction={
          <Link
            href="/classbot/my-bots"
            aria-label="내가 담은 봇으로 가기"
            className="bg-card hover:bg-pullim-slate-50/50 text-pullim-slate-700 focus-visible:ring-pullim-blue-400/50 inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden />
            내가 담은 봇
          </Link>
        }
      />
    </div>
  );
}
