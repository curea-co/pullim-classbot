import { render, screen } from '@testing-library/react';
import { KpiStat } from '../kpi-stat';
import { KpiStatLink } from '../kpi-stat-link';

/**
 * KpiStatLink 는 같은 KpiStatBar 안에서 KpiStat 과 **나란히** 놓인다
 * (/teacher/classbot 상단 통계 4칸 중 「등록 학생」만 이 부품이다).
 * 그래서 패딩·간격·글자 크기가 2px 만 달라도 값의 밑선이 이웃 칸과 어긋난다 —
 * 실제로 px-3/py-2/mt-0.5 로 갈라져 있었고 그게 이 테스트가 생긴 이유다.
 *
 * 아래 parity 테스트는 기대값을 하드코딩하지 않고 **KpiStat 이 실제로 렌더한 클래스**를
 * 읽어 비교한다. 다음에 누가 한쪽만 고치면 다른 쪽을 안 고친 채로는 green 이 안 된다.
 */

function classesOf(el: Element | null | undefined): string[] {
  return (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

/** KpiStat 의 세 자리(칸 / 라벨 줄 / 값 줄) 클래스. */
function renderStatParts() {
  const { container } = render(<KpiStat label="등록 학생" value="70명" />);
  const box = container.querySelector('li')!;
  const [label, value] = Array.from(box.children) as HTMLElement[];
  return { box, label, value };
}

/** KpiStatLink 의 같은 세 자리. 칸은 <li> 가 아니라 안쪽 <a> 다 — 클릭 영역이 칸 전체라서. */
function renderLinkParts() {
  const { container } = render(<KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />);
  const box = container.querySelector('a')!;
  const [label, value] = Array.from(box.children) as HTMLElement[];
  return { box, label, value };
}

describe('KpiStatLink', () => {
  it('renders label, value and the link target', () => {
    render(<KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />);
    expect(screen.getByText('등록 학생')).toBeInTheDocument();
    expect(screen.getByText('70명')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/teacher/monitor');
  });

  it('wraps the whole card in the link so the click target is the cell itself', () => {
    const { container } = render(<KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />);
    const li = container.querySelector('li')!;
    expect(li.firstElementChild?.tagName).toBe('A');
    // 칸 높이를 이웃과 맞추려면 안쪽 <a> 가 stretch 되어야 한다
    expect(classesOf(li.firstElementChild)).toContain('h-full');
  });

  it('keeps the ArrowRight affordance — 이 칸이 링크라는 유일한 표시다', () => {
    const { container } = render(<KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  describe('KpiStat 과의 클래스 parity', () => {
    it('칸(패딩·배경·라운드)이 KpiStat 과 같다', () => {
      const stat = renderStatParts();
      const link = renderLinkParts();
      expect(classesOf(link.box)).toEqual(expect.arrayContaining(classesOf(stat.box)));
      // 회귀했던 바로 그 값 — 명시적으로도 못 박아 둔다
      expect(classesOf(link.box)).toEqual(expect.arrayContaining(['px-3.5', 'py-2.5']));
    });

    it('라벨 줄이 KpiStat 과 같다 (아이콘이 줄 높이를 흔들지 않게 min-h-5/leading-5 고정)', () => {
      const stat = renderStatParts();
      const link = renderLinkParts();
      expect(classesOf(link.label)).toEqual(expect.arrayContaining(classesOf(stat.label)));
      expect(classesOf(link.label)).toEqual(expect.arrayContaining(['text-xs', 'min-h-5', 'leading-5']));
      // 라벨이 한글이라 uppercase 는 무효 — 양쪽 다 뺐다
      expect(classesOf(link.label)).not.toContain('uppercase');
    });

    it('값 줄이 KpiStat 과 같다 (mt-1 · font-mono · text-2xl)', () => {
      const stat = renderStatParts();
      const link = renderLinkParts();
      expect(classesOf(link.value)).toEqual(expect.arrayContaining(classesOf(stat.value)));
      expect(classesOf(link.value)).toEqual(expect.arrayContaining(['mt-1', 'font-mono', 'text-2xl']));
    });
  });
});
