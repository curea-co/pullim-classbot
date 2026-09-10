'use client';

import { AlertCircle, Users } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadLoginGate } from '@/components/classbot/read-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiClientError } from '@/lib/api/client-fetch';

/**
 * 학부모 두 화면(홈 · 자녀 과제)이 같이 쓰는 세 가지 자리 — 불러오는 중 · 못 불러옴 · 자녀 없음.
 *
 * 두 화면이 같은 한 곳(`GET /api/parent/children`)을 읽으니 실패하는 모양도 하나여야 한다.
 * 화면마다 다른 문구를 지어 두면 같은 실패가 홈에서와 과제에서 다르게 읽힌다.
 */

/** 카드 한 장 자리의 뼈대 — 자녀 카드와 같은 크기를 잡아 둬야 도착할 때 화면이 튀지 않는다. */
export function ParentLoading() {
  return (
    <section className="bg-card rounded-2xl border p-5" aria-busy="true">
      <span className="sr-only">자녀 정보를 불러오는 중이에요</span>
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-2 h-4 w-44" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </section>
  );
}

/**
 * 못 불러왔을 때.
 *
 * 서버가 준 문구를 **그대로** 보여준다 — `/api/parent/children` 의 오류 문구는 이미 우리말이고,
 * 「권한이 없어요」와 「자녀가 연결돼 있지 않아요」는 부모가 할 일이 서로 다르다.
 * 화면이 제 문구로 덮으면 그 차이가 사라진다.
 *
 * 401 만 따로 뺀다 — 그건 실패가 아니라 로그인이 필요한 것이라 나가는 길이 달라야 한다.
 */
export function ParentErrorState({
  error,
  onRetry,
}: {
  error: ApiClientError;
  onRetry: () => void;
}) {
  if (error.status === 401) return <ReadLoginGate label="자녀 학습 정보" />;
  return (
    <EmptyState
      tone="danger"
      icon={AlertCircle}
      title="자녀 정보를 불러오지 못했어요"
      description={error.message}
      action={{ onClick: onRetry, label: '다시 시도' }}
    />
  );
}

/** 연결된 자녀가 하나도 없을 때 — 빈 화면 대신 무엇이 있어야 보이는지 말한다. */
export function NoChildrenState() {
  return (
    <EmptyState
      icon={Users}
      title="이어진 자녀가 없어요"
      description="자녀 계정과 이어지면 자녀가 들어간 수업방과 받은 과제를 여기에서 볼 수 있어요."
    />
  );
}
