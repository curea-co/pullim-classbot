'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { LifecycleConfirmDialog } from '@/components/classbot/lifecycle-confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useArchiveClass,
  useDeleteClass,
  useRestoreClass,
  useUpdateClass,
} from '@/hooks/api/classroom';
import { statusOf } from '@/lib/api/classbot-client';
import type { ClassDto } from '@/lib/api/classbot-dto';

export function ClassActionsMenu({
  classroom,
  onArchived,
  onDeleted,
  onRestored,
}: {
  classroom: ClassDto;
  onArchived?: () => void;
  onDeleted?: () => void;
  onRestored?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const archive = useArchiveClass();
  const restore = useRestoreClass();
  const remove = useDeleteClass();
  const archived = !classroom.isActive;

  function handleRestore() {
    restore.mutate({ classId: classroom.id, expectedUpdatedAt: classroom.updatedAt }, {
      onSuccess: () => {
        onRestored?.();
        toast.success(`「${classroom.name}」 반을 다시 열었어요`, {
          description: '새 참여 코드를 학생에게 알려 주세요.',
        });
      },
      onError: (error) => toast.error(
        statusOf(error) === 409
          ? '다른 곳에서 반 정보가 변경되었어요. 새로고침 후 다시 시도해 주세요.'
          : '반을 다시 열지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
          aria-label={`${classroom.name} 반 메뉴`}
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 focus-visible:ring-pullim-blue-400/50 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {!archived && (
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil /> 반 정보 수정
            </DropdownMenuItem>
          )}
          {archived ? (
            <DropdownMenuItem onClick={handleRestore} disabled={restore.isPending}>
              <RotateCcw /> {restore.isPending ? '다시 여는 중…' : '다시 열기'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
              <Archive /> 반 보관
            </DropdownMenuItem>
          )}
          {archived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> 영구 삭제
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditClassDialog classroom={classroom} open={editOpen} onOpenChange={setEditOpen} finalFocus={triggerRef} />

      <LifecycleConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => { setArchiveOpen(open); if (!open) setArchiveError(null); }}
        title={`「${classroom.name}」을 보관할까요?`}
        description={<>보관하면 새 참여와 새 과제 발송, 새 대화를 시작할 수 없어요. 기존 명단·과제·제출·대화 기록은 남고 지난 수업방에서 다시 열 수 있어요.</>}
        confirmLabel="보관하기"
        pendingLabel="보관하는 중…"
        isPending={archive.isPending}
        error={archiveError}
        finalFocus={triggerRef}
        onConfirm={() => {
          setArchiveError(null);
          archive.mutate({ classId: classroom.id, expectedUpdatedAt: classroom.updatedAt }, {
            onSuccess: () => {
              setArchiveOpen(false);
              toast.success(`「${classroom.name}」 반을 보관했어요`);
              onArchived?.();
            },
            onError: (error) => setArchiveError(
              statusOf(error) === 409
                ? '다른 곳에서 반 정보가 변경되었어요. 새로고침 후 다시 시도해 주세요.'
                : '반을 보관하지 못했어요. 잠시 후 다시 시도해 주세요.',
            ),
          });
        }}
      />

      <LifecycleConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteError(null); }}
        title={`「${classroom.name}」을 영구 삭제할까요?`}
        description={<>삭제하면 반 이름·설정과 참여 코드가 사라지고 되돌릴 수 없어요. 학생·과제·대화 기록이 있는 반은 삭제할 수 없고 보관만 할 수 있어요.</>}
        confirmLabel="영구 삭제"
        pendingLabel="삭제하는 중…"
        isPending={remove.isPending}
        error={deleteError}
        finalFocus={triggerRef}
        onConfirm={() => {
          setDeleteError(null);
          remove.mutate(classroom.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              toast.success(`「${classroom.name}」 반을 영구 삭제했어요`);
              onDeleted?.();
            },
            onError: (error) => setDeleteError(
              statusOf(error) === 409
                ? '학생·과제·대화 기록이 있거나 아직 보관되지 않은 반은 영구 삭제할 수 없어요.'
                : '반을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
            ),
          });
        }}
      />
    </>
  );
}

function EditClassDialog({
  classroom,
  open,
  onOpenChange,
  finalFocus,
}: {
  classroom: ClassDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: React.RefObject<HTMLElement | null>;
}) {
  const [name, setName] = useState(classroom.name);
  const [subject, setSubject] = useState(classroom.subject ?? '');
  const [grade, setGrade] = useState(classroom.grade ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateClass();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // 매번 현재 서버 DTO에서 새 draft를 열어 취소했던 입력이 다음 열기에 남지 않게 한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(classroom.name);
    setSubject(classroom.subject ?? '');
    setGrade(classroom.grade ?? '');
    setError(null);
  }, [classroom.grade, classroom.name, classroom.subject, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || update.isPending) return;
    setError(null);
    update.mutate(
      {
        classId: classroom.id,
        patch: {
          expectedUpdatedAt: classroom.updatedAt,
          name: name.trim(),
          subject: subject.trim() || null,
          grade: grade.trim() || null,
        },
      },
      {
        onSuccess: () => { onOpenChange(false); toast.success('반 정보를 고쳤어요.'); },
        onError: (mutationError) => setError(
          statusOf(mutationError) === 409
            ? (mutationError.message.includes('보관된 반')
                ? '보관한 반은 다시 연 뒤에 정보를 고칠 수 있어요.'
                : '다른 곳에서 반 정보가 변경되었어요. 새로고침 후 다시 시도해 주세요.')
            : '반 정보를 고치지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent initialFocus={nameRef} finalFocus={finalFocus} showCloseButton={false}>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>반 정보 수정</DialogTitle>
            <DialogDescription>학생에게 보이는 반 이름과 과목·학년을 고쳐요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor={`class-${classroom.id}-name`}>반 이름</Label>
              <Input ref={nameRef} id={`class-${classroom.id}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`class-${classroom.id}-subject`}>과목</Label>
              <Input id={`class-${classroom.id}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`class-${classroom.id}-grade`}>학년</Label>
              <Input id={`class-${classroom.id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={50} />
            </div>
            {error && <p role="alert" className="text-pullim-danger text-xs">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="touch" />} disabled={update.isPending}>취소</DialogClose>
            <Button type="submit" variant="pullim" size="touch" disabled={update.isPending || !name.trim()}>
              {update.isPending ? '저장하는 중…' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
