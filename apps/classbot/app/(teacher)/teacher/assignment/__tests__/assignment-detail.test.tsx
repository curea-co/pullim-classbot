/**
 * 과제 상세(교사) 렌더 — 정본 셋(상세 · 제출 현황 · 반 명단)을 어떻게 그리는가. 훅은 mock 으로 세우고 화면만 본다:
 * 기다림 · 내 반이 아님(403/404) · 제출 표(**명단 조인한 이름** · 점수·채점 대기·객관식 답 글자) · 빈 제출 ·
 * 운영자 아님(403) · 고치기/회수 버튼 대신 안내 한 줄 · 마감은 지금 기준.
 *
 * 이름 조인은 **세 갈래를 전부** 본다 — 명단에서 찾음 / 명단에 없음(「알 수 없는 학생」) / 명단을 못 읽음(sub 앞 여덟 자).
 * 셋을 하나로 뭉치면 「이름을 모른다」와 「명단에 없다」가 같은 말이 된다.
 */
import { Suspense, type ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import TeacherAssignmentDetailPage from '../[id]/page';
import type { AssignmentDetailDto, ClassDto, ClassMemberDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';

type QueryState<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  isSuccess?: boolean;
};
const ok = <T,>(data: T): QueryState<T> => ({ data, isPending: false, isError: false, error: null, refetch: jest.fn() });
const pending = <T,>(): QueryState<T> => ({ data: undefined, isPending: true, isError: false, error: null, refetch: jest.fn() });
const failed = <T,>(status: number, message = 'nope'): QueryState<T> => ({
  data: undefined, isPending: false, isError: true, error: new ApiError(message, status), refetch: jest.fn(),
});

const DAY = 86_400_000;
/** 이틀 전에 D-3 으로 낸 과제 — 지금 기준으로는 「내일」이어야 한다. */
const DETAIL: AssignmentDetailDto = {
  id: 'asg_1', classId: 'cls_1', title: '3단원 연습문제', scope: '3단원', subject: '수학Ⅱ', grade: '고2',
  mode: 'practice', questionCount: 2, difficulty: '중', dueLabel: '9/19 22:00', dDay: 3, dispatchStatus: 'sent',
  dispatchedAt: new Date(Date.now() - 2 * DAY).toISOString(), examTimeLimitMin: null, state: 'todo',
  chapterFrom: null, chapterTo: null, achievementCodes: null,
  questions: [
    { id: 'q_2', order: 1, type: 'essay', prompt: '설명하시오', options: null, autoGradable: false },
    { id: 'q_1', order: 0, type: 'mc', prompt: '다음 중 옳은 것은?', options: ['가', '나'], autoGradable: true },
  ],
};
const SUBMISSIONS: SubmissionsViewDto[] = [
  { submissionId: 'sub_1', studentId: 'sub-student-0001', scorePercent: 80, gradedAt: '2026-09-16T09:00:00.000Z', submittedAt: '2026-09-16T09:00:00.000Z', answers: { q_1: 1, q_2: '증발' } },
  { submissionId: 'sub_2', studentId: 'sub-student-0002', scorePercent: null, gradedAt: null, submittedAt: '2026-09-16T10:00:00.000Z', answers: { q_1: 0 } },
];

const member = (over: Partial<ClassMemberDto> & Pick<ClassMemberDto, 'memberId'>): ClassMemberDto => ({
  membershipId: `mem_${over.memberId}`, displayName: null, enrolledAt: '2026-09-01T00:00:00.000Z',
  isActive: true, lastActiveAt: null, ...over,
});
/** 활성 셋(낸 둘 + 안 낸 하나) + 비활성 하나 — 「반 참여」는 활성만 센다. */
const MEMBERS: ClassMemberDto[] = [
  member({ memberId: 'sub-student-0001', displayName: '김풀림' }),
  member({ memberId: 'sub-student-0002', displayName: null }),
  member({ memberId: 'sub-student-0003', displayName: '박풀림' }),
  member({ memberId: 'sub-student-0009', displayName: '나간학생', isActive: false }),
];

/** 명단 훅은 화면이 `data` 와 `isSuccess` 만 읽는다 — 제출 훅의 `ok()` 와 섞지 않는다(그쪽에 `isSuccess` 를
 *  붙이면 리마인드 버튼이 서면서 mock 하지 않은 발송 훅까지 딸려 온다). */
type MembersState = { data: ClassMemberDto[] | undefined; isSuccess: boolean };
const membersOk = (data: ClassMemberDto[]): MembersState => ({ data, isSuccess: true });
const membersUnread = (): MembersState => ({ data: undefined, isSuccess: false });

let detailState: QueryState<AssignmentDetailDto> = ok(DETAIL);
let submissionsState: QueryState<SubmissionsViewDto[]> = ok(SUBMISSIONS);
let membersState: MembersState = membersOk(MEMBERS);
const ACTIVE_CLASS: ClassDto = {
  id: 'cls_1', operatorId: 'teacher_1', orgId: null, name: '고2 미적분 A반', description: null,
  subject: '수학Ⅱ', grade: '고2', isActive: true, isSelfStudy: false, bot: null, joinCode: null,
  createdAt: '', updatedAt: '',
};
let classState: QueryState<ClassDto> = { ...ok(ACTIVE_CLASS), isSuccess: true };

jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useAssignmentDetail: () => detailState,
  useAssignmentSubmissions: () => submissionsState,
  useAssignmentAuthoring: () => ({ data: undefined, isPending: true, isError: false, refetch: jest.fn() }),
  useUpdateAssignment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useWithdrawAssignment: () => ({ mutate: jest.fn(), isPending: false }),
  useRestoreAssignment: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/hooks/api/classroom', () => ({
  ...jest.requireActual('@/hooks/api/classroom'),
  useOperatorClasses: () => ({
    data: [{
      id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher',
      profile: {
        subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '🤖',
        quickPrompts: [], enrolledCount: 12, isLive: false, currentLesson: null,
      },
    }],
    isPending: false, isError: false, error: null,
  }),
  useClassMembers: () => membersState,
  useClassDetail: () => classState,
}));
jest.mock('../[id]/remind-unsubmitted', () => ({
  RemindUnsubmitted: () => <div data-testid="remind-unsubmitted" />,
}));

function Wrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p data-testid="suspense" />}>{children}</Suspense>;
}

async function renderDetail(id = 'asg_1') {
  await act(async () => {
    render(<Wrap><TeacherAssignmentDetailPage params={Promise.resolve({ id })} /></Wrap>);
  });
}

beforeEach(() => {
  detailState = ok(DETAIL);
  submissionsState = ok(SUBMISSIONS);
  membersState = membersOk(MEMBERS);
  classState = { ...ok(ACTIVE_CLASS), isSuccess: true };
});

it('보관된 반 과제는 정확한 반 이름과 읽기 전용 안내만 보이고 변경·리마인드를 막는다', async () => {
  classState = { ...ok({ ...ACTIVE_CLASS, name: '지난 미적분반', isActive: false }), isSuccess: true };
  submissionsState = { ...ok(SUBMISSIONS), isSuccess: true };
  await renderDetail();

  expect(screen.getByText(/지난 미적분반 · 2문항/)).toBeInTheDocument();
  expect(screen.getByText(/보관된 반의 과제는 읽기 전용/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '과제 수정' })).toBeNull();
  expect(screen.queryByRole('button', { name: '과제 회수' })).toBeNull();
  expect(screen.queryByTestId('remind-unsubmitted')).toBeNull();
});

it('과제는 남았지만 반이 404면 변경을 막고 반 부재를 정확히 안내한다', async () => {
  classState = failed(404);
  await renderDetail();

  expect(screen.getByText(/반을 찾을 수 없어 과제를 변경할 수 없어요/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '과제 수정' })).toBeNull();
  expect(screen.queryByRole('button', { name: '과제 회수' })).toBeNull();
});

it('회수한 과제에는 미제출 리마인드를 보여주지 않는다', async () => {
  detailState = ok({ ...DETAIL, dispatchStatus: 'withdrawn' });
  submissionsState = { ...ok(SUBMISSIONS), isSuccess: true };
  await renderDetail();

  expect(screen.getByText('회수됨')).toBeInTheDocument();
  expect(screen.queryByTestId('remind-unsubmitted')).toBeNull();
});

it('상세가 도는 동안은 기다린다', async () => {
  detailState = pending();
  await renderDetail();
  expect(screen.getByTestId('assignment-detail-loading')).toBeInTheDocument();
});

it('403·404 는 「내 반의 과제가 아니다」 한 카드다 — 5xx 는 다시 시도', async () => {
  detailState = failed(403);
  await renderDetail();
  expect(screen.getByText('이 과제를 찾지 못했어요')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '낸 과제로' })).toHaveAttribute('href', '/teacher/assignment');
});

it('5xx 는 404 로 덮지 않고 다시 시도할 수 있는 오류다', async () => {
  detailState = failed(500);
  await renderDetail();
  expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
});

it('메타·반 이름·지금 기준 마감을 그리고, 수정·회수 동작을 연다', async () => {
  await renderDetail();
  expect(screen.getByRole('heading', { name: '3단원 연습문제' })).toBeInTheDocument();
  expect(screen.getByText(/고2 미적분 A반 · 2문항 · 난이도 중/)).toBeInTheDocument();
  // D-3 으로 이틀 전에 냈으니 지금은 「내일」 — 굳힌 D-3 을 그대로 찍지 않는다.
  const facts = screen.getByTestId('assignment-detail-facts');
  expect(facts).toHaveTextContent('내일 (9/19 22:00)');
  expect(facts).toHaveTextContent('진행 중');
  expect(facts).not.toHaveTextContent('D-3');

  expect(screen.getByRole('button', { name: '과제 수정' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '과제 회수' })).toBeInTheDocument();
  expect(screen.queryByText('회수됨')).toBeNull();
});

it('제출 표 — 학생은 반 명단의 표시명으로 부르고, 점수·채점 대기 칩, 객관식 답은 고른 보기 글자로', async () => {
  await renderDetail();
  const list = screen.getByTestId('submissions-list');
  const rows = within(list).getAllByRole('listitem').filter((li) => li.dataset.testid?.startsWith('submission-row-'));
  expect(rows).toHaveLength(2);

  const first = screen.getByTestId('submission-row-sub-student-0001');
  expect(first).toHaveTextContent('김풀림');
  expect(first).not.toHaveTextContent('sub-stud…');
  // 이름이 보여도 전체 sub 는 title 로 남는다 — 문의할 때 옮겨 적는 값이다.
  expect(within(first).getByTitle('sub-student-0001')).toBeInTheDocument();
  expect(first).toHaveTextContent('80점');
  // 문항은 서버 order 로 정렬 — 1. 객관식(고른 보기 글자) · 2. 서술형(값 그대로)
  expect(first).toHaveTextContent('1.다음 중 옳은 것은?2번 · 나');
  expect(first).toHaveTextContent('2.설명하시오증발');

  // 명단에는 있는데 표시명이 비면(탈퇴·부재 투영) 지어내지 않는다 — 반 상세 명단과 같은 말.
  const second = screen.getByTestId('submission-row-sub-student-0002');
  expect(second).toHaveTextContent('이름 없음 sub-stud');
  expect(second).toHaveTextContent('채점 대기');
  expect(second).toHaveTextContent('1번 · 가');
  expect(second).toHaveTextContent('2.설명하시오—');

  expect(screen.getByTestId('roster-join-note')).toHaveTextContent('학생 이름은 반 명단에서 가져왔어요');
});

it('명단에 없는 sub 는 uuid 로 두지 않고 「알 수 없는 학생」으로 떨어진다', async () => {
  submissionsState = ok([
    { submissionId: 'sub_9', studentId: '701078b7-1c9e-4a4e-9a2f-000000000000', scorePercent: 50, gradedAt: null, submittedAt: '2026-09-16T11:00:00.000Z', answers: {} },
  ]);
  await renderDetail();
  const row = screen.getByTestId('submission-row-701078b7-1c9e-4a4e-9a2f-000000000000');
  expect(row).toHaveTextContent('알 수 없는 학생 701078b7…');
  expect(within(row).getByTitle('701078b7-1c9e-4a4e-9a2f-000000000000')).toBeInTheDocument();
});

it('명단을 못 읽으면 종전대로 sub 앞 여덟 자다 — 있는 학생을 「알 수 없는」으로 만들지 않는다', async () => {
  membersState = membersUnread();
  await renderDetail();
  const first = screen.getByTestId('submission-row-sub-student-0001');
  expect(first).toHaveTextContent('sub-stud…');
  expect(first).not.toHaveTextContent('알 수 없는 학생');
  expect(screen.getByTestId('roster-join-note')).toHaveTextContent('반 명단을 읽지 못해');
});

it('KPI — 반 참여는 명단의 활성 인원, 제출·채점됨·평균은 제출 현황에서 센다', async () => {
  await renderDetail();
  const kpi = (label: string) => screen.getByText(label).closest('li')!.textContent ?? '';
  // 명단 활성 셋. 반 카드 프로필의 12 가 아니다 — 그 수는 옛 `class_bot_profiles` 투영이라 실측이 아니다.
  expect(kpi('반 참여')).toContain('3명');
  expect(kpi('제출')).toContain('2명');
  expect(kpi('채점됨')).toContain('1명');
  expect(kpi('평균 점수')).toContain('80점');
});

it('KPI — 명단을 못 읽으면 반 참여는 반 카드의 수로 떨어진다', async () => {
  membersState = membersUnread();
  await renderDetail();
  expect(screen.getByText('반 참여').closest('li')!.textContent).toContain('12명');
});

it('아직 낸 학생이 없으면 빈 상태다', async () => {
  submissionsState = ok([]);
  await renderDetail();
  expect(screen.getByText('아직 낸 학생이 없어요')).toBeInTheDocument();
});

it('제출 현황 403 은 「운영자만」이라고 말한다 — 상세는 그대로 보인다', async () => {
  submissionsState = failed(403);
  await renderDetail();
  expect(screen.getByRole('heading', { name: '3단원 연습문제' })).toBeInTheDocument();
  expect(screen.getByTestId('submissions-error')).toHaveTextContent('이 반의 운영자만');
});
