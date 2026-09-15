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
    expect(label?.className).toContain('font-semibold');
    expect(label?.className).toContain('tracking-wider');
  });

  it('value has correct base typography classes', () => {
    const { container } = render(<KpiStat label="레이블" value="값" />);
    const value = container.querySelector('.font-mono');
    expect(value).toBeInTheDocument();
    expect(value?.className).toContain('mt-1');
    expect(value).toHaveClass('font-bold');
  });
});

/**
 * 크기 변형.
 *
 * KpiStat 은 12개 화면 64자리에서 쓰인다. 그래서 「글자를 키워 달라」는 요청은
 * 기본값을 올리는 것이 아니라 **opt-in 변형**으로 받는다 — 기본 md 가 한 픽셀이라도
 * 움직이면 나머지 11개 화면이 같이 움직이고, 좁은 칸에서는 숫자가 줄바꿈으로 쪼개진다.
 */
describe('KpiStat size', () => {
  function labelOf(node: HTMLElement) {
    return node.querySelector('.text-pullim-slate-500');
  }
  function valueOf(node: HTMLElement) {
    return node.querySelector('.font-mono');
  }

  it('md 가 기본이고, 기본은 이 PR 이전과 같다 (text-2xs · uppercase · text-base)', () => {
    const { container } = render(<KpiStat label="레이블" value="값" />);
    expect(labelOf(container)).toHaveClass('text-2xs', 'uppercase');
    expect(valueOf(container)).toHaveClass('text-base');
  });

  it('lg 는 값을 text-xl(21px)로 올린다 — text-2xl 은 페이지 제목 h1 과 같은 25px 이라 쓰지 않는다', () => {
    const { container } = render(<KpiStat label="레이블" value="값" size="lg" />);
    expect(valueOf(container)).toHaveClass('text-xl');
    expect(valueOf(container)).not.toHaveClass('text-2xl');
  });

  it('lg 만 라벨을 text-xs 로 올리고 uppercase 를 뗀다', () => {
    const { container } = render(<KpiStat label="레이블" value="값" size="lg" />);
    expect(labelOf(container)).toHaveClass('text-xs');
    expect(labelOf(container)?.className).not.toContain('uppercase');
  });

  it('uppercase 제거는 md 로 새지 않는다 — D-day 같은 라틴 라벨이 D-DAY 로 그려지던 자리다', () => {
    // 「라벨이 한글이라 uppercase 는 무효」는 사실이 아니다:
    // components/classbot/assignment-overview-header.tsx 의 label="D-day" 가 실제로 바뀐다.
    const { container } = render(<KpiStat label="D-day" value="D-3" />);
    expect(labelOf(container)).toHaveClass('uppercase');
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

  it('size 를 자식 전부에게 내려 준다 — 한 바 안에서 한 칸만 커지면 밑선이 다시 깨진다', () => {
    const { container } = render(
      <KpiStatBar cols={4} size="lg">
        <KpiStat label="A" value="1" />
        <KpiStat label="B" value="2" />
      </KpiStatBar>
    );
    const values = Array.from(container.querySelectorAll('.font-mono'));
    expect(values).toHaveLength(2);
    for (const v of values) expect(v).toHaveClass('text-xl');
  });

  it('size 를 안 주면 자식도 md 그대로다', () => {
    const { container } = render(
      <KpiStatBar cols={4}>
        <KpiStat label="A" value="1" />
      </KpiStatBar>
    );
    expect(container.querySelector('.font-mono')).toHaveClass('text-base');
  });

  it('자식이 직접 준 size 가 바의 size 를 이긴다', () => {
    const { container } = render(
      <KpiStatBar cols={4} size="lg">
        <KpiStat label="A" value="1" size="md" />
      </KpiStatBar>
    );
    expect(container.querySelector('.font-mono')).toHaveClass('text-base');
  });
});
