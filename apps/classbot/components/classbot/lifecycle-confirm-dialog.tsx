'use client';

import { useRef, type ReactNode, type RefObject } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LifecycleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  onConfirm: () => void;
  isPending: boolean;
  error?: string | null;
  finalFocus?: RefObject<HTMLElement | null>;
  tone?: 'danger' | 'primary';
}

/** 보관·회수·영구 삭제가 공유하는 접근성 골격. 성공 여부는 호출부가 판단해 닫는다. */
export function LifecycleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending,
  error,
  finalFocus,
  tone = 'danger',
}: LifecycleConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        initialFocus={cancelRef}
        finalFocus={finalFocus}
        className="gap-3"
      >
        <div className="flex items-start gap-2">
          <TriangleAlert className="text-pullim-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <DialogTitle className="text-pullim-slate-900 text-base font-bold break-keep [overflow-wrap:anywhere]">
            {title}
          </DialogTitle>
        </div>
        <DialogDescription className="text-pullim-slate-700 text-sm leading-relaxed break-keep">
          {description}
        </DialogDescription>
        {error && (
          <p role="alert" className="bg-pullim-danger-bg text-pullim-danger rounded-xl p-3 text-xs">
            {error}
          </p>
        )}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose
            render={<Button ref={cancelRef} type="button" variant="outline" size="touch" />}
            disabled={isPending}
          >
            취소
          </DialogClose>
          <Button
            type="button"
            variant={tone === 'danger' ? 'pullim-danger' : 'pullim'}
            size="touch"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
