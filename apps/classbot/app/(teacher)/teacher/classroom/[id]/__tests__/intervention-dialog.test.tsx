/**
 * 명단 줄 끝 「리마인드」·「코멘트」 → 개입 판(계획 PR 5c · `../intervention-dialog.tsx`).
 *
 * 명단 표부터 눌러 들어간다 — 버튼이 실제로 그 학생의 판을 여는지까지 한 번에 본다.
 *
 * 못박는 것: 비활성 멤버에게는 버튼이 없는 것 · 리마인드는 기본 문구가 채워져 오고 코멘트는 빈칸인 것 ·
 * **둘 다 과제를 싣는 것**(정본 불변식 — 비-crisis 는 `assignmentId` 필수) · **나간 과제(`sent`)만 고를 수 있는 것**
 * (서버는 same-class 만 보므로 draft·withdrawn 도 201 이 난다 — 학생이 열 수 없는 자리로 보내지 않게 화면이 막는다) ·
 * 과제를 바꾸면 손대지 않은 기본 문구가 따라 바뀌는 것 · 고를 과제가 없는 두 갈래를 갈라 말하는 것 ·
 * 실패 문구가 폼 아래 서는 것.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import type { AssignmentSummaryDto, ClassMemberDto } from '@/lib/api/classbot-dto';
import { ClassroomRoster } from '../classroom-roster';
import { classAssignmentCount, classAssignmentOptions } from '../intervention-dialog';

let members: ClassMemberDto[] = [];
jest.mock('@/hooks/api/classroom', () => ({
  useClassMembers: () => ({
    data: members, isPending: false, isSuccess: true, isError: false, error: null, refetch: jest.fn(),
  }),
}));

let assignments: AssignmentSummaryDto[] = [];
let assignmentsPending = false;
jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useTeacherAssignments: () => ({ data: assignments, isPending: assignmentsPending }),
}));

type Handlers = { onSuccess: () => void; onError: (e: unknown) => void };
/** 다음 발송이 어떻게 끝나는지 — 테스트가 갈아 끼운다. */
let sendOutcome: { error: unknown } | null = null;
const sendMutate = jest.fn((_vars: unknown, handlers?: Handlers) => {
  if (!handlers) return;
  if (sendOutcome) handlers.onError(sendOutcome.error);
  else handlers.onSuccess();
});
jest.mock('@/hooks/api/intervention', () => ({
  ...jest.requireActual('@/hooks/api/intervention'),
  useSendInterventions: () => ({ mutate: sendMutate, isPending: false }),
}));

const toasts: string[] = [];
jest.mock('sonner', () => ({ toast: (msg: string) => toasts.push(msg) }));

function member(memberId: string, over: Partial<ClassMemberDto> = {}): ClassMemberDto {
  return {
    membershipId: `mem_${memberId}`, memberId, displayName: `학생${memberId}`,
    enrolledAt: '2026-09-10T00:00:00.000Z', isActive: true, lastActiveAt: null, ...over,
  };
}
function assignment(id: string, over: Partial<AssignmentSummaryDto> = {}): AssignmentSummaryDto {
  return {
    id, classId: 'cls_1', title: `${id} 과제`, scope: '3단원', subject: '수학Ⅱ', grade: '고2', mode: 'practice',
    questionCount: 2, difficulty: '중', dueLabel: '9/19 22:00', dDay: 2, dispatchStatus: 'sent',
    dispatchedAt: '2026-09-16T08:00:00.000Z', examTimeLimitMin: null, state: 'todo',
    chapterFrom: null, chapterTo: null, achievementCodes: null, ...over,
  };
}

function renderRoster() {
  return render(<ClassroomRoster classId="cls_1" classroomName="고2 미적분 A반" />);
}
const messageBox = () => screen.getByTestId('intervention-message') as HTMLTextAreaElement;
const sentEvent = () => sendMutate.mock.calls[0][0] as {
  classId: string;
  events: { type: string; studentId: string; assignmentId: string; message: string }[];
};

beforeEach(() => {
  members = [member('s1'), member('s2', { isActive: false, displayName: null })];
  assignments = [assignment('asg_1', { title: '3단원 연습문제' })];
  assignmentsPending = false;
  sendOutcome = null;
  sendMutate.mockClear();
  toasts.length = 0;
});

it('활성 멤버에게만 버튼이 선다 — 서버가 비활성 대상을 400 으로 막는다', () => {
  renderRoster();
  expect(screen.getByTestId('intervention-remind-s1')).toBeTruthy();
  expect(screen.getByTestId('intervention-comment-s1')).toBeTruthy();
  expect(screen.queryByTestId('intervention-remind-s2')).toBeNull();
});

it('리마인드 — 기본 문구가 채워져 오고, 그대로 보내면 과제까지 실려 간다', () => {
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));
  expect(screen.getByTestId('intervention-dialog').textContent).toContain('학생s1 학생에게 리마인드');
  expect(messageBox().value).toContain('3단원 연습문제');

  fireEvent.submit(screen.getByTestId('intervention-send').closest('form')!);
  expect(sentEvent().classId).toBe('cls_1');
  expect(sentEvent().events).toEqual([
    {
      type: 'remind',
      studentId: 's1',
      assignmentId: 'asg_1',
      message: sentEvent().events[0].message,
    },
  ]);
  expect(sentEvent().events[0].message).toContain('3단원 연습문제');
  expect(toasts[0]).toBe('학생s1 학생에게 리마인드를 보냈어요.');
});

it('코멘트 — 빈칸에서 시작하고, 비면 못 보낸다. 적으면 과제와 함께 간다', () => {
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-comment-s1'));
  expect(messageBox().value).toBe('');
  expect((screen.getByTestId('intervention-send') as HTMLButtonElement).disabled).toBe(true);

  fireEvent.change(messageBox(), { target: { value: '  오답 정리가 좋았어요  ' } });
  fireEvent.submit(screen.getByTestId('intervention-send').closest('form')!);
  expect(sentEvent().events[0]).toEqual({
    type: 'comment', studentId: 's1', assignmentId: 'asg_1', message: '오답 정리가 좋았어요',
  });
});

it('과제를 바꾸면 손대지 않은 기본 문구가 따라 바뀐다 — 고친 뒤에는 그대로 둔다', () => {
  assignments = [assignment('asg_1', { title: '3단원 연습문제' }), assignment('asg_2', { title: '4단원 쪽지' })];
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));

  fireEvent.change(screen.getByTestId('intervention-assignment'), { target: { value: 'asg_2' } });
  expect(messageBox().value).toContain('4단원 쪽지');

  fireEvent.change(messageBox(), { target: { value: '내가 쓴 말' } });
  fireEvent.change(screen.getByTestId('intervention-assignment'), { target: { value: 'asg_1' } });
  expect(messageBox().value).toBe('내가 쓴 말');
});

it('이 반에 낸 과제가 없으면 못 보낸다고 말하고 보내기가 잠긴다', () => {
  assignments = [assignment('asg_9', { classId: 'cls_other' })];
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));
  expect(screen.getByTestId('intervention-no-assignment').textContent).toContain('낸 과제가 아직 없어요');
  expect(screen.queryByTestId('intervention-message')).toBeNull();
  expect((screen.getByTestId('intervention-send') as HTMLButtonElement).disabled).toBe(true);
});

it('아직 안 나간 과제는 고를 수 없다 — 학생이 열 수 없는 자리로 리마인드를 보내지 않는다', () => {
  // 서버 불변식은 same-class 만 본다(`assertAssignmentInClass`) — draft·withdrawn 을 실어도 201 이다.
  // 그래서 화면이 막는다. 「하나도 없다」와 「있지만 아직 안 나갔다」는 다음에 할 일이 다르니 갈라 말한다.
  assignments = [
    assignment('asg_draft', { dispatchStatus: 'draft', dispatchedAt: null }),
    assignment('asg_gone', { dispatchStatus: 'withdrawn' }),
    assignment('asg_soon', { dispatchStatus: 'scheduled' }),
  ];
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));
  expect(screen.getByTestId('intervention-no-assignment').textContent).toContain('학생에게 나가지 않았어요');
  expect(screen.queryByTestId('intervention-assignment')).toBeNull();
  expect((screen.getByTestId('intervention-send') as HTMLButtonElement).disabled).toBe(true);
});

it('나간 과제만 고르개에 실린다 — 섞여 있으면 나간 것만 남는다', () => {
  assignments = [
    assignment('asg_draft', { title: '초안', dispatchStatus: 'draft', dispatchedAt: null }),
    assignment('asg_sent', { title: '나간 과제', dispatchStatus: 'sent' }),
  ];
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));
  const options = Array.from(
    (screen.getByTestId('intervention-assignment') as HTMLSelectElement).options,
  ).map((o) => o.value);
  expect(options).toEqual(['asg_sent']);
  expect(messageBox().value).toContain('나간 과제');
});

it('실패하면 폼 아래에 까닭이 선다 — 판은 닫히지 않는다', () => {
  sendOutcome = { error: new ApiError('nope', 403) };
  renderRoster();
  fireEvent.click(screen.getByTestId('intervention-remind-s1'));
  fireEvent.submit(screen.getByTestId('intervention-send').closest('form')!);
  expect(screen.getByTestId('intervention-error').textContent).toBe('이 반의 운영 교사만 보낼 수 있어요.');
  expect(screen.getByTestId('intervention-dialog')).toBeTruthy();
});

describe('classAssignmentOptions · classAssignmentCount', () => {
  const rows = [
    assignment('a1', { dispatchedAt: '2026-09-10T00:00:00.000Z' }),
    assignment('a2', { dispatchStatus: 'draft', dispatchedAt: null }),
    assignment('a3', { dispatchedAt: '2026-09-16T00:00:00.000Z' }),
    assignment('a4', { classId: 'cls_other', dispatchedAt: '2026-09-17T00:00:00.000Z' }),
    assignment('a5', { dispatchStatus: 'withdrawn', dispatchedAt: '2026-09-17T00:00:00.000Z' }),
  ];

  it('이 반의 나간 것만, 최근에 낸 것이 위', () => {
    expect(classAssignmentOptions(rows, 'cls_1').map((a) => a.id)).toEqual(['a3', 'a1']);
  });

  it('센 것은 상태를 안 가린다 — 「없다」와 「안 나갔다」를 가르는 데 쓴다', () => {
    expect(classAssignmentCount(rows, 'cls_1')).toBe(4);
    expect(classAssignmentCount(rows, 'cls_none')).toBe(0);
  });
});
