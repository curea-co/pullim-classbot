'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useAssignmentStore, type UserAssignment } from '@/lib/store/assignments';
import { isPastDue } from '../assignment-filters';
import { useAssignmentWrite } from '../use-assignment-write';

/**
 * 회수 · 되돌리기 (`proc/spec/14 § 3.3.6`).
 *
 * **회수는 지우는 것이 아니다.** 학생의 「받은 과제」에서 내려갈 뿐, 이미 낸 답과 채점은
 * 데이터로 남는다(§ 5.3). 지우기로 만들면 회수가 곧 증거 인멸이 된다 — 그래서 확인 모달이
 * 그 사실을 **먼저** 말한다. 「정말 하시겠어요?」만 묻는 모달은 무엇이 남고 무엇이 사라지는지를
 * 안 알려 줘서, 교사가 겁을 먹거나 반대로 아무 생각 없이 누르게 된다.
 *
 * **「남는다」를 학생이 계속 본다는 뜻으로 적지 않는다.** 회수하면 학생 쪽 결과 화면도 닫힌다 —
 * 서버 술어가 `dispatch_status='sent'` 인 것만 보여 주기 때문이고, 그건 목록만 감추고 결과는
 * 열어 두는 반쪽 상태보다 낫다(반쪽이면 데모 경로와 로그인 경로가 서로 다르게 군다).
 * 남는 것은 **기록**이고, 되돌리면 학생도 다시 본다 — 모달이 그렇게 말한다.
 *
 * 스키마에는 이미 자리가 있었다 — `assignments.dispatch_status` 의 `'withdrawn'` 값이
 * 정의만 되고 아무도 쓰지 않았다. 새 컬럼이 필요 없는 이유다.
 */
export function WithdrawButton({
  assignment,
  submittedCount,
  targetCount,
}: {
  assignment: UserAssignment;
  submittedCount: number;
  targetCount: number;
}) {
  const [open, setOpen] = useState(false);
  const withdraw = useAssignmentStore((s) => s.withdraw);
  const { write, isPending } = useAssignmentWrite();
  const router = useRouter();

  async function confirm() {
    /*
      서버가 먼저다 — 학생이 보는 술어는 DB 의 `dispatch_status` 를 읽는다(그 훅 주석).
      **실패하면 아무것도 하지 않는다.** 로컬만 회수해 두면 교사 화면은 「회수됨」인데 학생은
      그대로 풀고 있다 — 그 훅이 「제일 나쁘다」고 적은 상태다. 모달은 열어 둔 채로 두어
      교사가 다시 누를 수 있게 한다(오류 토스트는 훅이 이미 띄웠다).
    */
    const outcome = await write({ id: assignment.id, dispatchStatus: 'withdrawn' });
    if (outcome === 'failed') return;

    withdraw(assignment.id);
    setOpen(false);
    toast.success('과제를 회수했어요');
    // 회수한 자리에 그대로 머물면 「회수됨」 배너만 남아 할 일이 없다. 목록이 다음 자리다.
    router.push('/teacher/assignment');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/*
        `DialogTrigger` 로 연다 — 평범한 button 을 쓰면 base-ui 가 `aria-haspopup`·`aria-expanded`
        를 안 달고, 「그만두기」로 닫았을 때 **포커스가 body 로 떨어진다.** 키보드·스크린리더
        사용자가 화면에서 제 자리를 잃는다.
      */}
      <DialogTrigger
        data-testid="assignment-withdraw-trigger"
        className="text-pullim-slate-600 border-pullim-slate-200 hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors outline-none focus-visible:ring-2"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        회수
      </DialogTrigger>

      <DialogContent data-testid="assignment-withdraw-dialog">
        <DialogHeader>
          <DialogTitle>회수할까요?</DialogTitle>
          {/* 숫자를 먼저 말한다 — 「몇 명이 이미 풀었나」가 이 결정의 전부다 */}
          <DialogDescription className="text-pullim-slate-900 font-bold">
            {targetCount}명 중 <span className="font-mono">{submittedCount}</span>명이 이미 풀었어요.
          </DialogDescription>
          <p className="text-pullim-slate-500 text-sm">
            회수하면 학생의 「받은 과제」에서 사라져요 — 결과 화면도 함께 닫혀요.
            <br />
            <b className="text-pullim-slate-900">이미 낸 답과 채점은 지워지지 않아요.</b>
            {' '}되돌리면 학생이 다시 볼 수 있어요.
          </p>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            className="text-pullim-slate-600 hover:bg-pullim-slate-50 rounded-lg px-3 py-2 text-sm font-bold"
          >
            그만두기
          </DialogClose>
          <button
            type="button"
            data-testid="assignment-withdraw-confirm"
            onClick={() => void confirm()}
            disabled={isPending}
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            회수하기
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 되돌리기 — **마감 전에만** 연다.
 *
 * 마감이 지난 뒤 되돌리면 학생 목록에 「이미 끝난 과제」가 다시 나타난다. 그건 회수를 무르는
 * 것이 아니라 새 과제를 내는 것에 가깝고, 그 길은 [복제해서 다시 내기]다.
 */
export function RestoreButton({ assignment }: { assignment: UserAssignment }) {
  const restore = useAssignmentStore((s) => s.restore);
  const { write, isPending } = useAssignmentWrite();

  // `state` 는 낼 때 굳어서 로컬 경로에서는 영영 `'overdue'` 가 되지 않는다 — 그걸로 재면
  // 이 가드가 **한 번도 안 걸리고**, 몇 달 지난 과제도 되살아나 학생 목록에 다시 뜬다.
  if (isPastDue(assignment)) return null;

  return (
    <button
      type="button"
      data-testid="assignment-restore"
      onClick={() => {
        void (async () => {
          const outcome = await write({ id: assignment.id, dispatchStatus: 'sent' });
          if (outcome === 'failed') return;
          restore(assignment.id);
          toast.success('회수를 되돌렸어요');
        })();
      }}
      disabled={isPending}
      className="text-pullim-slate-600 border-pullim-slate-200 hover:bg-pullim-slate-50 focus-visible:ring-pullim-blue-400/50 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors outline-none focus-visible:ring-2"
    >
      <Undo2 className="h-4 w-4" aria-hidden />
      되돌리기
    </button>
  );
}
