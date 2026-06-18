import { render, screen } from '@testing-library/react';
import { LiveBadge } from '../live-badge';

describe('LiveBadge', () => {
  it('pill variant renders LIVE text with the shared pulse keyframe class', () => {
    const { container } = render(<LiveBadge />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(container.querySelector('.pullim-anim-live-pulse')).not.toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
  });
  it('dot variant has an accessible label and no LIVE text', () => {
    render(<LiveBadge variant="dot" />);
    expect(screen.queryByText('LIVE')).toBeNull();
    expect(screen.getByLabelText('라이브 진행 중')).toBeInTheDocument();
  });
  it('pill renders trailing children', () => {
    render(<LiveBadge><span>12:30</span></LiveBadge>);
    expect(screen.getByText('12:30')).toBeInTheDocument();
  });
});
