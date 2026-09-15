import { render, screen } from '@testing-library/react';
import { AlertTriangle } from 'lucide-react';
import { KpiStat, KpiStatBar } from '../kpi-stat';

describe('KpiStat', () => {
  it('renders label and value', () => {
    render(<KpiStat label="대기" value="5건" />);
    expect(screen.getByText('대기')).toBeInTheDocument();
    expect(screen.getByText('5건')).toBeInTheDocument();
  });

  it('default tone applies slate-900 to value', () => {
    const { container } = render(<KpiStat label="기본" value="3건" />);
    const value = container.querySelector('.text-pullim-slate-900');
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('3건');
  });

  it('accent tone applies blue-600 to value', () => {
    const { container } = render(<KpiStat label="정답률" value="85%" tone="accent" />);
    const value = container.querySelector('.text-pullim-blue-600');
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('85%');
  });

  it('alert tone applies danger to value', () => {
    const { container } = render(<KpiStat label="위기" value="3명" tone="alert" />);
    const value = container.querySelector('.text-pullim-danger');
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('3명');
  });

  it('success tone applies blue-500 to value', () => {
    const { container } = render(<KpiStat label="활동" value="활발" tone="success" />);
    const value = container.querySelector('.text-pullim-blue-500');
    expect(value).toBeInTheDocument();
    expect(value).toHaveTextContent('활발');
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <KpiStat label="위험" value="2명" tone="alert" icon={AlertTriangle} />
    );
    // The icon renders as svg
    expect(container.querySelector('svg')).toBeInTheDocument();
    // Icon wrapper has h-3 w-3 class
    expect(container.querySelector('.h-3.w-3')).toBeInTheDocument();
  });

  it('does not render icon element when icon is not provided', () => {
    const { container } = render(<KpiStat label="대기" value="5건" />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders as li element with correct base classes', () => {
    const { container } = render(<KpiStat label="테스트" value="1건" />);
    const li = container.querySelector('li');
    expect(li).toBeInTheDocument();
    expect(li).toHaveClass('bg-pullim-slate-50/50', 'rounded-lg', 'px-3.5', 'py-2.5');
  });

  it('label has correct typography classes', () => {
    const { container } = render(<KpiStat label="레이블" value="값" />);
    const label = container.querySelector('.text-pullim-slate-500');
    expect(label).toBeInTheDocument();
    // Check class string contains key identifiers
    expect(label?.className).toContain('font-semibold');
    expect(label?.className).toContain('tracking-wider');
    // 라벨이 한글이라 uppercase 는 아무 효과가 없어 걷어냈다 — tracking-wider 만 남는다
    expect(label?.className).not.toContain('uppercase');
    // 2026-09-15: text-2xs(12px) → text-xs(13px). 통계 칸 글자가 작다는 교사 피드백
    expect(label).toHaveClass('text-xs');
  });

  it('label row height is pinned so an icon cannot shift it', () => {
    // 아이콘(h-3)이 있든 없든 라벨 줄은 20px — KpiStatLink 의 ArrowRight 가
    // 그 칸만 라벨 줄을 키워 값의 밑선을 어긋나게 하던 것을 막는다
    const { container } = render(<KpiStat label="레이블" value="값" />);
    const label = container.querySelector('.text-pullim-slate-500');
    expect(label).toHaveClass('min-h-5', 'leading-5');
  });

  it('value has correct base typography classes', () => {
    const { container } = render(<KpiStat label="레이블" value="값" />);
    const value = container.querySelector('.font-mono');
    expect(value).toBeInTheDocument();
    expect(value?.className).toContain('mt-1');
    // 2026-09-15: text-base(16px) → text-2xl(25px). 값이 이 칸의 주인공이라 키웠다
    expect(value).toHaveClass('text-2xl', 'font-bold');
  });
});

describe('KpiStatBar', () => {
  it('renders children inside section > ul', () => {
    const { container } = render(
      <KpiStatBar>
        <KpiStat label="A" value="1" />
        <KpiStat label="B" value="2" />
      </KpiStatBar>
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveClass('bg-card', 'rounded-2xl', 'border', 'p-4');
    const ul = section?.querySelector('ul');
    expect(ul).toBeInTheDocument();
    expect(ul?.querySelectorAll('li').length).toBe(2);
  });

  it('cols=2 applies grid-cols-2', () => {
    const { container } = render(
      <KpiStatBar cols={2}>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-2');
  });

  it('cols=3 applies grid-cols-3', () => {
    const { container } = render(
      <KpiStatBar cols={3}>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-3');
  });

  it('cols=4 applies grid-cols-2 sm:grid-cols-4', () => {
    const { container } = render(
      <KpiStatBar cols={4}>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
  });

  it('cols=6 applies grid-cols-2 sm:grid-cols-3 lg:grid-cols-6', () => {
    const { container } = render(
      <KpiStatBar cols={6}>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-6');
  });

  it('default cols (6) is applied when omitted', () => {
    const { container } = render(
      <KpiStatBar>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const ul = container.querySelector('ul');
    expect(ul).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-6');
  });

  it('passes className to section', () => {
    const { container } = render(
      <KpiStatBar className="extra-class">
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    const section = container.querySelector('section');
    expect(section).toHaveClass('extra-class');
  });
});
