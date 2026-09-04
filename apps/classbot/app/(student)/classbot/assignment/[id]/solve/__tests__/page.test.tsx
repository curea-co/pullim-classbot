/**
 * 풀이 화면의 진입 판정 — 「기다린다 / 푼다 / 없다」 셋 중 어디로 가는가.
 *
 * 과제는 두 곳에서 온다(서버 단건 조회 · 로컬 데모 스토어). 그래서 없다고 단정하려면 **둘 다**
 * 끝나 있어야 하고, 반대로 둘 중 하나라도 진행 중이면 기다려야 한다. 예전에는 id 가
 * `as_user_` 로 시작하는지로 기다렸는데, 로컬에 없는 옛 링크가 바로 그 모양이라 404 로
 * 정리되지 못하고 스피너에 갇혔다 — 그 회귀를 여기서 잡는다.
 */

import { Component, Suspense, type ReactNode } from 'react';
import { render, screen, act } from '@testing-library/react';
import SolvePage from '../page';
import { assignmentToReadRow } from '@/lib/assignment-demo';
import { useAssignmentStore, type UserAssignment } from '@/lib/store/assignments';
import type { AssignmentReadRow } from '@/hooks/api/read/types';

const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({ notFound: () => notFound() }));

/* 어느 문항 집합이 실렸는지까지 봐야 「본문만 로컬에서 빌린다」를 확인할 수 있다. */
jest.mock('../solve-workspace', () => ({
  SolveWorkspace: ({ questions }: { questions: { id: string }[] }) => (
    <div data-testid="solve-workspace" data-questions={questions.map((q) => q.id).join(',')} />
  ),
}));

/** 서버 단건 조회 — 테스트마다 갈아 끼운다(도는 중 · 못 찾음 · 찾음 · 실패 · 비로그인). */
let apiResult: {
  data: AssignmentReadRow | undefined;
  isLoading: boolean;
  isError?: boolean;
  isUnauthenticated?: boolean;
} = {
  data: undefined,
  isLoading: false,
};
jest.mock('../../../use-assignment-reads', () => ({
  useVisibleAssignment: () => ({
    data: apiResult.data,
    isLoading: apiResult.isLoading,
    isError: apiResult.isError ?? false,
    isUnauthenticated: apiResult.isUnauthenticated ?? false,
    isNotFound: false,
    refetch: jest.fn(),
  }),
}));

/** 로컬에서 발사된 과제 한 건 — `as_user_` 접두사는 스토어가 붙이는 그 모양 그대로. */
function dispatchedFixture(id: string): UserAssignment {
  return {
    id,
    botId: 'cb_001',
    title: '일차함수 연습',
    scope: '중2 수학 · 일차함수',
    subject: '수학',
    grade: '중2',
    chapterFrom: '일차함수',
    chapterTo: '일차함수',
    achievementCodes: [],
    questionCount: 3,
    difficulty: '중',
    mode: 'practice',
    source: 'teacher-assigned',
    assignedBy: '수학봇',
    assignedAt: '오늘 19:50',
    dueLabel: '내일 22:00',
    dDay: 'D-1',
    completedCount: 0,
    state: 'todo',
    solveHref: `/classbot/assignment/${id}/solve`,
    dispatchStatus: 'sent',
    targetStudentIds: [],
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
  useAssignmentStore.setState({ dispatched: [], drafts: [], submissions: [], lastDispatched: null });
  apiResult = { data: undefined, isLoading: false };
  notFound.mockClear();
  // 에러 경계가 잡은 throw 를 React 가 콘솔에 다시 찍는다 — 테스트 출력만 조용히 시킨다.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('풀이 화면 진입', () => {
  it('서버도 로컬도 모르는 as_user_ 링크는 404 로 정리된다 — 스피너에 갇히지 않는다', async () => {
    await renderSolve('as_user_1700000000000');

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByText('과제를 불러오는 중…')).not.toBeInTheDocument();
    expect(notFound).toHaveBeenCalled();
  });

  it('서버 조회가 도는 동안에는 없다고 단정하지 않는다', async () => {
    apiResult = { data: undefined, isLoading: true };

    await renderSolve('as_user_1700000000000');

    expect(screen.getByText('과제를 불러오는 중…')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('비로그인 데모에서는 로컬 스토어의 과제가 그대로 풀린다', async () => {
    const a = dispatchedFixture('as_user_1700000000000');
    useAssignmentStore.setState({ dispatched: [a] });
    // 서버가 401 — prod 는 공개·비로그인이라 이쪽이 기본 경로다.
    apiResult = { data: undefined, isLoading: false, isUnauthenticated: true };

    await renderSolve(a.id);

    expect(screen.getByTestId('solve-workspace')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  /*
    접근 판정을 로컬이 하면, 서버가 안 보여 주는 과제라도 같은 브라우저에 사본만 남아 있으면
    열린다 — 남의 반 과제, 대상이 아닌 과제, 지워진 과제가 그렇다. 개요·대화·결과는 서버
    visibility 를 따르는데 풀이만 안 따르면 그게 구멍이다.
  */
  it('로그인한 학생은 서버가 안 주는 과제를 로컬 사본만으로 열 수 없다', async () => {
    const a = dispatchedFixture('as_user_1700000000000');
    useAssignmentStore.setState({ dispatched: [a] });
    // 로그인은 돼 있고(401 아님) 서버는 이 과제를 안 준다.
    apiResult = { data: undefined, isLoading: false };

    await renderSolve(a.id);

    expect(screen.getByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('solve-workspace')).not.toBeInTheDocument();
  });

  /*
    「없다」와 「못 읽었다」는 다르다. 서버 장애를 404 로 덮으면 교사는 냈는데 학생에게는
    과제가 사라진 것처럼 보이고, 다시 시도할 길도 없어진다.
  */
  it('서버 조회가 실패하면 404 가 아니라 다시 시도할 수 있는 오류로 그린다', async () => {
    apiResult = { data: undefined, isLoading: false, isError: true };

    await renderSolve('as_9a1c4e2f');

    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('서버가 준 과제는 로컬에 사본이 없어도 풀린다', async () => {
    const row = assignmentToReadRow(dispatchedFixture('as_9a1c4e2f'));
    apiResult = { data: row, isLoading: false };

    await renderSolve(row.id);

    expect(screen.getByTestId('solve-workspace')).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  /*
    판정은 서버가 하되 문항 **본문**은 로컬에서 빌린다 — 서버 행에는 문항이 없어서(M2 경계)
    안 빌리면 교사가 직접 쓴 문항 대신 mode 시드가 실린다.
  */
  it('서버로 연 과제도 교사가 직접 쓴 문항을 그대로 쓴다', async () => {
    const id = 'as_9a1c4e2f';
    const authored = {
      id: 'q_authored_1',
      assignmentId: id,
      order: 1,
      type: 'short' as const,
      prompt: '기울기를 구하시오',
      points: 100,
      answerKey: '2',
    };
    useAssignmentStore.setState({
      dispatched: [{ ...dispatchedFixture(id), questions: [authored] }],
    });
    apiResult = { data: assignmentToReadRow(dispatchedFixture(id)), isLoading: false };

    await renderSolve(id);

    expect(screen.getByTestId('solve-workspace')).toHaveAttribute(
      'data-questions',
      'q_authored_1',
    );
  });
});
