import { render, screen, act } from '@testing-library/react';
import { ReplayReviewNudge } from '../replay-review-nudge';
import { demoReplays } from '@/lib/mock/classbot-replay-demo';
import { useReplayStore } from '@/lib/store/replay';

// demoReplays 약점: rp_demo_math = q:1100(오답)+f:1920(집중저하) 2개, rp_demo_eng = q:740 1개 → 총 3개.
beforeEach(() => useReplayStore.setState({ resolvedWeakPoints: {} }));

it('미해결 약점 총합과 함께 가장 급한(약점 최다) 리플레이 recap 으로 링크한다 — 데모는 demo 라우트', () => {
  render(<ReplayReviewNudge replays={demoReplays} />);
  expect(screen.getByText(/복습할 거리 3개/)).toBeTruthy();
  // 데모 리플레이는 학생 sent 스코프(/replay/[id])가 아니라 /replay/demo/[id] 에서만 열린다 (Codex #181).
  const link = screen.getByRole('link');
  expect(link.getAttribute('href')).toBe('/classbot/replay/demo/rp_demo_math');
});

it('데모가 아닌(sent) 리플레이는 학생 상세 라우트로 링크한다', () => {
  // 데모 시드를 sent 스코프 id 로 복제 — 라우팅이 id 기준으로 분기하는지 검증.
  const sent = { ...demoReplays[0], id: 'rp_sent_001' };
  render(<ReplayReviewNudge replays={[sent]} />);
  expect(screen.getByRole('link').getAttribute('href')).toBe('/classbot/replay/rp_sent_001');
});

it('해결된 약점은 카운트에서 빠지고 타깃도 이동한다', () => {
  act(() => {
    useReplayStore.getState().resolveWeakPoint('rp_demo_math', 'q:1100');
    useReplayStore.getState().resolveWeakPoint('rp_demo_math', 'f:1920');
  });
  render(<ReplayReviewNudge replays={demoReplays} />);
  // math 전부 해결 → eng 1개만 남고, 링크 대상도 eng 로 이동.
  expect(screen.getByText(/복습할 거리 1개/)).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toBe('/classbot/replay/demo/rp_demo_eng');
});

it('미해결 약점이 없으면 아무것도 렌더하지 않는다', () => {
  act(() => {
    useReplayStore.getState().resolveWeakPoint('rp_demo_math', 'q:1100');
    useReplayStore.getState().resolveWeakPoint('rp_demo_math', 'f:1920');
    useReplayStore.getState().resolveWeakPoint('rp_demo_eng', 'q:740');
  });
  const { container } = render(<ReplayReviewNudge replays={demoReplays} />);
  expect(container.firstChild).toBeNull();
});
