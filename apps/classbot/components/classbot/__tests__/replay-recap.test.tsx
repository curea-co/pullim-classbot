import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReplayRecap } from '../replay-recap';
import { getSentReplays } from '@/lib/mock';
import { useReplayStore } from '@/lib/store/replay';

const mathReplay = getSentReplays().find(r => r.id === 'rp_demo_math')!;

beforeEach(() => useReplayStore.setState({ resolvedWeakPoints: {} }));

it('renders core takeaways and both weak points', () => {
  render(<ReplayRecap replay={mathReplay} onSeek={() => {}} onReattempt={() => {}} />);
  expect(screen.getByText('Q3 극대·극소 판정')).toBeTruthy(); // 오답
  expect(screen.getByText('변곡점')).toBeTruthy();             // 집중 저하
  expect(screen.getByText(/극값은 도함수/)).toBeTruthy();       // takeaway
});

it('calls onReattempt for the wrong quiz and onSeek for 다시 보기', () => {
  const onSeek = jest.fn();
  const onReattempt = jest.fn();
  render(<ReplayRecap replay={mathReplay} onSeek={onSeek} onReattempt={onReattempt} />);
  fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
  expect(onReattempt).toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: /다시 보기/ })[0]);
  expect(onSeek).toHaveBeenCalled();
});

it('hides resolved weak points and shows the resolved count', () => {
  act(() => useReplayStore.getState().resolveWeakPoint('rp_demo_math', 'q:1100'));
  render(<ReplayRecap replay={mathReplay} onSeek={() => {}} onReattempt={() => {}} />);
  expect(screen.queryByRole('button', { name: /다시 풀기/ })).toBeNull(); // 오답 해결됨
  expect(screen.getByText('변곡점')).toBeTruthy();                          // 집중저하는 남음
  expect(screen.getByText(/해결한 약점 1개/)).toBeTruthy();
});
