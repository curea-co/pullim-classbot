/**
 * 참여 코드 입력칸 — **보이는 대로 친 코드가 서버가 아는 형태로 나가는가.**
 *
 * 교사 화면은 코드를 `WXP-M7U` 로 보여 주고 「복사」도 붙임표째 담는데(`join-code-block.tsx`),
 * 저장된 코드에는 붙임표가 없고 정본은 정규화를 하지 않는다 — 실측(2026-09-18 dev):
 * `"WXP-M7U"` → 404 · `"WXPM7U"` → 201. 두 화면을 잇는 다리는 이 컴포넌트의 `normalizeJoinCode`
 * 한 줄뿐이라, 그 줄이 사라지면 「보이는 대로 넣으면 거절된다」가 그대로 돌아온다. 그래서
 * **mutation 이 받은 값**을 직접 단언한다(화면 값이 아니라 — 입력칸은 학생이 친 그대로 둔다).
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JoinCodeForm } from '../join-code-form';

/** `useJoinByCode` 를 대신한다 — 테스트가 읽는 것은 이것이 **받은 `code`** 하나다. */
const mutateAsync = jest.fn(async () => ({
  enrollment: {
    membershipId: 'mem_1',
    classId: 'cls_1',
    memberId: 'sub-1',
    enrolledAt: '2026-09-18T00:00:00.000Z',
  },
  className: '고2 미적분 A반',
  alreadyJoined: false,
}));
jest.mock('@/hooks/api/classroom', () => ({
  useJoinByCode: () => ({ mutateAsync, isPending: false }),
  joinFailureMessage: () => '참여하지 못했어요.',
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const input = () => screen.getByLabelText('참여 코드 입력');
const joinButton = () => screen.getByRole('button', { name: '참여' });

/** 학생이 친 그대로 넣는다 — 입력칸의 대문자화까지 실제 코드가 하게 둔다. */
function type(value: string): void {
  fireEvent.change(input(), { target: { value } });
}

beforeEach(() => {
  mutateAsync.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('JoinCodeForm — 보내는 값 정규화', () => {
  it('교사 화면에서 복사한 붙임표 코드를 그대로 쳐도 붙임표 없이 나간다', async () => {
    render(<JoinCodeForm />);
    type('WXP-M7U');
    fireEvent.click(joinButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({ code: 'WXPM7U' });
  });

  it('붙임표 대신 띄어 쓰거나 소문자로 쳐도 같은 코드 하나로 모인다', async () => {
    render(<JoinCodeForm />);
    type('  wxp m7u ');
    fireEvent.click(joinButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({ code: 'WXPM7U' });
  });

  it('붙임표 없이 친 코드는 그대로 나간다 — 정규화가 멀쩡한 입력을 건드리지 않는다', async () => {
    render(<JoinCodeForm />);
    type('AB3K9M');
    fireEvent.click(joinButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({ code: 'AB3K9M' });
  });

  it('화면의 입력값은 뺏지 않는다 — 친 글자가 붙임표째 그대로 남는다', async () => {
    render(<JoinCodeForm />);
    type('WXP-M7U');
    expect(input()).toHaveValue('WXP-M7U');

    fireEvent.click(joinButton());
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('붙임표만 친 입력은 보내지 않는다 — 지우고 나면 코드가 없다', () => {
    render(<JoinCodeForm />);
    type('  -  ');
    fireEvent.click(joinButton());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('참여 코드를 입력해 주세요.');
  });

  it('예시 문구가 교사 화면과 같은 형태다 — 학생이 옮겨 적을 것이 붙임표 있는 코드라서', () => {
    render(<JoinCodeForm />);
    expect(input()).toHaveAttribute('placeholder', '참여 코드 입력 (예: AB3-K9M)');
  });
});
