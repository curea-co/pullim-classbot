'use client';

import { Sparkles } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { useParentChildren, useParentSelfStudy } from '@/hooks/api/parent';
import { NoChildrenState, ParentErrorState, ParentLoading } from '../parent-state';
import { ChildSelfStudyCard } from './child-self-study-card';
import { NOTHING_SHARED, visibleChildren } from './self-study-visibility';

/**
 * 자기주도 학습 — 아이가 스스로 고른 봇으로 공부한 것.
 *
 * 학부모 홈에 접어 넣지 않고 길을 따로 판 이유는 홈의 문법이 다르기 때문이다 —
 * 홈은 「수업방 n개 · 남은 과제 n개」로 짜여 있는데 자기주도에는 **과제도 마감도 없다**
 * (계약 §3). 그 눈금 안에 넣으면 안 낸 과제처럼 읽힌다. 홈에는 자녀당 한 줄만 얹고
 * 본체는 여기다.
 *
 * 간격은 학부모 두 화면과 같은 눈금 — 섹션 `space-y-7`, 카드 `p-5`. 위쪽 여백은 셸이 준다.
 *
 * ## 분기 순서가 곧 규칙이다 — 바꾸지 마라
 *
 * ① 불러오는 중 → ② 못 불러옴 → ③ 보여줄 자녀 → ④ 이어진 자녀 없음 → ⑤ 볼 것 없음
 *
 * **① 이 맨 앞인 것이 요점이다.** ⑤ 의 문구를 응답 전에 잠깐이라도 그리면, 아직 아무것도
 * 모르는 상태에서 부모에게 「아이가 아직 안 보여줬다」를 스치듯 말하는 셈이 된다.
 * 잠깐이어도 읽히고, 읽히면 아이가 하지 않은 일을 한 것처럼 된다.
 *
 * 다만 ① 이 앞이라는 것은 **아직 모를 때만 로딩**이라는 뜻이지, 이미 안 것을 로딩 뒤에
 * 두라는 뜻이 아니다. 본 조회가 실패한 순간 ② 는 이미 결정된 사실이라 보조 조회를
 * 기다리지 않는다(아래 `isLoading` 주석).
 *
 * **④ 와 ⑤ 를 가르는 것은 동의가 아니다.** ④ 는 「이 사람에게 이어진 자녀가 아예 없다」는
 * 계정 사실이고 동의와 무관하다(홈에서 이미 보이는 것과 같은 사실이라 새로 새는 게 없다).
 * 그 하나를 알기 위해서만 `useParentChildren` 을 함께 부른다 — 두 응답을 섞는 게 아니라
 * (계약 §2 가 막은 건 응답을 섞는 것이다) 서로 다른 두 사실을 각자의 입구에서 읽는 것이다.
 *
 * ⑤ 안에서는 **동의 안 함과 활동 없음이 갈리지 않는다.** 그 이유와 장치는
 * `./self-study-visibility.ts` 머리주석에 있다.
 */
export default function ParentSelfStudyPage() {
  const selfStudy = useParentSelfStudy();
  const linked = useParentChildren();

  const children = visibleChildren(selfStudy.data?.children ?? []);

  /*
    ① 은 **본 조회**(자기주도)의 상태다.

    보조 조회(`linked`)는 ④ 와 ⑤ 를 가를 때만 필요하므로, 보여줄 카드가 이미 있으면
    기다리지 않는다. 그리고 본 조회가 **이미 실패했으면** 아예 기다리지 않는다 —
    기다리면 ② 가 자녀 목록 응답이 끝날 때까지 스켈레톤 뒤에 가려지고, 부모는 이미
    드러난 오류를 「불러오는 중」으로 읽으며 다시 시도 버튼도 늦게 만난다.
    ①→② 라는 순서는 「로딩을 먼저 그린다」가 아니라 「아직 모를 때만 로딩이다」라는 뜻이다.
  */
  const isLoading =
    !selfStudy.isError &&
    (selfStudy.isLoading || (children.length === 0 && linked.isLoading));
  const hasNoLinkedChild =
    linked.isSuccess && linked.data.children.length === 0;
  /*
    ④ 와 ⑤ 를 가르는 사실을 **못 읽은** 상태.

    보여줄 카드가 없을 때 이 조회가 실패했으면 「자녀가 없다」인지 「볼 것이 없다」인지 아직
    모른다. 그걸 ⑤ 로 떨어뜨리면 네트워크 오류를 「아이가 아직 안 보여줬어요」로 바꿔 말하는
    셈이 된다 — 아이가 하지 않은 일을 한 것처럼 만드는 자리라 오류로 남긴다.
  */
  const linkedUnknown = children.length === 0 && linked.isError;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <BackLink href="/parent">학부모 홈</BackLink>
        <PageHeader
          eyebrow={{ icon: Sparkles, text: '자기주도 학습' }}
          title="아이가 혼자 고른 봇"
          description="선생님 반과 상관없이 아이가 스스로 골라 공부한 것만 모았어요. 무엇을 얼마 동안 보여줄지는 아이가 정해요."
        />
      </div>

      {isLoading ? (
        <ParentLoading />
      ) : selfStudy.isError ? (
        <ParentErrorState
          error={selfStudy.error}
          onRetry={() => void selfStudy.refetch()}
        />
      ) : linkedUnknown ? (
        <ParentErrorState error={linked.error} onRetry={() => void linked.refetch()} />
      ) : children.length > 0 ? (
        children.map(child => <ChildSelfStudyCard key={child.id} child={child} />)
      ) : hasNoLinkedChild ? (
        <NoChildrenState />
      ) : (
        <NothingSharedState />
      )}
    </div>
  );
}

/**
 * 볼 것이 없는 자리 — 미동의 자녀와 무활동 자녀가 **함께** 도착하는 곳.
 *
 * 글자는 `NOTHING_SHARED` 한 곳에서만 온다. 여기서 문구를 직접 쓰지 마라 —
 * 학부모 홈의 한 줄 요약이 사라지는 조건과 같은 조건이라, 두 자리가 다른 말을 하면
 * 그 차이로 동의 여부가 드러난다(`./self-study-visibility.ts`).
 */
function NothingSharedState() {
  return (
    <div data-testid="self-study-nothing-shared">
      <EmptyState
        icon={Sparkles}
        title={NOTHING_SHARED.title}
        description={NOTHING_SHARED.description}
      />
    </div>
  );
}
