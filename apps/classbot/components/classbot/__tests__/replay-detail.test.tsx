import { render, screen, fireEvent } from '@testing-library/react';
import { ReplayDetail } from '../replay-detail';
import { getSentReplays } from '@/lib/mock';
import { useReplayStore } from '@/lib/store/replay';

const mathReplay = getSentReplays().find(r => r.id === 'rp_demo_math')!;

beforeEach(() => useReplayStore.setState({ resolvedWeakPoints: {} }));

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
