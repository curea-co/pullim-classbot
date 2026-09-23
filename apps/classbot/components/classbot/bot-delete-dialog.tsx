'use client';

import type { RefObject } from 'react';

import { LifecycleConfirmDialog } from '@/components/classbot/lifecycle-confirm-dialog';

export interface BotDeleteDialogProps {
  botName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  finalFocus?: RefObject<HTMLElement | null>;
  isPending?: boolean;
  error?: string | null;
}

/** 옛 이름은 호출부 호환을 위해 유지하지만 동작은 영구 삭제가 아니라 서버 보관이다. */
export function BotDeleteDialog({
  botName,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
  isPending = false,
  error,
}: BotDeleteDialogProps) {
  return (
    <LifecycleConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`「${botName}」을 보관할까요?`}
      description="반에서 사용 중인 봇은 먼저 모든 반에서 떼어야 해요. 보관하면 새 반에 붙이거나 설정을 고칠 수 없지만 기존 과제·대화 기록은 남고, 봇 관리의 보관함에서 다시 복구할 수 있어요."
      confirmLabel="보관하기"
      pendingLabel="보관하는 중…"
      onConfirm={onConfirm}
      isPending={isPending}
      error={error}
      finalFocus={finalFocus}
    />
  );
}
