import { render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { BotNote } from '../bot-note';

describe('BotNote', () => {
  it('renders children text content', () => {
    render(<BotNote>Note content here</BotNote>);
    expect(screen.getByText('Note content here')).toBeInTheDocument();
  });

  it('renders Sparkles icon by default', () => {
    const { container } = render(<BotNote>Content</BotNote>);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders custom icon when provided', () => {
    const { container } = render(
      <BotNote icon={Heart}>Content</BotNote>
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies correct base styles', () => {
    const { container } = render(<BotNote>Content</BotNote>);
    const div = container.querySelector('div');
    expect(div).toHaveClass(
      'text-pullim-blue-700',
      'bg-pullim-blue-50/60',
      'rounded-lg',
      'px-3',
      'py-2',
      'text-2xs',
      'leading-relaxed'
    );
  });

  it('applies custom className', () => {
    const { container } = render(
      <BotNote className="custom-class">Content</BotNote>
    );
    const div = container.querySelector('div');
    expect(div).toHaveClass('custom-class');
  });
});
