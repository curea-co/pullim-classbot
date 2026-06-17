import { render, screen } from '@testing-library/react';
import { Sparkbar } from '../sparkbar';
it('renders one bar per datum with class-mode fill', () => {
  const { container } = render(
    <Sparkbar data={[{ value: 20 }, { value: 80 }]} fill={() => 'bg-pullim-blue-500'} fillMode="class" heightPx={48} aria-label="trend" />
  );
  expect(container.querySelectorAll('.bg-pullim-blue-500').length).toBe(2);
  expect(screen.getByLabelText('trend')).toBeInTheDocument();
});
it('interactive mode renders buttons with per-bar aria-label', () => {
  render(<Sparkbar data={[{ value: 50 }]} fill={() => 'var(--color-pullim-heat-2)'} heightPx={56} minPct={8} onBarClick={() => {}} barAriaLabel={(v, i) => `${i}분 (집중도 ${v})`} />);
  expect(screen.getByRole('button', { name: '0분 (집중도 50)' })).toBeInTheDocument();
});
