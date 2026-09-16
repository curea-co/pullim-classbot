/**
 * 과제 상세(교사) 렌더 — 정본 둘(상세 · 제출 현황)을 어떻게 그리는가. 훅은 mock 으로 세우고 화면만 본다:
 * 기다림 · 내 반이 아님(403/404) · 제출 표(점수·채점 대기·객관식 답 글자) · 빈 제출 · 운영자 아님(403) ·
 * 고치기/회수 버튼 대신 안내 한 줄 · 마감은 지금 기준.
 */
import { Suspense, type ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { ApiError } from '@pullim-classbot/api-client';
import TeacherAssignmentDetailPage from '../[id]/page';
import type { AssignmentDetailDto, SubmissionsViewDto } from '@/lib/api/classbot-dto';

type QueryState<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
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

let detailState: QueryState<AssignmentDetailDto> = ok(DETAIL);
let submissionsState: QueryState<SubmissionsViewDto[]> = ok(SUBMISSIONS);

jest.mock('@/hooks/api/assignment-dispatch', () => ({
  useAssignmentDetail: () => detailState,
  useAssignmentSubmissions: () => submissionsState,
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

it('메타·반 이름·지금 기준 마감을 그리고, 고치기/회수 버튼 대신 안내 한 줄을 둔다', async () => {
  await renderDetail();
  expect(screen.getByRole('heading', { name: '3단원 연습문제' })).toBeInTheDocument();
  expect(screen.getByText(/고2 미적분 A반 · 2문항 · 난이도 중/)).toBeInTheDocument();
  // D-3 으로 이틀 전에 냈으니 지금은 「내일」 — 굳힌 D-3 을 그대로 찍지 않는다.
  const facts = screen.getByTestId('assignment-detail-facts');
  expect(facts).toHaveTextContent('내일 (9/19 22:00)');
  expect(facts).toHaveTextContent('진행 중');
  expect(facts).not.toHaveTextContent('D-3');

  expect(screen.getByTestId('assignment-edit-unavailable')).toHaveTextContent('고치거나 회수하는 기능은 아직');
  expect(screen.queryByRole('link', { name: /고치기/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /회수/ })).toBeNull();
  expect(screen.queryByText('회수됨')).toBeNull();
});

it('제출 표 — 학생 식별자는 앞 여덟 글자, 점수·채점 대기 칩, 객관식 답은 고른 보기 글자로', async () => {
  await renderDetail();
  const list = screen.getByTestId('submissions-list');
  const rows = within(list).getAllByRole('listitem').filter((li) => li.dataset.testid?.startsWith('submission-row-'));
  expect(rows).toHaveLength(2);

  const first = screen.getByTestId('submission-row-sub-student-0001');
  expect(first).toHaveTextContent('sub-stud…');
  expect(within(first).getByTitle('sub-student-0001')).toBeInTheDocument();
  expect(first).toHaveTextContent('80점');
  // 문항은 서버 order 로 정렬 — 1. 객관식(고른 보기 글자) · 2. 서술형(값 그대로)
  expect(first).toHaveTextContent('1.다음 중 옳은 것은?2번 · 나');
  expect(first).toHaveTextContent('2.설명하시오증발');

  const second = screen.getByTestId('submission-row-sub-student-0002');
  expect(second).toHaveTextContent('채점 대기');
  expect(second).toHaveTextContent('1번 · 가');
  expect(second).toHaveTextContent('2.설명하시오—');
});

it('KPI — 반 참여는 반 카드의 인원, 제출·채점됨·평균은 제출 현황에서 센다', async () => {
  await renderDetail();
  const kpi = (label: string) => screen.getByText(label).closest('li')!.textContent ?? '';
  expect(kpi('반 참여')).toContain('12명');
  expect(kpi('제출')).toContain('2명');
  expect(kpi('채점됨')).toContain('1명');
  expect(kpi('평균 점수')).toContain('80점');
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
