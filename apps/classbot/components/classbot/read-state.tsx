'use client';

import { AlertCircle, Lock } from 'lucide-react';
import { EmptyState } from './empty-state';
import { redirectToOsLogin } from '@/lib/auth/os-sso';

/**
 * 읽기 4면(Phase 7 Stage 2) 공통 상태 카드 — 로그인 게이트 / 에러.
 * 데이터·로딩·빈 상태는 각 surface 가 자기 레이아웃으로 그린다.
 */

/** 비로그인 — 로그인월(D1). mock 을 보여주지 않고 로그인으로 유도한다. */
export function ReadLoginGate({ label = '내 정보' }: { label?: string }) {
  // 클래스봇은 자체 로그인 화면이 없다 — 풀림 OS 로그인으로 보낸다. 현재 위치를 `next` 로
  // 실어 복귀시키는 것과 cross-host 절대 URL 승격은 `redirectToOsLogin` 이 소유한다
  // (헤더 프로필 메뉴와 **같은 함수**를 지난다 — 종전엔 양쪽이 복귀를 각자 만들었다).
  //
  // href 가 아니라 onClick 인 이유: OS 로그인 URL 은 앱 오리진(`window.location.origin`)이
  // 있어야 만들 수 있어 SSR 시점엔 값이 없다. 링크로 두면 첫 페인트에 틀린 href 가 실린다.
  return (
    <EmptyState
      tone="neutral"
      icon={Lock}
      title="로그인이 필요해요"
      description={`${label}를 보려면 먼저 로그인해 주세요.`}
      action={{ onClick: redirectToOsLogin, label: '로그인' }}
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
