/**
 * 회수·되돌리기 — **서버가 실패하면 아무것도 성공하지 않는다.**
 *
 * 교사는 회수했다고 믿는데 학생에게는 그대로 남아 있는 상태가 제일 나쁘다
 * (`use-assignment-write.ts` 머리주석). 그래서 로컬 스토어를 건드리는 것도, 성공 토스트도,
 * 화면 이동도 전부 서버 결과 **뒤**에 온다. 이 파일이 그 순서를 건다.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RestoreButton, WithdrawButton } from '../[id]/withdraw-controls';
import type { UserAssignment } from '@/lib/store/assignments';
import type { WriteOutcome } from '../use-assignment-write';

const withdrawSpy = jest.fn();
const restoreSpy = jest.fn();
const pushSpy = jest.fn();
const successSpy = jest.fn();
let outcome: WriteOutcome = 'saved';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushSpy }) }));
jest.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => successSpy(...a) } }));
jest.mock('../use-assignment-write', () => ({
  useAssignmentWrite: () => ({ write: jest.fn(async () => outcome), isPending: false }),
}));
jest.mock('@/lib/store/assignments', () => ({
  useAssignmentStore: (pick: (s: unknown) => unknown) =>
    pick({ withdraw: withdrawSpy, restore: restoreSpy }),
}));

function make(over: Partial<UserAssignment> = {}): UserAssignment {
  return {
    id: 'as_1', botId: 'cb_001', title: '도함수 마무리', scope: 's', subject: '수학Ⅱ', grade: '고2',
    chapterFrom: 'a', chapterTo: 'b', achievementCodes: [], questionCount: 5, difficulty: '중',
    mode: 'practice', source: 'teacher-assigned', assignedBy: '수학이 형', assignedAt: '오늘',
    dueLabel: '내일 22:00', dDay: 'D-1', completedCount: 0, state: 'in-progress', solveHref: '/x',
    dispatchStatus: 'sent', targetStudentIds: [],
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    ...over,
  } as UserAssignment;
}

beforeEach(() => {
  outcome = 'saved';
  withdrawSpy.mockClear();
  restoreSpy.mockClear();
  pushSpy.mockClear();
  successSpy.mockClear();
});

describe('회수', () => {
  function openAndConfirm() {
    render(<WithdrawButton assignment={make()} submittedCount={3} targetCount={18} />);
    fireEvent.click(screen.getByTestId('assignment-withdraw-trigger'));
    fireEvent.click(screen.getByTestId('assignment-withdraw-confirm'));
  }

  it('서버가 받아 주면 로컬도 내리고 목록으로 보낸다', async () => {
    openAndConfirm();

    await waitFor(() => expect(withdrawSpy).toHaveBeenCalledWith('as_1'));
    expect(successSpy).toHaveBeenCalled();
    expect(pushSpy).toHaveBeenCalledWith('/teacher/assignment');
  });

  it('서버가 실패하면 로컬도 안 내리고 성공을 알리지 않는다', async () => {
    outcome = 'failed';

    openAndConfirm();

    await waitFor(() => expect(withdrawSpy).not.toHaveBeenCalled());
    expect(successSpy).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('비로그인 데모는 서버에 그 과제가 없다 — 로컬만 내리고 성공이다', async () => {
    outcome = 'local-only';

    openAndConfirm();

    await waitFor(() => expect(withdrawSpy).toHaveBeenCalledWith('as_1'));
    expect(successSpy).toHaveBeenCalled();
  });
});

describe('되돌리기', () => {
  it('서버가 실패하면 되돌리지 않는다', async () => {
    outcome = 'failed';
    render(<RestoreButton assignment={make({ dispatchStatus: 'withdrawn' })} />);

    fireEvent.click(screen.getByTestId('assignment-restore'));

    await waitFor(() => expect(restoreSpy).not.toHaveBeenCalled());
    expect(successSpy).not.toHaveBeenCalled();
  });

  it('마감이 지났으면 되돌리기 자체가 없다', () => {
    // `state` 가 아니라 실제 마감 시각으로 잰다 — `state` 는 낼 때 굳어서 안 움직인다.
    render(
      <RestoreButton
        assignment={make({ dispatchStatus: 'withdrawn', dueAt: new Date(Date.now() - 1000).toISOString() })}
      />,
    );

    expect(screen.queryByTestId('assignment-restore')).toBeNull();
  });
});
