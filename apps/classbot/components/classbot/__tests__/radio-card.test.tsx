import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioCardGroup, RadioCard } from '../radio-card';

describe('RadioCardGroup', () => {
  it('renders with role="radiogroup" and ariaLabel', () => {
    render(
      <RadioCardGroup ariaLabel="Test Group">
        <div>Content</div>
      </RadioCardGroup>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Test Group' });
    expect(group).toBeInTheDocument();
  });

  it('renders optional label above the group', () => {
    render(
      <RadioCardGroup label="Options" ariaLabel="Test Group">
        <div>Content</div>
      </RadioCardGroup>,
    );
    expect(screen.getByText('Options')).toBeInTheDocument();
  });

  it('applies grid layout with correct cols class by default', () => {
    const { container } = render(
      <RadioCardGroup ariaLabel="Test Group" layout="grid" cols={2}>
        <div>Content</div>
      </RadioCardGroup>,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).toHaveClass('grid', 'gap-2', 'grid-cols-2');
  });

  it('applies grid layout with sm breakpoint for cols 3', () => {
    const { container } = render(
      <RadioCardGroup ariaLabel="Test Group" layout="grid" cols={3}>
        <div>Content</div>
      </RadioCardGroup>,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).toHaveClass('grid', 'gap-2', 'grid-cols-2', 'sm:grid-cols-3');
  });

  it('applies list layout with space-y-1.5', () => {
    const { container } = render(
      <RadioCardGroup ariaLabel="Test Group" layout="list">
        <div>Content</div>
      </RadioCardGroup>,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).toHaveClass('space-y-1.5');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <RadioCardGroup ariaLabel="Test Group" className="custom-class">
        <div>Content</div>
      </RadioCardGroup>,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).toHaveClass('custom-class');
  });
});

describe('RadioCard', () => {
  it('renders with role="radio" and aria-checked', () => {
    render(<RadioCard active={true} onSelect={() => {}} title="Test" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked to false when inactive', () => {
    render(<RadioCard active={false} onSelect={() => {}} title="Test" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('aria-checked', 'false');
  });

  it('fires onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<RadioCard active={false} onSelect={onSelect} title="Test" />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders title', () => {
    render(<RadioCard active={false} onSelect={() => {}} title="Card Title" />);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Title"
        description="This is a description"
      />,
    );
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Title" />,
    );
    expect(container.textContent).not.toContain('description');
  });

  it('renders trailing content', () => {
    render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Title"
        trailing={<span>Trailing</span>}
      />,
    );
    expect(screen.getByText('Trailing')).toBeInTheDocument();
  });

  it('renders LucideIcon when icon is a function', () => {
    const MockIcon = ({ className }: { className?: string }) => (
      <svg data-testid="mock-icon" className={className} />
    );
    render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Title"
        icon={MockIcon}
      />,
    );
    const icon = screen.getByTestId('mock-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-5', 'w-5');
  });

  it('renders ReactNode icon when icon is not a function', () => {
    render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Title"
        icon={<span data-testid="custom-icon">Custom</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies active styles when active=true', () => {
    const { container } = render(
      <RadioCard active={true} onSelect={() => {}} title="Test" />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass('border-pullim-blue-500', 'bg-pullim-blue-50');
  });

  it('applies inactive styles when active=false', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Test" />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass(
      'border-pullim-slate-200',
      'hover:border-pullim-slate-400',
    );
  });

  it('applies canonical base styles', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Test" />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass(
      'rounded-xl',
      'border-2',
      'p-3',
      'text-left',
      'transition-colors',
    );
  });

  it('applies focus-visible styles', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Test" />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-pullim-blue-400',
    );
  });

  it('applies sm size by default (md)', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Test" />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass('p-3');
  });

  it('applies sm padding when size="sm"', () => {
    const { container } = render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Test"
        size="sm"
      />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass('p-2.5');
    expect(radio).not.toHaveClass('p-3');
  });

  it('renders title with correct typography', () => {
    const { container } = render(
      <RadioCard active={false} onSelect={() => {}} title="Card Title" />,
    );
    const title = screen.getByText('Card Title');
    expect(title).toHaveClass('text-sm', 'font-bold');
  });

  it('renders description with correct typography', () => {
    const { container } = render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Title"
        description="Desc text"
      />,
    );
    const desc = screen.getByText('Desc text');
    expect(desc).toHaveClass('text-xs', 'text-pullim-slate-500');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <RadioCard
        active={false}
        onSelect={() => {}}
        title="Test"
        className="custom-radio"
      />,
    );
    const radio = container.querySelector('[role="radio"]');
    expect(radio).toHaveClass('custom-radio');
  });
});
