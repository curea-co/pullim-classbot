'use client';

import { useId, useMemo, useState, type FormEvent, type RefObject } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ClipboardList, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeacherAssignments } from '@/hooks/api/assignment-dispatch';
import { sendInterventionFailureMessage, useSendInterventions } from '@/hooks/api/intervention';
import type { AssignmentSummaryDto, ClassMemberDto } from '@/lib/api/classbot-dto';
import { memberLabel, remindDefaultMessage } from '@/lib/interventions';

/**
 * 명단 한 줄에서 여는 개입 판 — 「리마인드」와 「코멘트」 둘을 같은 판이 낸다
 * (`POST /classbot/classes/:classId/interventions` · 계획 PR 5c · `proc/spec/14` 개입 4종).
 *
 * **왜 코멘트도 과제를 고르는가** — 정본 불변식이 `type != 'crisis'` 면 `assignmentId` 를 **필수**로 보기 때문이다
 * (`intervention.service.ts` `assertEventShape` · data-model § 1.5). 과제 없이 보내면 400 이고, 다른 반 과제를 실어도
 * 400 이다. 그래서 둘 다 이 반의 낸 과제 하나를 고른 뒤 보낸다 — 두 유형의 차이는 **문구가 채워져 오는가**다.
 * 리마인드는 그대로 보내도 되는 한 줄이 미리 들어 있고(고칠 수 있다), 코멘트는 빈칸에서 시작한다.
 *
 * **`crisis`·`requiz` 는 이 판이 내지 않는다** — crisis 는 위험 신호에서 서버가 자동으로 만들고
 * (`proc/spec/05 § 3`), requiz 는 「오답 다시 내기」 문이 정본에 서는 날의 몫이다.
 *
 * 이 반에 낸 과제가 하나도 없으면 보낼 수 없다 — 죽은 버튼 대신 **왜 못 보내는지와 갈 곳**을 말한다.
 */

/** 이 판이 내는 유형 둘. */
export type InterventionKind = 'remind' | 'comment';

const KIND_META: Record<InterventionKind, { label: string; icon: typeof ClipboardList; hint: string }> = {
  remind: {
    label: '리마인드',
    icon: ClipboardList,
    hint: '아직 안 낸 과제를 한 번 짚어 줘요. 문구는 고쳐도 돼요.',
  },
  comment: {
    label: '코멘트',
    icon: MessageCircle,
    hint: '학생 결과 화면에 「선생님 한마디」로 붙어요.',
  },
};

/** 폼 컨트롤 공통 결 — 「봇」 탭·반 만들기 폼과 같은 눈금. */
const controlClass =
  'border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none';

/** 배포 시각 — 아직 안 낸(=`null`) 과제는 맨 뒤로 보낸다. */
function dispatchedTime(a: AssignmentSummaryDto): number {
  const at = a.dispatchedAt === null ? NaN : Date.parse(a.dispatchedAt);
  return Number.isNaN(at) ? -Infinity : at;
}

/**
 * **학생에게 이미 나간** 과제만 고를 수 있다. 정본 `dispatch_status` 는 `draft|sent|scheduled|withdrawn` 인데
 * 서버 불변식은 **same-class 만** 본다(`assertAssignmentInClass`) — draft·withdrawn 과제를 실어도 201 이다.
 * 그러면 학생 인박스에 「'X' 과제가 아직 제출 전이에요」가 서고 딥링크는 **학생이 열 수 없는 자리**로 간다.
 * 그래서 화면이 막는다.
 */
const DISPATCHED = 'sent';

/**
 * 고르개에 실을 과제 — 이 반의 것 중 **나간 것만**, **최근에 낸 것이 위**다(교사가 방금 낸 과제를 먼저 찾는다).
 * @param assignments - `GET /assignments?audience=teacher`(내가 operator 인 모든 반)
 * @param classId - 이 반
 * @returns 이 반의 나간 과제(최근순)
 */
export function classAssignmentOptions(
  assignments: readonly AssignmentSummaryDto[],
  classId: string,
): AssignmentSummaryDto[] {
  return assignments
    .filter((a) => a.classId === classId && a.dispatchStatus === DISPATCHED)
    .sort((a, b) => dispatchedTime(b) - dispatchedTime(a));
}

/** 이 반의 과제 전부(상태 무관) — 「하나도 없다」와 「있지만 아직 안 나갔다」를 갈라 말하려고 센다. */
export function classAssignmentCount(
  assignments: readonly AssignmentSummaryDto[],
  classId: string,
): number {
  return assignments.filter((a) => a.classId === classId).length;
}

export interface InterventionDialogProps {
  classId: string;
  kind: InterventionKind;
  member: ClassMemberDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 닫힐 때 포커스를 돌려줄 자리 — 이 판을 연 줄의 버튼. */
  finalFocus?: RefObject<HTMLElement | null>;
}

export function InterventionDialog({
  classId,
  kind,
  member,
  open,
  onOpenChange,
  finalFocus,
}: InterventionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="intervention-dialog"
        finalFocus={finalFocus}
        className="gap-3 sm:max-w-md"
      >
        {/* 학생·유형이 바뀌면 폼을 통째로 갈아 끼운다(`key`) — 옛 문구가 다음 학생에게 남지 않는다. */}
        <InterventionForm
          key={`${kind}:${member.memberId}`}
          classId={classId}
          kind={kind}
          member={member}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function InterventionForm({
  classId,
  kind,
  member,
  onDone,
}: {
  classId: string;
  kind: InterventionKind;
  member: ClassMemberDto;
  onDone: () => void;
}) {
  const meta = KIND_META[kind];
  const name = memberLabel(member);
  const assignments = useTeacherAssignments();
  const send = useSendInterventions();
  const selectId = useId();
  const messageId = useId();

  const options = useMemo(
    () => classAssignmentOptions(assignments.data ?? [], classId),
    [assignments.data, classId],
  );
  /** 고를 것이 없을 때 「없다」와 「아직 안 나갔다」를 갈라 말하려고 센다. */
  const totalInClass = classAssignmentCount(assignments.data ?? [], classId);

  /** 고른 과제 — 안 고르면 가장 최근에 낸 것. */
  const [picked, setPicked] = useState<string | null>(null);
  const assignmentId = picked ?? options[0]?.id ?? '';
  const selected = options.find((a) => a.id === assignmentId);

  /** `null` = 아직 손대지 않았다 → 기본 문구를 그대로 쓴다(과제를 바꾸면 따라 바뀐다). */
  const [draft, setDraft] = useState<string | null>(null);
  const defaultMessage = kind === 'remind' && selected ? remindDefaultMessage(selected.title) : '';
  const message = draft ?? defaultMessage;

  const [failure, setFailure] = useState<string | null>(null);
  const canSend = assignmentId !== '' && message.trim().length > 0 && !send.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    setFailure(null);
    send.mutate(
      { classId, events: [{ type: kind, studentId: member.memberId, assignmentId, message: message.trim() }] },
      {
        onSuccess: () => {
          toast(`${name} 학생에게 ${meta.label}를 보냈어요.`);
          onDone();
        },
        onError: (error) => setFailure(sendInterventionFailureMessage(error)),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <DialogTitle className="text-pullim-slate-900 text-base font-bold break-keep">
        {name} 학생에게 {meta.label}
      </DialogTitle>
      <DialogDescription className="text-pullim-slate-500 text-2xs leading-relaxed">
        {meta.hint}
      </DialogDescription>

      {assignments.isPending ? (
        <p className="text-pullim-slate-500 text-2xs" data-testid="intervention-assignments-loading">
          이 반의 과제를 불러오는 중이에요…
        </p>
      ) : options.length === 0 ? (
        // 고를 과제가 없으면 못 보낸다 — 정본이 비-crisis 개입에 과제를 요구한다(머리주석).
        // 「하나도 없다」와 「있지만 아직 학생에게 안 나갔다」는 교사가 다음에 할 일이 다르다.
        <p className="text-pullim-slate-700 text-2xs leading-relaxed" data-testid="intervention-no-assignment">
          {totalInClass > 0 ? (
            '이 반의 과제가 아직 학생에게 나가지 않았어요. 나간 과제에만 보낼 수 있어요 — 먼저 과제를 내 주세요.'
          ) : (
            <>
              이 반에 낸 과제가 아직 없어요. 개입은 과제 하나에 붙어서 가니까{' '}
              <Link
                href={`/teacher/assignment/new?classId=${encodeURIComponent(classId)}`}
                className="text-pullim-blue-600 font-bold underline underline-offset-2"
              >
                과제를 먼저 내 주세요
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <div className="grid gap-1">
            <Label htmlFor={selectId} className="text-pullim-slate-700 text-2xs font-bold">
              어느 과제에 대한 것인가요
            </Label>
            <select
              id={selectId}
              value={assignmentId}
              onChange={(e) => setPicked(e.target.value)}
              data-testid="intervention-assignment"
              className={controlClass}
            >
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} · {a.dueLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <Label htmlFor={messageId} className="text-pullim-slate-700 text-2xs font-bold">
              보낼 말
            </Label>
            <Textarea
              id={messageId}
              value={message}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={kind === 'comment' ? '학생이 결과 화면에서 읽을 한마디를 적어 주세요' : undefined}
              data-testid="intervention-message"
              className="text-sm"
            />
          </div>
        </>
      )}

      {failure && (
        <p role="alert" data-testid="intervention-error" className="text-pullim-danger text-2xs">
          {failure}
        </p>
      )}

      <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogClose
          render={<Button type="button" variant="outline" size="touch" />}
          data-testid="intervention-cancel"
        >
          그만두기
        </DialogClose>
        <Button
          type="submit"
          variant="pullim"
          size="touch"
          disabled={!canSend}
          data-testid="intervention-send"
        >
          {send.isPending ? '보내는 중…' : '보내기'}
        </Button>
      </div>
    </form>
  );
}
