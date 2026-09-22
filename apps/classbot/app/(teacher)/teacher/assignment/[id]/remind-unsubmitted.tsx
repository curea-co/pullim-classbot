'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClassMembers } from '@/hooks/api/classroom';
import { sendInterventionFailureMessage, useSendInterventions } from '@/hooks/api/intervention';
import { isUnauthorized } from '@/lib/api/classbot-client';
import type { ClassMemberDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';
import {
  bulkRemindSummary,
  memberLabel,
  remindDefaultMessage,
  unsubmittedMembers,
  type BulkRemindResult,
} from '@/lib/interventions';

/**
 * 과제 상세 「미제출 학생에게 리마인드」 — 대상은 **반 명단 − 제출자**다(계획 PR 5c).
 *
 * 두 정본을 겹쳐 대상을 센다: `GET /classes/:classId/members`(`useClassMembers` · 5b 가 연 문)와 이 화면이 이미
 * 읽은 `GET /assignments/:id/submissions`. 명단을 못 읽으면(403·404·장애) **버튼을 감춘다** — 대상이 「반 전체」인지
 * 「제출자 말고 아무도 없음」인지 모르는 채 보내면 엉뚱한 사람에게 간다.
 *
 * **학생마다 요청 하나다.** 정본의 bulk(`{ events: [...] }`)는 한 트랜잭션이라 대상 하나가 어긋나면
 * (반을 나갔거나 비활성) **전부 롤백**된다(`intervention.service.ts` `send`). 한 명 때문에 스무 명이 못 받는 것보다
 * 스무 명 중 하나가 빠지는 쪽이 낫고, 그 결과를 요약으로 말해 준다(`bulkRemindSummary`).
 * 401 을 만나면 **그 자리에서 멈춘다** — `classbotWrite` 가 이미 로그인으로 보내는 중이라 남은 요청은 리다이렉트를
 * 다시 걸 뿐이다.
 */
export function RemindUnsubmitted({
  classId,
  assignmentId,
  assignmentTitle,
  submissions,
}: {
  /** 이 과제의 반. */
  classId: string;
  assignmentId: string;
  /** 기본 문구에 들어갈 제목. */
  assignmentTitle: string;
  /** 이 과제의 제출 현황(이미 읽은 것). */
  submissions: readonly SubmissionsViewDto[];
}) {
  const members = useClassMembers(classId);
  const send = useSendInterventions();
  const [running, setRunning] = useState(false);

  // 명단을 못 읽으면 버튼을 감춘다 — 401 은 이미 로그인으로 가는 중이다(머리주석).
  if (!members.isSuccess) return null;

  const targets = unsubmittedMembers(members.data, submissions);

  if (targets.length === 0) {
    return (
      <p data-testid="remind-none" className="text-pullim-slate-500 text-2xs">
        이 반의 학생이 모두 냈어요.
      </p>
    );
  }

  async function handleClick() {
    setRunning(true);
    const result = await sendSequentially(targets, (member) =>
      send.mutateAsync({
        classId,
        events: [
          {
            type: 'remind',
            studentId: member.memberId,
            assignmentId,
            message: remindDefaultMessage(assignmentTitle),
          },
        ],
      }),
    );
    setRunning(false);
    toast(bulkRemindSummary(result));
    if (result.sent === 0 && result.failed > 0 && result.aborted === 0) {
      // 전부 실패면 까닭 하나를 더 말해 준다 — 요약만으로는 무엇을 고쳐야 할지 모른다.
      toast(sendInterventionFailureMessage(result.lastError));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="touch"
        disabled={running}
        data-testid="remind-unsubmitted"
        onClick={() => void handleClick()}
      >
        <ClipboardList aria-hidden className="h-4 w-4" />
        {running ? '보내는 중…' : `미제출 ${targets.length}명에게 리마인드`}
      </Button>
      <span className="text-pullim-slate-500 text-2xs" data-testid="remind-targets">
        {targetPreview(targets)}
      </span>
    </div>
  );
}

/** 대상 미리보기 — 몇 명인지만 말하면 교사가 누구인지 모른다. 앞 셋은 이름으로, 나머지는 수로. */
export function targetPreview(targets: readonly ClassMemberDto[]): string {
  const names = targets.slice(0, 3).map(memberLabel);
  const rest = targets.length - names.length;
  return rest > 0 ? `${names.join(' · ')} 외 ${rest}명` : names.join(' · ');
}

/** 순차 발송 결과 + 마지막 오류(전부 실패했을 때 까닭을 한 줄 더 말하려고 든다). */
export interface SequentialResult extends BulkRemindResult {
  lastError: unknown;
}

/**
 * 한 명씩 차례로 보낸다 — 401 을 만나면 멈추고 남은 수를 `aborted` 로 돌려준다.
 * @param targets - 보낼 학생들
 * @param sendOne - 한 명에게 보내는 일(실패하면 throw)
 * @returns 보낸 수 · 실패 수 · 못 보낸 수
 */
export async function sendSequentially(
  targets: readonly ClassMemberDto[],
  sendOne: (member: ClassMemberDto) => Promise<unknown>,
): Promise<SequentialResult> {
  let sent = 0;
  let failed = 0;
  let lastError: unknown = null;
  for (let i = 0; i < targets.length; i += 1) {
    try {
      await sendOne(targets[i]);
      sent += 1;
    } catch (error) {
      lastError = error;
      if (isUnauthorized(error)) {
        return { sent, failed, aborted: targets.length - i, lastError };
      }
      failed += 1;
    }
  }
  return { sent, failed, aborted: 0, lastError };
}
