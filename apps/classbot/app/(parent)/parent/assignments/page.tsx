'use client';

import { Target } from 'lucide-react';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { useParentChildren } from '@/hooks/api/parent';
import type { ParentChildItem } from '@/hooks/api/types';
import { countChildAssignments, hasSchoolWorkToShow } from '../assignment-status';
import { NoChildrenState, ParentErrorState, ParentLoading } from '../parent-state';
import { ChildAssignmentTable } from './child-assignment-table';

/**
 * 자녀 과제 현황 — 자녀 한 명이 표 하나.
 *
 * 급한 것이 위로 온다(`sortByUrgency`): 늦은 것 → 마감이 가까운 것 → 다 낸 것.
 * 부모가 이 화면에 오는 까닭이 「뭐가 급하지」 하나라서, 거르개·정렬 단추를 두지 않는다.
 * 고를 것을 늘리면 답이 늦어진다.
 *
 * 간격은 홈과 같은 눈금 — 섹션 `space-y-7`, 카드 `p-5`, 제목↔본문 `mb-4`. 위쪽 여백은 셸이 준다.
 */
export default function ParentAssignmentsPage() {
  const { data, isLoading, isError, error, refetch } = useParentChildren();
  const children = data?.children ?? [];

  return (
    <div className="space-y-7">
      {/* 뒤로 가기는 제목에 딸린 꼬리표라 헤더와 한 덩어리로 묶는다(교사 셸과 같은 처리) */}
      <div className="space-y-2">
        <BackLink href="/parent">학부모 홈</BackLink>
        <PageHeader
          eyebrow={{ icon: Target, text: '자녀 과제' }}
          title="자녀가 받은 과제"
          description="급한 것부터 위에 있어요."
        />
      </div>

      {isLoading ? (
        <ParentLoading />
      ) : isError ? (
        <ParentErrorState error={error} onRetry={() => void refetch()} />
      ) : children.length === 0 ? (
        <NoChildrenState />
      ) : (
        children.map(child => <ChildAssignmentsCard key={child.id} child={child} />)
      )}
    </div>
  );
}

/**
 * 자녀 한 명의 과제 표 한 장.
 *
 * 비었을 때 **까닭은 적지 않는다** (05 § 11.4 규칙 2) — 아래 빈 자리 주석 참조.
 */
function ChildAssignmentsCard({ child }: { child: ParentChildItem }) {
  const counts = countChildAssignments(child.assignments);
  /*
    숫자를 적어도 되는 자녀인가 — 홈 카드의 KPI 와 **같은 판정**이다
    (`../assignment-status.ts` 의 `hasSchoolWorkToShow`).

    아무것도 안 온 자녀에게 `과제 0개` 라고 적으면 숨긴 것을 없는 것으로 바꿔 말하게 된다
    (05 § 11.4 규칙 2). 그래서 셀 수 있을 때만 세고, 아니면 이름만 적는다.
    반이 왔는데 과제가 0인 자녀는 동의가 확실하므로 그 `0개` 는 참이라 그대로 적는다.

    ⛔ 이 판정으로 **문구까지** 가르지 마라 — 아래 빈 자리 글은 미동의와 활동 없음이
    함께 쓰는 하나뿐인 문장이다. 문구가 갈리면 그 차이가 곧 동의 여부가 된다(같은 규칙).
  */
  const knowsAssignments = hasSchoolWorkToShow(child);

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={
          knowsAssignments
            ? `${child.name} · 과제 ${child.assignments.length}개`
            : child.name
        }
        description={
          child.assignments.length === 0
            ? undefined
            : `남은 과제 ${counts.remaining}개 · 다 낸 과제 ${counts.done}개. 「문항」은 푼 것 / 전체예요.`
        }
      />
      {child.assignments.length === 0 ? (
        /*
         * 홈의 수업방 빈 자리와 같은 규약 (05 § 11.4 규칙 2) — 부모는 「미동의」와
         * 「활동 없음」을 구별할 수 없어야 한다. 「선생님이 과제를 내면」이라고 적으면
         * 아직 안 켠 자녀도 「과제를 안 받았다」로 읽혀, 동의 없이 활동 유무가 새어 나간다.
         */
        <EmptyState
          tone="plain"
          size="sm"
          title="보여줄 과제가 없어요"
          description="보여줄 것이 생기면 여기에 나와요."
        />
      ) : (
        <ChildAssignmentTable childName={child.name} assignments={child.assignments} />
      )}
    </section>
  );
}
