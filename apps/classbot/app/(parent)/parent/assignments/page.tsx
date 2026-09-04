'use client';

import { Target } from 'lucide-react';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { useParentChildren } from '@/hooks/api/parent';
import type { ParentChildItem } from '@/hooks/api/types';
import { countChildAssignments } from '../assignment-status';
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

/** 자녀 한 명의 과제 표 한 장. 과제가 아직 없으면 빈 화면 대신 왜 비었는지 적는다. */
function ChildAssignmentsCard({ child }: { child: ParentChildItem }) {
  const counts = countChildAssignments(child.assignments);

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={`${child.name} · 과제 ${child.assignments.length}개`}
        description={
          child.assignments.length === 0
            ? undefined
            : `남은 과제 ${counts.remaining}개 · 다 낸 과제 ${counts.done}개. 「문항」은 푼 것 / 전체예요.`
        }
      />
      {child.assignments.length === 0 ? (
        /* 「아직 안 받았다」와 「아직 안 보여준다」가 같은 자리로 온다 — 가르지 않는다
           (학부모 홈의 수업방 빈 자리와 같은 규칙). */
        <EmptyState
          tone="plain"
          size="sm"
          title="여기 보여드릴 과제가 아직 없어요"
          description="선생님이 과제를 내고 아이가 보여주기로 하면 여기 나와요."
        />
      ) : (
        <ChildAssignmentTable childName={child.name} assignments={child.assignments} />
      )}
    </section>
  );
}
