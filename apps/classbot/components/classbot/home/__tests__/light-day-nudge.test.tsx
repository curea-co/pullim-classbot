import { render, screen, fireEvent } from '@testing-library/react';
import { LightDayNudge } from '../light-day-nudge';

it('renders the nudge copy', () => {
  render(<LightDayNudge onEnable={() => {}} />);
  expect(screen.getByText(/컨디션이 무거워/)).toBeTruthy();
});

it('calls onEnable when 가볍게 가기 is clicked', () => {
  const onEnable = jest.fn();
  render(<LightDayNudge onEnable={onEnable} />);
  fireEvent.click(screen.getByRole('button', { name: '가볍게 가기' }));
  expect(onEnable).toHaveBeenCalledTimes(1);
});
