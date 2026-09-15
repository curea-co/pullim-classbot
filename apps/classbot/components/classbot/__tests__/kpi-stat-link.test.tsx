import { render, screen } from '@testing-library/react';
import { KPI_BOX, KPI_LABEL, KPI_VALUE, KpiStat, KpiStatBar } from '../kpi-stat';
import { KpiStatLink } from '../kpi-stat-link';

/**
 * KpiStatLink 는 같은 KpiStatBar 안에서 KpiStat 과 **나란히** 놓인다
 * (/teacher/classbot 상단 통계 4칸 중 둘이 이 부품이다).
 * 그래서 패딩·간격·글자 크기가 2px 만 달라도 값의 밑선이 이웃 칸과 어긋난다 —
 * 실제로 px-3/py-2/mt-0.5 로 갈라져 있었고 그게 이 테스트가 생긴 이유다.
 *
 * ⚠ 이 테스트가 지키는 것과 못 지키는 것을 분명히 해 둔다.
 * - 지킨다: 두 부품이 같은 공유 상수(KPI_BOX/KPI_LABEL/KPI_VALUE)를 **양방향으로 똑같이** 쓴다.
 *   한쪽에만 클래스를 더하는 회귀도 잡힌다(arrayContaining 이 아니라 집합 일치를 본다).
 * - 지킨다: 두 부품의 바깥 칸이 같은 **블록 컨테이너**다 — 여기가 갈리면(예전의 `flex flex-col`)
 *   클래스가 같아도 라벨 줄의 line box strut 이 달라져 밑선이 4~6px 어긋난다.
 * - 못 지킨다: 실제 렌더 높이. jsdom 에는 레이아웃이 없다. 그 확인은 브라우저 실측 몫이다.
 */

function classSet(el: Element | null | undefined): Set<string> {
  return new Set((el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
}

function expectClasses(el: Element | null | undefined) {
  return expect([...classSet(el)].sort());
}

/** 공유 상수를 집합으로. cn() 이 순서를 바꿔도 비교가 흔들리지 않게 한다. */
function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean).sort();
}

/** KpiStat 의 세 자리(칸 / 라벨 줄 / 값 줄). */
function renderStatParts(size?: 'md' | 'lg') {
  const { container } = render(<KpiStat label="등록 학생" value="70명" size={size} />);
  const box = container.querySelector('li')!;
  const [label, value] = Array.from(box.children) as HTMLElement[];
  return { box, label, value };
}

/** KpiStatLink 의 같은 세 자리. 칸은 <li> 가 아니라 안쪽 <a> 다 — 클릭 영역이 칸 전체라서. */
function renderLinkParts(size?: 'md' | 'lg') {
  const { container } = render(
    <KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" size={size} />
  );
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
    expect(classSet(li.firstElementChild)).toContain('h-full');
  });

  it('keeps the ArrowRight affordance — 이 칸이 링크라는 유일한 표시다', () => {
    const { container } = render(<KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  describe('KpiStat 과의 구조 parity', () => {
    it('칸이 블록 컨테이너다 — flex 면 라벨이 blockify 되어 밑선이 어긋난다', () => {
      const link = renderLinkParts();
      const cls = classSet(link.box);
      expect(cls).toContain('block');
      expect(cls).not.toContain('flex');
      expect(cls).not.toContain('flex-col');
    });

    it('라벨·값이 KpiStat 과 같은 블록/인라인 조합이다 (div + div)', () => {
      const stat = renderStatParts();
      const link = renderLinkParts();
      expect(link.label.tagName).toBe(stat.label.tagName);
      expect(link.value.tagName).toBe(stat.value.tagName);
    });
  });

  describe.each(['md', 'lg'] as const)('KpiStat 과의 클래스 parity (size=%s)', (size) => {
    it('칸이 공유 상수 KPI_BOX 를 그대로 쓴다 (양쪽 다)', () => {
      const stat = renderStatParts(size);
      const link = renderLinkParts(size);
      // KpiStat 의 칸은 KPI_BOX 그 자체다
      expectClasses(stat.box).toEqual(tokens(KPI_BOX));
      // 링크 칸은 KPI_BOX 를 전부 품고, 더한 것은 링크 고유 클래스뿐이다
      for (const t of tokens(KPI_BOX)) expect(classSet(link.box)).toContain(t);
      const extra = [...classSet(link.box)].filter((c) => !tokens(KPI_BOX).includes(c)).sort();
      expect(extra).toEqual([
        'block', 'focus-visible:ring-2', 'focus-visible:ring-pullim-blue-400/50',
        'group', 'h-full', 'hover:bg-pullim-blue-50', 'outline-none', 'transition-colors',
      ]);
    });

    it('라벨 줄이 공유 상수 KPI_LABEL 과 색만 다르다 (양방향)', () => {
      const stat = renderStatParts(size);
      const link = renderLinkParts(size);
      const shared = tokens(KPI_LABEL[size]);
      expectClasses(stat.label).toEqual([...shared, 'text-pullim-slate-500'].sort());
      expectClasses(link.label).toEqual(
        [...shared, 'text-pullim-slate-500', 'group-hover:text-pullim-blue-700'].sort()
      );
    });

    it('값 줄이 공유 상수 KPI_VALUE 와 색만 다르다 (양방향)', () => {
      const stat = renderStatParts(size);
      const link = renderLinkParts(size);
      const shared = tokens(KPI_VALUE[size]);
      expectClasses(stat.value).toEqual([...shared, 'text-pullim-slate-900'].sort());
      expectClasses(link.value).toEqual([...shared, 'text-pullim-slate-900'].sort());
    });
  });

  it('KpiStatBar 의 size 가 KpiStatLink 에도 내려간다 — 한 바 안에서 한 줄만 커지지 않게', () => {
    const { container } = render(
      <KpiStatBar cols={4} size="lg">
        <KpiStat label="운영 중" value="3/5개" />
        <KpiStatLink label="등록 학생" value="70명" href="/teacher/monitor" />
      </KpiStatBar>
    );
    const [statValue, linkValue] = Array.from(container.querySelectorAll('.font-mono'));
    expect(classSet(statValue)).toContain('text-xl');
    expect(classSet(linkValue)).toContain('text-xl');
  });
});
