/**
 * 결과 화면이 무엇을 말하는가 — 「내 제출」에 대해 **넷**으로 갈린다(pullim-api #681).
 *
 * 화면째 갈리는 갈래가 하나 있다: 서버가 「안 냈다」고 말하면 결과 화면 전체가 거짓말이 되므로
 * (머리줄 「제출 완료 · 수고했어요」 · 「낸 답과 점수는 선생님 화면으로 가요」) 점수 칸이 아니라
 * 화면이 갈린다. 나머지 셋은 점수 칸 안에서 갈린다.
 *
 * 여기서 못박는 것:
 *  1. 칸이 없다(옛 서버) → 「모른다」. **「안 냈어요」라고 말하지 않는다**
 *  2. `false` → 결과 화면이 아니라 「아직 내지 않은 과제」 + 풀이로 가는 길 하나
 *  3. `true` + `scorePercent: 0` → **0점을 그린다**(「점수 없음」이 아니다)
 *  4. `true` + `scorePercent: null` → 미채점
 */

import { Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import ResultPage from '../page';
import type { VisibleAssignmentRow } from '../../../use-assignment-reads';
import { useSubmissionResultStore } from '@/lib/store/submission-result';

/* 교사 한마디는 별건 문(인박스)을 읽는다 — 이 화면의 판정과 무관하므로 비운다. */
jest.mock('@/components/classbot/teacher-comment-card', () => ({
  TeacherCommentCard: () => null,
}));

jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyRooms: () => ({
    rooms: [{ bot: { id: 'cls_1', name: '수학이 형' }, enrollment: {}, source: 'api' }],
    isLoading: false,
    isError: false,
    retry: jest.fn(),
  }),
}));

/** 서버 단건 조회 — 테스트마다 갈아 끼운다. `mySubmissionOf` 는 실물을 쓴다(이 화면의 판정이 그 함수다). */
let row: VisibleAssignmentRow;
jest.mock('../../../use-assignment-reads', () => ({
  ...jest.requireActual('../../../use-assignment-reads'),
  useVisibleAssignment: () => ({
    data: row,
    isLoading: false,
    isError: false,
    isUnauthenticated: false,
    isNotFound: false,
    refetch: jest.fn(),
  }),
}));

/** 세 칸을 뺀 행 — 나머지는 어느 갈래에서도 같다. */
function baseRow(): Omit<VisibleAssignmentRow, 'submitted' | 'submittedAt' | 'scorePercent'> {
  return {
    id: 'asg_1',
    botId: 'cls_1',
    studentId: null,
    title: '3단원 연습문제',
    scope: '3단원',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '',
    chapterTo: '',
    achievementCodes: [],
    questionCount: 2,
    difficulty: '중',
    mode: 'practice',
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '',
    assignedAtLabel: '2026-09-18 17:30',
    dueLabel: '내일 22:00',
    dDay: '내일',
    completedCount: 0,
    recentAccuracy: null,
    state: 'todo',
    reasonHint: null,
    solveHref: '/classbot/assignment/asg_1/solve?step=1',
    questions: [
      { id: 'q_a', order: 0, type: 'mc', prompt: '첫 번째', options: ['가', '나'], autoGradable: true },
      { id: 'q_b', order: 1, type: 'short', prompt: '두 번째', options: null, autoGradable: true },
    ],
  };
}

beforeEach(() => {
  useSubmissionResultStore.setState({ results: {} });
});

/** `params` 가 Promise 라 `use()` 가 한 번 멈춘다 — Suspense 밖에서 render 하면 본문이 비어 있다. */
async function renderResult() {
  await act(async () => {
    render(
      <Suspense fallback={<p data-testid="suspense" />}>
        <ResultPage params={Promise.resolve({ id: 'asg_1' })} />
      </Suspense>,
    );
  });
}

it('세 칸이 없으면(옛 서버) 「모른다」로 선다 — 「안 냈다」고 말하지 않는다', async () => {
  // 매핑을 거친 행이라 키 없음은 `null` 로 떨어져 있다(`toAssignmentReadRow`).
  row = { ...baseRow(), submitted: null, submittedAt: null, scorePercent: null };
  await renderResult();

  expect(await screen.findByTestId('result-missing')).toBeInTheDocument();
  expect(screen.queryByTestId('result-not-submitted')).not.toBeInTheDocument();
  expect(screen.queryByTestId('result-score')).not.toBeInTheDocument();
  // 이 갈래는 여전히 결과 화면이다 — 머리줄이 「제출 완료」로 서는 것이 #681 이전 그림 그대로다.
  expect(screen.getByText('제출 완료')).toBeInTheDocument();
});

it('false(서버가 「안 냈다」고 말했다)면 결과 화면이 아니라 「아직 내지 않은 과제」다', async () => {
  row = { ...baseRow(), submitted: false, submittedAt: null, scorePercent: null };
  await renderResult();

  expect(await screen.findByTestId('result-not-submitted')).toBeInTheDocument();
  expect(screen.getByText('아직 내지 않은 과제예요')).toBeInTheDocument();
  // 한 화면이 두 말을 하지 않는다 — 축하 머리줄·「낸 답과 점수는 선생님 화면으로」가 함께 서면 안 된다.
  expect(screen.queryByText('제출 완료')).not.toBeInTheDocument();
  expect(screen.queryByText(/낸 답과 점수는 선생님 화면으로/)).not.toBeInTheDocument();
  expect(screen.queryByTestId('result-missing')).not.toBeInTheDocument();
  // 나가는 길은 풀이 화면 하나.
  expect(screen.getByRole('link', { name: '지금 풀기 시작하기' })).toHaveAttribute(
    'href',
    '/classbot/assignment/asg_1/solve?step=1',
  );
});

it('true + scorePercent 0 은 **0점**을 그린다 — 「점수 없음」으로 접지 않는다', async () => {
  row = { ...baseRow(), submitted: true, submittedAt: '2026-09-19T00:59:00.000Z', scorePercent: 0 };
  await renderResult();

  const score = await screen.findByTestId('result-score');
  expect(score).toHaveTextContent('0');
  expect(screen.queryByTestId('result-ungraded')).not.toBeInTheDocument();
  expect(screen.queryByTestId('result-missing')).not.toBeInTheDocument();
});

it('true + scorePercent null 은 미채점이다 — 0 과 다른 칸으로 선다', async () => {
  row = { ...baseRow(), submitted: true, submittedAt: '2026-09-19T00:59:00.000Z', scorePercent: null };
  await renderResult();

  expect(await screen.findByTestId('result-ungraded')).toBeInTheDocument();
  expect(screen.queryByTestId('result-score')).not.toBeInTheDocument();
});

it('이 세션에서 방금 낸 것은 서버 행이 모른다고 해도 점수를 그린다', async () => {
  row = { ...baseRow(), submitted: null, submittedAt: null, scorePercent: null };
  useSubmissionResultStore.getState().record('asg_1', {
    submission: {
      submissionId: 's_1',
      assignmentId: 'asg_1',
      studentId: 'sub-1',
      scorePercent: 0,
      gradedAt: '2026-09-19T01:00:00.000Z',
      submittedAt: '2026-09-19T00:59:00.000Z',
    },
    answers: { q_a: 0 },
  });
  await renderResult();

  expect(await screen.findByTestId('result-score')).toHaveTextContent('0');
  expect(screen.queryByTestId('result-missing')).not.toBeInTheDocument();
});
