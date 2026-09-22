import { fireEvent, render, screen, within } from '@testing-library/react';
import { RailCollapseProvider } from '@/components/ui/rail-collapse-context';
import { AppHeaderStart, AppServiceSwitcher } from '../app-header';

describe('classbot topbar controls', () => {
  it('열기/접기를 브랜드보다 먼저 렌더하고 레일 토글을 호출한다', () => {
    const toggle = jest.fn();
    const { container, rerender } = render(
      <RailCollapseProvider collapsed={false} toggle={toggle}>
        <AppHeaderStart role="student" />
      </RailCollapseProvider>,
    );

    const button = screen.getByRole('button', { name: '사이드바 접기' });
    const brand = screen.getByRole('link', { name: '풀림 클래스봇 홈' });
    expect(button.compareDocumentPosition(brand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveAttribute('aria-controls', 'app-rail');
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledTimes(1);

    rerender(
      <RailCollapseProvider collapsed toggle={toggle}>
        <AppHeaderStart role="student" />
      </RailCollapseProvider>,
    );
    expect(screen.getByRole('button', { name: '사이드바 펼치기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('서비스 전환 메뉴를 지정한 순서로 열고 클래스봇을 현재 항목으로 표시한다', () => {
    render(<AppServiceSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: '서비스 전환: 클래스봇' }));
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');

    expect(items.map((item) => item.textContent)).toEqual([
      'OS홈',
      '플래너',
      '문제큐',
      '라이팅 코치',
      '주니어',
      '아케이드',
      '입시코치',
      '클래스봇',
      '스튜디오',
    ]);
    expect(within(menu).getByRole('menuitem', { name: '클래스봇' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
