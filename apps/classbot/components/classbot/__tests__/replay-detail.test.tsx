import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReplayDetail } from '../replay-detail';
import { demoReplays } from '@/lib/mock/classbot-replay-demo';
import { useReplayStore } from '@/lib/store/replay';
import { useStudentModeStore } from '@/lib/store/student-mode';

const mathReplay = demoReplays.find(r => r.id === 'rp_demo_math')!;

// Mutable control object — jest.mock factory is hoisted so we can't reference a `const`
// declared above it. Instead we store mutable state on a module-level object keyed off
// a string, then expose it via a getter so the component always reads the current value.
let _useRealRequizBE = false;

jest.mock('@/lib/features', () => ({
  get USE_REAL_REQUIZ_BE() {
    return _useRealRequizBE;
  },
}));

const mockMutate = jest.fn();
jest.mock('@/hooks/api/replay/use-requiz', () => ({
  useRequiz: () => ({ mutate: mockMutate }),
}));

beforeEach(() => {
  useReplayStore.setState({ resolvedWeakPoints: {} });
  useStudentModeStore.setState({ mode: 'class' }); // 리플레이는 class 모드 콘텐츠
  _useRealRequizBE = false;
  mockMutate.mockReset();
});

// ─── existing tests (flag OFF) ───────────────────────────────────────────────

it('shows a class-mode gate (no recap) when in self mode', () => {
  useStudentModeStore.setState({ mode: 'self' });
  render(<ReplayDetail replay={mathReplay} />);
  expect(screen.getByRole('button', { name: '교사 수업 모드로 보기' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /다시 풀기/ })).toBeNull();
});

it('opens the exam sheet on 다시 풀기 and resolves the weak point on a correct submit', () => {
  render(<ReplayDetail replay={mathReplay} />);

  // 다시 풀기 → 시험지 패널 등장
  fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
  expect(screen.getByRole('button', { name: '제출' })).toBeTruthy();

  // 정답(answerIndex 2 = 'x = 1에서 극댓값을 갖는다') 선택 후 제출
  fireEvent.click(screen.getByText('x = 1에서 극댓값을 갖는다'));
  fireEvent.click(screen.getByRole('button', { name: '제출' }));

  expect(useReplayStore.getState().resolvedWeakPoints['rp_demo_math']).toContain('q:1100');
});

it('does not resolve on a wrong submit', () => {
  render(<ReplayDetail replay={mathReplay} />);
  fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
  fireEvent.click(screen.getByText('x = 1에서 극솟값을 갖는다')); // 오답
  fireEvent.click(screen.getByRole('button', { name: '제출' }));
  expect(useReplayStore.getState().resolvedWeakPoints['rp_demo_math'] ?? []).not.toContain('q:1100');
});

// (c) flag OFF → mock question rendered, mutate not called
it('flag OFF: uses mock getReplayQuiz, does not call mutate', () => {
  render(<ReplayDetail replay={mathReplay} />);
  fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
  // mock question subjectLabel is '수학 · 도함수의 활용'
  expect(screen.getByText('수학 · 도함수의 활용')).toBeTruthy();
  expect(mockMutate).not.toHaveBeenCalled();
});

// ─── flag ON tests ────────────────────────────────────────────────────────────

describe('flag ON (USE_REAL_REQUIZ_BE = true)', () => {
  beforeEach(() => {
    _useRealRequizBE = true;
  });

  // (a) flag ON + mutate onSuccess → BE question rendered, mock not used
  it('(a) flag ON + onSuccess with question → renders BE question subjectLabel, not mock', async () => {
    const beSubjectLabel = 'BE 과목 · 실 호출 문항';
    mockMutate.mockImplementation(
      (_vars: void, opts: { onSuccess?: (res: unknown) => void; onError?: () => void }) => {
        opts.onSuccess?.({
          questions: [
            {
              subjectLabel: beSubjectLabel,
              stem: 'BE 발문입니다',
              options: ['보기1', '보기2', '보기3', '보기4', '보기5'],
              answerIndex: 0,
              explanation: 'BE 해설',
            },
          ],
        });
      }
    );

    render(<ReplayDetail replay={mathReplay} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
    });

    // BE question rendered
    expect(screen.getByText(beSubjectLabel)).toBeTruthy();
    // mock question subjectLabel NOT rendered
    expect(screen.queryByText('수학 · 도함수의 활용')).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  // (b) flag ON + onError → fallback to mock question (graceful degrade)
  it('(b) flag ON + onError → falls back to mock question', async () => {
    mockMutate.mockImplementation(
      (_vars: void, opts: { onSuccess?: (res: unknown) => void; onError?: () => void }) => {
        opts.onError?.();
      }
    );

    render(<ReplayDetail replay={mathReplay} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
    });

    // Fallback mock question rendered
    expect(screen.getByText('수학 · 도함수의 활용')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  // flag ON + onSuccess with empty questions → fallback to mock question
  it('flag ON + onSuccess with empty questions → falls back to mock question', async () => {
    mockMutate.mockImplementation(
      (_vars: void, opts: { onSuccess?: (res: unknown) => void; onError?: () => void }) => {
        opts.onSuccess?.({ questions: [] });
      }
    );

    render(<ReplayDetail replay={mathReplay} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
    });

    // Fallback mock question rendered
    expect(screen.getByText('수학 · 도함수의 활용')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
