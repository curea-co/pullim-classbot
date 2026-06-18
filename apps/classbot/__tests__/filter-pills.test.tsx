/**
 * FilterPills (Link) + FilterPillButtons (stateful) 단위 테스트.
 *
 * FilterPills  — href(value) 링크를 렌더; active 스타일 적용.
 * FilterPillButtons — button 렌더; onSelect 콜백; count 뱃지; shape prop.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPills, FilterPillButtons } from '@/components/classbot/filter-pills';

const options = [
  { value: 'all', label: '전체' },
  { value: 'essay', label: '서술형' },
  { value: 'short', label: '단답' },
] as const;

// ── FilterPills ─────────────────────────────────────────────────────────────

describe('FilterPills (Link)', () => {
  it('옵션 수만큼 링크를 렌더한다', () => {
    render(
      <FilterPills
        options={options}
        current="all"
        href={(v) => `/test?type=${v}`}
      />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('href 콜백 반환값이 각 링크의 href 속성이 된다', () => {
    render(
      <FilterPills
        options={options}
        current="all"
        href={(v) => `/teacher/grading?type=${v}&status=queue`}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/teacher/grading?type=all&status=queue');
    expect(links[1]).toHaveAttribute('href', '/teacher/grading?type=essay&status=queue');
  });

  it('current 와 일치하는 링크에 active 클래스(bg-pullim-blue-600)가 적용된다', () => {
    render(
      <FilterPills
        options={options}
        current="essay"
        href={(v) => `/test?type=${v}`}
      />,
    );
    const activeLink = screen.getByRole('link', { name: '서술형' });
    expect(activeLink.className).toContain('bg-pullim-blue-600');
  });

  it('비활성 링크에는 bg-pullim-slate-100 클래스가 적용된다', () => {
    render(
      <FilterPills
        options={options}
        current="essay"
        href={(v) => `/test?type=${v}`}
      />,
    );
    const inactiveLink = screen.getByRole('link', { name: '전체' });
    expect(inactiveLink.className).toContain('bg-pullim-slate-100');
  });

  it('label prop 이 있으면 레이블 텍스트가 렌더된다', () => {
    render(
      <FilterPills
        options={options}
        current="all"
        href={(v) => `/test?type=${v}`}
        label="타입"
      />,
    );
    expect(screen.getByText('타입')).toBeInTheDocument();
  });

  it('label prop 이 없으면 레이블 엘리먼트가 없다', () => {
    render(
      <FilterPills
        options={options}
        current="all"
        href={(v) => `/test?type=${v}`}
      />,
    );
    expect(screen.queryByText('타입')).not.toBeInTheDocument();
  });
});

// ── FilterPillButtons ────────────────────────────────────────────────────────

const buttonOptions = [
  { value: 'all', label: '전체', count: 5 },
  { value: 'essay', label: '서술형', count: 3 },
] as const;

describe('FilterPillButtons', () => {
  it('옵션 수만큼 버튼을 렌더한다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('버튼 클릭 시 onSelect 가 해당 value 와 함께 호출된다', () => {
    const onSelect = jest.fn();
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /서술형/ }));
    expect(onSelect).toHaveBeenCalledWith('essay');
  });

  it('count 가 있으면 숫자 뱃지가 렌더된다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
      />,
    );
    // count 뱃지 — 텍스트로만 확인
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('활성 버튼 뱃지에는 bg-white/20 클래스가 적용된다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
      />,
    );
    // 전체 버튼(active)의 뱃지
    const badge = screen.getByText('5');
    expect(badge.className).toContain('bg-white/20');
  });

  it('비활성 뱃지에는 bg-pullim-slate-100 클래스가 적용된다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
      />,
    );
    const badge = screen.getByText('3');
    expect(badge.className).toContain('bg-pullim-slate-100');
  });

  it('shape="tab" 이면 rounded-lg 클래스가 적용된다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
        shape="tab"
      />,
    );
    const btn = screen.getByRole('button', { name: /전체/ });
    expect(btn.className).toContain('rounded-lg');
  });

  it('shape="pill" (기본) 이면 rounded-full 클래스가 적용된다', () => {
    render(
      <FilterPillButtons
        options={buttonOptions}
        current="all"
        onSelect={() => {}}
        shape="pill"
      />,
    );
    const btn = screen.getByRole('button', { name: /전체/ });
    expect(btn.className).toContain('rounded-full');
  });
});
