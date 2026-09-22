/**
 * 과제 상세 「미제출 학생에게 리마인드」 — 대상 계산 · 순차 발송 · 요약(계획 PR 5c).
 *
 * 못박는 것: 명단을 못 읽으면 **버튼이 없는** 것 · 대상이 「명단 − 제출자」인 것 · 학생마다 요청이 **하나씩** 가는 것
 * (bulk 는 원자적이라 한 명이 나머지를 끌고 내려간다) · 401 을 만나면 **그 자리에서 멈추는** 것 · 요약이 부분 성공을
 * 갈라 말하는 것.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { ClassMemberDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';
import { RemindUnsubmitted, sendSequentially, targetPreview } from '../[id]/remind-unsubmitted';

let members: ClassMemberDto[] = [];
let membersOk = true;
jest.mock('@/hooks/api/classroom', () => ({
  useClassMembers: () => ({ data: membersOk ? members : undefined, isSuccess: membersOk }),
}));

const mutateAsync = jest.fn();
jest.mock('@/hooks/api/intervention', () => ({
  ...jest.requireActual('@/hooks/api/intervention'),
  useSendInterventions: () => ({ mutateAsync }),
}));

const toasts: string[] = [];
jest.mock('sonner', () => ({ toast: (msg: string) => toasts.push(msg) }));

function member(memberId: string, over: Partial<ClassMemberDto> = {}): ClassMemberDto {
  return {
    membershipId: `mem_${memberId}`, memberId, displayName: `학생${memberId}`,
    enrolledAt: '2026-09-10T00:00:00.000Z', isActive: true, lastActiveAt: null, ...over,
  };
}
function submission(studentId: string): SubmissionsViewDto {
  return {
    submissionId: `sub_${studentId}`, studentId, scorePercent: null, gradedAt: null,
    submittedAt: '2026-09-16T09:00:00.000Z', answers: {},
  };
}

function renderBlock(submissions: SubmissionsViewDto[]) {
  return render(
    <RemindUnsubmitted classId="cls_1" assignmentId="asg_1" assignmentTitle="3단원 연습문제" submissions={submissions} />,
  );
}

beforeEach(() => {
  members = [member('s1'), member('s2'), member('s3')];
  membersOk = true;
  mutateAsync.mockReset().mockResolvedValue([{ id: 'itv_1' }]);
  toasts.length = 0;
});

it('명단을 못 읽으면 버튼을 감춘다 — 대상이 누구인지 모르는 채로 보내지 않는다', () => {
  membersOk = false;
  const { container } = renderBlock([]);
  expect(container.firstChild).toBeNull();
});

it('대상은 명단 − 제출자다 — 이름 미리보기까지 보여 준다', () => {
  renderBlock([submission('s2')]);
  expect(screen.getByTestId('remind-unsubmitted').textContent).toContain('미제출 2명');
  expect(screen.getByTestId('remind-targets').textContent).toBe('학생s1 · 학생s3');
});

it('모두 냈으면 버튼 대신 그 사실을 말한다', () => {
  renderBlock([submission('s1'), submission('s2'), submission('s3')]);
  expect(screen.queryByTestId('remind-unsubmitted')).toBeNull();
  expect(screen.getByTestId('remind-none')).toBeTruthy();
});

it('학생마다 요청이 하나씩 간다 — 본문에 그 학생과 이 과제가 실린다', async () => {
  renderBlock([submission('s3')]);
  await act(async () => {
    screen.getByTestId('remind-unsubmitted').click();
  });

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
  expect(mutateAsync.mock.calls.map((c) => c[0].events[0].studentId)).toEqual(['s1', 's2']);
  const first = mutateAsync.mock.calls[0][0];
  expect(first.classId).toBe('cls_1');
  expect(first.events[0].type).toBe('remind');
  expect(first.events[0].assignmentId).toBe('asg_1');
  expect(first.events[0].message).toContain('3단원 연습문제');
  await waitFor(() => expect(toasts[0]).toBe('2명에게 리마인드를 보냈어요.'));
});

it('한 명이 실패해도 나머지는 간다 — 요약이 부분 성공을 말한다', async () => {
  mutateAsync
    .mockRejectedValueOnce(new ApiError('nope', 400))
    .mockResolvedValue([{ id: 'itv_1' }]);
  renderBlock([]);
  await act(async () => {
    screen.getByTestId('remind-unsubmitted').click();
  });
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(toasts[0]).toBe('2명에게 보냈고, 1명은 보내지 못했어요.'));
});

describe('sendSequentially', () => {
  const targets = [member('s1'), member('s2'), member('s3')];

  it('전부 성공', async () => {
    expect(await sendSequentially(targets, () => Promise.resolve())).toMatchObject({ sent: 3, failed: 0, aborted: 0 });
  });

  it('401 이면 그 자리에서 멈추고 남은 수를 돌려준다 — 리다이렉트를 세 번 걸지 않는다', async () => {
    const sendOne = jest.fn((m: ClassMemberDto) =>
      m.memberId === 's2' ? Promise.reject(new ApiError('unauthorized', 401)) : Promise.resolve(),
    );
    const result = await sendSequentially(targets, sendOne);
    expect(result).toMatchObject({ sent: 1, failed: 0, aborted: 2 });
    expect(sendOne).toHaveBeenCalledTimes(2);
  });
});

describe('targetPreview', () => {
  it('앞 셋은 이름으로, 나머지는 수로', () => {
    expect(targetPreview([member('s1'), member('s2')])).toBe('학생s1 · 학생s2');
    expect(targetPreview([member('s1'), member('s2'), member('s3'), member('s4')])).toBe(
      '학생s1 · 학생s2 · 학생s3 외 1명',
    );
  });
});
