import { render } from '@testing-library/react';
import { Donut } from '../donut';
import { BulletChart } from '../bullet';
import { Heatmap } from '../heatmap';

describe('Donut', () => {
  it('renders an svg with one path per segment', () => {
    const { container } = render(
      <Donut segments={[{ label: 'a', value: 3 }, { label: 'b', value: 1 }]} />
    );
    expect(container.querySelector('svg')).not.toBeNull();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('renders legend items when showLegend=true', () => {
    const { container } = render(
      <Donut segments={[{ label: '수학', value: 5 }, { label: '영어', value: 3 }]} showLegend />
    );
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li').length).toBe(2);
  });
});

describe('BulletChart', () => {
  it('renders a row per datum', () => {
    const data = [
      { label: '출석', value: 80, target: 100 },
      { label: '과제', value: 60, target: 80 },
    ];
    const { container } = render(<BulletChart data={data} />);
    // Each row has a progressbar
    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars.length).toBe(2);
  });
});

describe('Heatmap', () => {
  it('renders svg with rect cells', () => {
    const data = [
      { date: '2026-01-01', value: 3 },
      { date: '2026-01-02', value: 1 },
      { date: '2026-01-08', value: 5 },
    ];
    const { container } = render(<Heatmap data={data} />);
    expect(container.querySelector('svg')).not.toBeNull();
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('returns null when data is empty', () => {
    const { container } = render(<Heatmap data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
