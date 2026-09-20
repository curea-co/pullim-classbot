/**
 * 풀이 화면의 진입 판정 — 「기다린다 / 푼다 / 없다 / 못 읽었다」 넷 중 어디로 가는가.
 *
 * 과제는 **정본 상세 하나**에서 온다(FE PR 6). 종전에는 로컬 데모 스토어가 두 번째 출처였고, 서버 행에 문항이 없어
 * 같은 id 의 로컬 사본에서 문항을 빌렸다(`[M2 한계]`). 이제 문항도 같은 응답에 실려 오므로 그 빌리기가 없다 —
 * 어느 기기의 학생이든 교사가 쓴 그 문항을 받는다. 여기서는 그 사실을 못박는다.
 */

import { Component, Suspense, type ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import SolvePage from '../page';
import type { VisibleAssignmentRow } from '../../../use-assignment-reads';

const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({ notFound: () => notFound() }));

/* 어느 문항 집합이 실렸는지까지 봐야 「서버 문항을 그대로 쓴다」를 확인할 수 있다. */
jest.mock('../solve-workspace', () => ({
  SolveWorkspace: ({ questions, botName }: { questions: { id: string; order: number }[]; botName: string }) => (
    <div
      data-testid="solve-workspace"
      data-questions={questions.map((q) => q.id).join(',')}
      data-orders={questions.map((q) => q.order).join(',')}
      data-bot={botName}
    />
  ),
}));

jest.mock('@/components/classbot/home/my-rooms', () => ({
  useMyRooms: () => ({
    rooms: [{ bot: { id: 'cls_1', name: '수학이 형' }, enrollment: {}, source: 'api' }],
    isLoading: false,
    isError: false,
    retry: jest.fn(),
  }),
}));

/** 서버 단건 조회 — 테스트마다 갈아 끼운다(도는 중 · 못 찾음 · 찾음 · 실패). */
let apiResult: {
  data: VisibleAssignmentRow | undefined;
  isLoading: boolean;
  isError?: boolean;
  isNotFound?: boolean;
  isUnauthenticated?: boolean;
} = { data: undefined, isLoading: false };
jest.mock('../../../use-assignment-reads', () => ({
  ...jest.requireActual('../../../use-assignment-reads'),
  useVisibleAssignment: () => ({
    data: apiResult.data,
    isLoading: apiResult.isLoading,
    isError: apiResult.isError ?? false,
    isUnauthenticated: apiResult.isUnauthenticated ?? false,
    isNotFound: apiResult.isNotFound ?? false,
    refetch: jest.fn(),
  }),
}));

/** 정본 상세가 준 행 — 문항은 서버 순서(0부터)로, 화면은 1번부터 부른다. */
function serverRow(id: string): VisibleAssignmentRow {
  return {
    id,
    botId: 'cls_1',
    studentId: null,
    title: '일차함수 연습',
    scope: '중2 수학 · 일차함수',
    subject: '수학',
    grade: '중2',
    chapterFrom: '',
    chapterTo: '',
    achievementCodes: [],
    questionCount: 2,
    difficulty: '중',
    mode: 'practice',
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '',
    assignedAtLabel: '2026-09-16 17:30',
    dueLabel: '내일 22:00',
    dDay: '내일',
    completedCount: 0,
    recentAccuracy: null,
    submitted: false,
    submittedAt: null,
    scorePercent: null,
    state: 'todo',
    reasonHint: null,
    solveHref: `/classbot/assignment/${id}/solve?step=1`,
    questions: [
      { id: 'q_b', order: 1, type: 'short', prompt: '두 번째', options: null, autoGradable: true },
      { id: 'q_a', order: 0, type: 'mc', prompt: '첫 번째', options: ['가', '나'], autoGradable: true },
    ],
  };
}

/** notFound() 의 throw 를 받아 준다 — 실제 Next 에서도 이 예외가 404 라우트로 간다. */
class NotFoundBoundary extends Component<{ children: ReactNode }, { caught: boolean }> {
  state = { caught: false };
  static getDerivedStateFromError() {
    return { caught: true };
  }
  render() {
    return this.state.caught ? <p data-testid="not-found">404</p> : this.props.children;
  }
}

async function renderSolve(id: string) {
  await act(async () => {
    render(
      <NotFoundBoundary>
        <Suspense fallback={<p data-testid="suspense" />}>
          <SolvePage params={Promise.resolve({ id })} searchParams={Promise.resolve({})} />
        </Suspense>
      </NotFoundBoundary>,
    );
  });
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  apiResult = { data: undefined, isLoading: false };
  notFound.mockClear();
  // 에러 경계가 잡은 throw 를 React 가 콘솔에 다시 찍는다 — 테스트 출력만 조용히 시킨다.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('풀이 화면 진입', () => {
  it('서버 조회가 도는 동안에는 없다고 단정하지 않는다', async () => {
    apiResult = { data: undefined, isLoading: true };

    await renderSolve('asg_1');

    expect(screen.getByText('과제를 불러오는 중…')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('401 로 로그인으로 가는 중에도 기다린다 — 오류 카드도 404 도 아니다', async () => {
    apiResult = { data: undefined, isLoading: true, isUnauthenticated: true };

    await renderSolve('asg_1');

    expect(screen.getByText('과제를 불러오는 중…')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('서버가 404 를 주면 진짜 없는 것이다 — 남의 반 과제도 여기다', async () => {
    apiResult = { data: undefined, isLoading: false, isNotFound: true };

    await renderSolve('asg_nope');

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(notFound).toHaveBeenCalled();
  });

  /*
    「없다」와 「못 읽었다」는 다르다. 서버 장애를 404 로 덮으면 교사는 냈는데 학생에게는
    과제가 사라진 것처럼 보이고, 다시 시도할 길도 없어진다.
  */
  it('서버 조회가 실패하면 404 가 아니라 다시 시도할 수 있는 오류로 그린다', async () => {
    apiResult = { data: undefined, isLoading: false, isError: true };

    await renderSolve('asg_1');

    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('서버가 준 과제는 서버 문항 그대로 풀린다 — 순서를 정렬해 1번부터 매기고, 로컬 사본은 보지 않는다', async () => {
    apiResult = { data: serverRow('asg_1'), isLoading: false };

    await renderSolve('asg_1');

    const ws = screen.getByTestId('solve-workspace');
    expect(ws).toHaveAttribute('data-questions', 'q_a,q_b');
    expect(ws).toHaveAttribute('data-orders', '1,2');
    // 봇 얼굴은 참여 반 카드에서 — 정본 행에 교사 표시명이 없어도 「선생님」 폴백이 아니라 반 봇 이름이다.
    expect(ws).toHaveAttribute('data-bot', '수학이 형');
    expect(notFound).not.toHaveBeenCalled();
  });
});
