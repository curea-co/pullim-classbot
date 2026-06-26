import { render, screen, fireEvent } from '@testing-library/react';
import { LightDayNudge } from '../light-day-nudge';

it('renders the exact authority §8.2 copy verbatim (both sentences)', () => {
  render(<LightDayNudge onEnable={() => {}} />);
  // 승인 문구 자체가 정책 — 전체 문장 정확히 검증해 드리프트 차단
  expect(screen.getByText('이번 주 좀 무거웠지')).toBeTruthy();
  expect(screen.getByText('같이 가볍게 가보자')).toBeTruthy();
});

it('calls onEnable when 가볍게 가기 is clicked', () => {
  const onEnable = jest.fn();
  render(<LightDayNudge onEnable={onEnable} />);
  fireEvent.click(screen.getByRole('button', { name: '가볍게 가기' }));
  expect(onEnable).toHaveBeenCalledTimes(1);
});
