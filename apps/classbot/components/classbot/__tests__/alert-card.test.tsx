import { render, screen } from '@testing-library/react';
import { AlertCircle } from 'lucide-react';
import { AlertCard } from '../alert-card';

describe('AlertCard', () => {
  it('renders children text content', () => {
    render(<AlertCard tone="danger">Alert content here</AlertCard>);
    expect(screen.getByText('Alert content here')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <AlertCard tone="danger" title="Warning">
        Content
      </AlertCard>
    );
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <AlertCard tone="danger" icon={AlertCircle}>
        Content
      </AlertCard>
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies danger tone styles', () => {
    const { container } = render(
      <AlertCard tone="danger">Content</AlertCard>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('border-pullim-danger/30', 'bg-pullim-danger-bg');
  });

  it('applies warn tone styles', () => {
    const { container } = render(
      <AlertCard tone="warn">Content</AlertCard>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('border-pullim-warn/30', 'bg-pullim-warn-bg');
  });

  it('applies info tone styles', () => {
    const { container } = render(
      <AlertCard tone="info">Content</AlertCard>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('border-pullim-blue-200', 'bg-pullim-blue-50');
  });

  it('applies custom className', () => {
    const { container } = render(
      <AlertCard tone="danger" className="custom-class">
        Content
      </AlertCard>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('custom-class');
  });
});
