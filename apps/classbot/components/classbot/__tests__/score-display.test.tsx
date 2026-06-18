import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreDisplay } from '../score-display';

describe('ScoreDisplay', () => {
  describe('basic rendering', () => {
    it('renders score and max with default classes', () => {
      render(<ScoreDisplay score={75} max={100} />);
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('/100')).toBeInTheDocument();
    });

    it('renders with className applied to root div', () => {
      const { container } = render(<ScoreDisplay score={50} max={100} className="custom-class" />);
      const rootDiv = container.querySelector('.custom-class');
      expect(rootDiv).toBeInTheDocument();
    });
  });

  describe('size prop', () => {
    it('applies text-xs for size=sm', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="sm" />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('text-xs');
    });

    it('applies text-sm for size=md', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="md" />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('text-sm');
    });

    it('applies text-xl for size=lg', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="lg" />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('text-xl');
    });

    it('applies text-2xl for size=xl', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="xl" />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('text-2xl');
    });
  });

  describe('tone=fixed-accent', () => {
    it('renders numerator in blue-600', () => {
      const { container } = render(<ScoreDisplay score={75} max={100} tone="fixed-accent" />);
      const numerator = container.querySelector('.text-pullim-blue-600');
      expect(numerator).toHaveTextContent('75');
    });
  });

  describe('tone=inverse', () => {
    it('renders numerator in white', () => {
      const { container } = render(<ScoreDisplay score={75} max={100} tone="inverse" />);
      const numerator = container.querySelector('.text-white');
      expect(numerator).toHaveTextContent('75');
    });
  });

  describe('tone=threshold', () => {
    it('colors numerator blue-700 when pct >= 80', () => {
      const { container } = render(<ScoreDisplay score={80} max={100} tone="threshold" />);
      const numerator = container.querySelector('.text-pullim-blue-700');
      expect(numerator).toHaveTextContent('80');
    });

    it('colors numerator blue-500 when 60 <= pct < 80', () => {
      const { container } = render(<ScoreDisplay score={70} max={100} tone="threshold" />);
      const numerator = container.querySelector('.text-pullim-blue-500');
      expect(numerator).toHaveTextContent('70');
    });

    it('colors numerator slate-500 when pct < 60', () => {
      const { container } = render(<ScoreDisplay score={50} max={100} tone="threshold" />);
      const numerator = container.querySelector('.text-pullim-slate-500');
      expect(numerator).toHaveTextContent('50');
    });

    it('handles fractional scores in threshold calculation', () => {
      const { container } = render(<ScoreDisplay score={12} max={15} tone="threshold" />);
      // pct = (12/15)*100 = 80, should be blue-700
      const numerator = container.querySelector('.text-pullim-blue-700');
      expect(numerator).toHaveTextContent('12');
    });
  });

  describe('denomScale prop', () => {
    it('applies text-sm to denom span when size=lg and denomScale not set', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="lg" />);
      const denomSpan = container.querySelector('span.text-pullim-slate-400');
      expect(denomSpan).toHaveClass('text-sm');
    });

    it('applies text-base to denom span when size=xl and denomScale not set', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="xl" />);
      const denomSpan = container.querySelector('span.text-pullim-slate-400');
      expect(denomSpan).toHaveClass('text-base');
    });

    it('respects explicit denomScale=sm', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="xl" denomScale="sm" />);
      const denomSpan = container.querySelector('span.text-pullim-slate-400');
      expect(denomSpan).toHaveClass('text-sm');
    });

    it('respects explicit denomScale=base', () => {
      const { container } = render(<ScoreDisplay score={10} max={20} size="sm" denomScale="base" />);
      const denomSpan = container.querySelector('span.text-pullim-slate-400');
      expect(denomSpan).toHaveClass('text-base');
    });
  });

  describe('always-present classes', () => {
    it('always includes font-mono and font-bold', () => {
      const { container } = render(<ScoreDisplay score={50} max={100} />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('font-mono');
      expect(rootDiv).toHaveClass('font-bold');
    });

    it('denom span always has text-pullim-slate-400', () => {
      const { container } = render(<ScoreDisplay score={50} max={100} tone="inverse" />);
      const denomSpan = container.querySelector('span.text-pullim-slate-400');
      expect(denomSpan).toBeInTheDocument();
    });
  });
});
