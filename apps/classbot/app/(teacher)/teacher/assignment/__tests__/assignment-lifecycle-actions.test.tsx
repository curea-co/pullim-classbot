import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ApiError } from '@pullim-classbot/api-client';

import type { AssignmentAuthoringDto, AssignmentDetailDto, ClassMemberDto } from '@/lib/api/classbot-dto';
import { AssignmentLifecycleActions } from '../[id]/assignment-lifecycle-actions';

const DETAIL: AssignmentDetailDto = {
  id: 'asg_1', classId: 'cls_1', title: '수치 연습', scope: '1단원', subject: '수학', grade: '중1',
  mode: 'practice', questionCount: 1, difficulty: '중', dueLabel: '금요일', dDay: 2,
  dispatchStatus: 'sent', dispatchedAt: '2026-09-23T00:00:00.000Z', examTimeLimitMin: null,
  state: 'todo', chapterFrom: null, chapterTo: null, achievementCodes: null,
  questions: [{ id: 'q_1', order: 0, type: 'numeric', prompt: '1+1은?', options: null, autoGradable: true }],
};

const AUTHORING: AssignmentAuthoringDto = {
  id: 'asg_1', classId: 'cls_1', title: '수치 연습', scope: '1단원', subject: '수학', grade: '중1',
  mode: 'practice', questionCount: 1, difficulty: '중', dueLabel: '금요일', dDay: 2,
  dispatchStatus: 'sent', state: 'todo', chapterFrom: null, chapterTo: null, achievementCodes: null,
  examTimeLimitMin: null, targetStudentIds: ['stu_1'],
  questions: [{ order: 0, type: 'numeric', prompt: '1+1은?', answerKey: 2 }],
};

const MEMBERS: ClassMemberDto[] = [{
  membershipId: 'mem_1', memberId: 'stu_1', displayName: '김학생', enrolledAt: '', isActive: true, lastActiveAt: null,
}];

const mutateAsync = jest.fn();
const withdrawMutate = jest.fn();
const restoreMutate = jest.fn();
const refetch = jest.fn();

jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useAssignmentAuthoring: () => ({ data: AUTHORING, isPending: false, isError: false, refetch }),
  useUpdateAssignment: () => ({ mutateAsync, isPending: false }),
  useWithdrawAssignment: () => ({ mutate: withdrawMutate, isPending: false }),
  useRestoreAssignment: () => ({ mutate: restoreMutate, isPending: false }),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  AUTHORING.questions = [{ order: 0, type: 'numeric', prompt: '1+1은?', answerKey: 2 }];
  mutateAsync.mockReset().mockResolvedValue(AUTHORING);
  withdrawMutate.mockReset();
  restoreMutate.mockReset();
  refetch.mockReset();
});

it('객관식의 빈 보기를 걷을 때 고른 답의 새 위치를 다시 계산한다', async () => {
  AUTHORING.questions = [{ order: 0, type: 'mc', prompt: '고르세요', options: ['', '정답', '오답'], answerKey: 1 }];
  render(<AssignmentLifecycleActions assignment={DETAIL} members={MEMBERS} submissionCount={0} submissionsReady />);
  fireEvent.click(screen.getByRole('button', { name: '과제 수정' }));
  fireEvent.click(await screen.findByRole('button', { name: '저장' }));

  await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  expect(mutateAsync.mock.calls[0][0].patch.questions[0]).toMatchObject({
    options: ['정답', '오답'],
    answerKey: 0,
  });
});

it('객관식에서 고른 보기를 빈 값으로 지우면 저장하지 않는다', async () => {
  AUTHORING.questions = [{ order: 0, type: 'mc', prompt: '고르세요', options: ['', '다른 답'], answerKey: 0 }];
  render(<AssignmentLifecycleActions assignment={DETAIL} members={MEMBERS} submissionCount={0} submissionsReady />);
  fireEvent.click(screen.getByRole('button', { name: '과제 수정' }));
  fireEvent.click(await screen.findByRole('button', { name: '저장' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('객관식 보기와 정답');
  expect(mutateAsync).not.toHaveBeenCalled();
});

it('편집 중 제출이 생겨 409가 나면 원본과 제출을 다시 읽고 메타데이터 전용으로 전환한다', async () => {
  mutateAsync.mockRejectedValueOnce(new ApiError('제출이 존재합니다.', 409));

  function RaceHarness() {
    const [count, setCount] = useState(0);
    return (
      <AssignmentLifecycleActions
        assignment={DETAIL}
        members={MEMBERS}
        submissionCount={count}
        submissionsReady
        onConflictRefresh={() => setCount(1)}
      />
    );
  }

  render(<RaceHarness />);
  fireEvent.click(screen.getByRole('button', { name: '과제 수정' }));
  fireEvent.click(await screen.findByRole('button', { name: '저장' }));

  expect(await screen.findByText(/제출이 1건 있어 문항과 대상 학생은 잠겼어요/)).toBeInTheDocument();
  expect(refetch).toHaveBeenCalled();
});

it('제출 여부를 읽는 동안에는 수정 버튼을 열지 않는다', () => {
  render(<AssignmentLifecycleActions assignment={DETAIL} members={MEMBERS} submissionCount={0} submissionsReady={false} />);

  expect(screen.getByRole('button', { name: '과제 수정' })).toBeDisabled();
  expect(screen.getByText('제출 여부를 확인한 뒤 수정할 수 있어요.')).toBeInTheDocument();
});

it('수정판은 제목에 포커스하고 제출이 있으면 문항·대상을 잠근 채 메타데이터만 보낸다', async () => {
  render(<AssignmentLifecycleActions assignment={DETAIL} members={MEMBERS} submissionCount={1} submissionsReady />);
  fireEvent.click(screen.getByRole('button', { name: '과제 수정' }));

  const title = await screen.findByLabelText('과제명');
  await waitFor(() => expect(title).toHaveFocus());
  expect(screen.getByText(/제출이 1건 있어 문항과 대상 학생은 잠겼어요/)).toBeInTheDocument();

  fireEvent.change(title, { target: { value: '고친 과제' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  expect(mutateAsync.mock.calls[0][0]).toEqual({
    assignmentId: 'asg_1',
    patch: { title: '고친 과제', dDay: 2, dueLabel: '금요일' },
  });
});

it('수치형 정답을 비우면 0으로 바꾸지 않고 저장을 막는다', async () => {
  render(<AssignmentLifecycleActions assignment={DETAIL} members={MEMBERS} submissionCount={0} submissionsReady />);
  fireEvent.click(screen.getByRole('button', { name: '과제 수정' }));

  const answer = await screen.findByLabelText('정답');
  fireEvent.change(answer, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('수치형 정답을 확인해 주세요');
  expect(mutateAsync).not.toHaveBeenCalled();
});
