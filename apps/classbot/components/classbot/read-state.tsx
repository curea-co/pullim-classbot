'use client';

import { usePathname } from 'next/navigation';
import { AlertCircle, Lock } from 'lucide-react';
import { EmptyState } from './empty-state';

/**
 * 읽기 4면(Phase 7 Stage 2) 공통 상태 카드 — 로그인 게이트 / 에러.
 * 데이터·로딩·빈 상태는 각 surface 가 자기 레이아웃으로 그린다.
 */

/** 비로그인 — 로그인월(D1). mock 을 보여주지 않고 로그인으로 유도한다. */
export function ReadLoginGate({ label = '내 정보' }: { label?: string }) {
  // 현재 위치를 next 에 실어 보낸다 — auth-guard/login-form 의 `?next=` 복귀 계약 정합.
  // 로그인 후 이 읽기 surface(예: /classbot/assignment)로 되돌아오게 한다.
  const pathname = usePathname();
  const loginHref = pathname
    ? `/login?next=${encodeURIComponent(pathname)}`
    : '/login';
  return (
    <EmptyState
      tone="neutral"
      icon={Lock}
      title="로그인이 필요해요"
      description={`${label}를 보려면 먼저 로그인해 주세요.`}
      action={{ href: loginHref, label: '로그인하기' }}
    />
  );
}

/** 읽기 실패 — 재시도 버튼. */
export function ReadErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      tone="danger"
      icon={AlertCircle}
      title="불러오지 못했어요"
      description="잠시 후 다시 시도해 주세요."
      action={onRetry ? { onClick: onRetry, label: '다시 시도' } : undefined}
    />
  );
}
