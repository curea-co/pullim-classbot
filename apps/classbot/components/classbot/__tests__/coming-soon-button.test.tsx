/**
 * ComingSoonButton 단위 테스트.
 *
 * ComingSoonButton — v2 disabled affordance primitive
 * - always disabled + aria-disabled="true" + title="준비 중 (v2...)"
 * - opacity-60 + cursor-not-allowed merged via cn
 * - asButton=true → shadcn Button (forward variant/size)
 * - asButton=false (기본) → bare <button type="button">
 * - icon 렌더 시 h-4 w-4 + 앞에 위치
 * - onClick 절대 발생 안 함
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Zap } from 'lucide-react';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';

describe('ComingSoonButton', () => {
  it('disabled + aria-disabled="true" 속성을 항상 갖는다', () => {
    render(<ComingSoonButton>준비 중</ComingSoonButton>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('제목(title)이 "준비 중 (v2)"이다 (note 없을 때)', () => {
    render(<ComingSoonButton>준비 중</ComingSoonButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('title', '준비 중 (v2)');
  });

  it('note prop 이 있으면 title이 "준비 중 (v2 — {note})"이다', () => {
    render(<ComingSoonButton note="발송 보류 큐">보류</ComingSoonButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('title', '준비 중 (v2 — 발송 보류 큐)');
  });

  it('opacity-60 + cursor-not-allowed 클래스를 항상 갖는다', () => {
    render(<ComingSoonButton>준비 중</ComingSoonButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('opacity-60');
    expect(btn.className).toContain('cursor-not-allowed');
  });

  it('children 텍스트를 렌더한다', () => {
    render(<ComingSoonButton>준비 중입니다</ComingSoonButton>);
    expect(screen.getByText('준비 중입니다')).toBeInTheDocument();
  });

  describe('asButton=false (기본)', () => {
    it('bare <button type="button">를 렌더한다', () => {
      const { container } = render(
        <ComingSoonButton>준비 중</ComingSoonButton>,
      );
      const btn = container.querySelector('button[type="button"]');
      expect(btn).toBeInTheDocument();
      // shadcn Button 대신 기본 button 임을 확인
      expect(btn).not.toHaveAttribute('data-slot');
    });

    it('variant/size props 는 무시된다', () => {
      render(
        <ComingSoonButton variant="destructive" size="lg">
          준비 중
        </ComingSoonButton>,
      );
      const btn = screen.getByRole('button');
      // 기본 button 이라 data-slot 없음
      expect(btn).not.toHaveAttribute('data-slot');
    });
  });

  describe('asButton=true', () => {
    it('shadcn Button 을 렌더한다 (data-slot="button" 속성)', () => {
      const { container } = render(
        <ComingSoonButton asButton>준비 중</ComingSoonButton>,
      );
      const btn = container.querySelector('[data-slot="button"]');
      expect(btn).toBeInTheDocument();
    });

    it('variant prop 을 shadcn Button 에 전달한다', () => {
      const { container } = render(
        <ComingSoonButton asButton variant="secondary">
          준비 중
        </ComingSoonButton>,
      );
      const btn = container.querySelector('[data-slot="button"]');
      // secondary variant 는 특정 배경 클래스를 추가
      expect(btn?.className).toContain('bg-secondary');
    });

    it('size prop 을 shadcn Button 에 전달한다', () => {
      const { container } = render(
        <ComingSoonButton asButton size="lg">
          준비 중
        </ComingSoonButton>,
      );
      const btn = container.querySelector('[data-slot="button"]');
      // lg size 는 h-9 를 포함
      expect(btn?.className).toContain('h-9');
    });
  });

  describe('icon', () => {
    it('icon prop 이 있으면 Lucide 아이콘이 렌더된다 (h-4 w-4)', () => {
      const { container } = render(
        <ComingSoonButton icon={Zap}>준비 중</ComingSoonButton>,
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Lucide icon 은 svg 를 렌더; h-4 w-4 클래스 확인 (SVG className 은 SVGAnimatedString)
      const classAttr = (svg?.className as any)?.baseVal || svg?.className;
      expect(String(classAttr)).toContain('h-4');
      expect(String(classAttr)).toContain('w-4');
    });

    it('icon 이 children 앞에 위치한다', () => {
      const { container } = render(
        <ComingSoonButton icon={Zap}>준비 중</ComingSoonButton>,
      );
      const btn = screen.getByRole('button');
      // 첫 자식이 svg 여야 함 (icon)
      const firstChild = btn.firstChild;
      expect(firstChild).toBeInstanceOf(SVGElement);
    });

    it('icon prop 이 없으면 아이콘이 렌더되지 않는다', () => {
      const { container } = render(
        <ComingSoonButton>준비 중</ComingSoonButton>,
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  it('className prop 을 merge 한다 (cn 사용)', () => {
    render(
      <ComingSoonButton className="custom-class">
        준비 중
      </ComingSoonButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('custom-class');
    // 항상 있어야 할 opacity-60 도 유지
    expect(btn.className).toContain('opacity-60');
  });

  it('onClick 는 절대 발생하지 않는다 (disabled 로 인해)', () => {
    const onClick = jest.fn();
    render(
      <ComingSoonButton onClick={onClick}>준비 중</ComingSoonButton>,
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
