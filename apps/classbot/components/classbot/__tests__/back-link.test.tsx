import React from 'react';
import { render, screen } from '@testing-library/react';
import BackLink from '../back-link';

describe('BackLink', () => {
  it('renders a link with label and href', () => {
    render(
      <BackLink href="/classbot">클래스봇 홈</BackLink>
    );

    const link = screen.getByRole('link', { name: /클래스봇 홈/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/classbot');
  });

  it('renders with ArrowLeft icon', () => {
    render(
      <BackLink href="/classbot">클래스봇 홈</BackLink>
    );

    const link = screen.getByRole('link');
    const icon = link.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('applies slate tone by default', () => {
    const { container } = render(
      <BackLink href="/classbot">클래스봇 홈</BackLink>
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('text-pullim-slate-500', 'hover:text-pullim-slate-700');
  });

  it('applies blue-hover tone when specified', () => {
    const { container } = render(
      <BackLink href="/classbot" tone="blue-hover">클래스봇 홈</BackLink>
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('hover:text-pullim-blue-600', 'font-semibold');
  });

  it('applies dark tone when specified', () => {
    const { container } = render(
      <BackLink href="/classbot" tone="dark">클래스봇 홈</BackLink>
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('text-pullim-slate-300', 'hover:text-white');
  });

  it('renders iconOnly variant with aria-label', () => {
    render(
      <BackLink href="/classbot" iconOnly aria-label="Back to home" />
    );

    const link = screen.getByRole('link', { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('h-8', 'w-8', 'rounded-lg');
  });

  it('requires aria-label for iconOnly variant', () => {
    render(
      <BackLink href="/classbot" iconOnly aria-label="Back" />
    );

    const link = screen.getByRole('link', { name: /back/i });
    expect(link).toHaveAttribute('aria-label', 'Back');
  });

  it('does not render visible text in iconOnly mode', () => {
    const { container } = render(
      <BackLink href="/classbot" iconOnly aria-label="Back to home" />
    );

    const link = container.querySelector('a');
    const textContent = link?.textContent?.trim();
    expect(textContent).toBe('');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <BackLink href="/classbot" className="custom-class">클래스봇 홈</BackLink>
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('custom-class');
  });

  it('uses h-3 w-3 icon for label variant', () => {
    const { container } = render(
      <BackLink href="/classbot">클래스봇 홈</BackLink>
    );

    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('h-3', 'w-3');
  });

  it('uses h-4 w-4 icon for iconOnly variant', () => {
    const { container } = render(
      <BackLink href="/classbot" iconOnly aria-label="Back" />
    );

    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4');
  });
});
