import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../app-shell';
import styles from '../classbot-shell.module.css';

jest.mock('next/navigation', () => ({
  usePathname: () => '/classbot',
}));

jest.mock('../nav-adapter', () => ({
  railSectionsForRole: () => [{
    head: '클래스봇',
    items: [{ label: '홈', href: '/classbot', active: true }],
  }],
  tabItems: () => [],
}));

jest.mock('../app-header', () => ({
  AppHeaderStart: () => {
    const { useRailCollapse } = jest.requireActual(
      '@/components/ui/rail-collapse-context',
    ) as typeof import('@/components/ui/rail-collapse-context');
    const { collapsed, toggle } = useRailCollapse();
    return (
      <button
        type="button"
        aria-controls="app-rail"
        aria-expanded={!collapsed}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        onClick={toggle}
      />
    );
  },
  AppServiceSwitcher: () => null,
  AppHeaderActions: () => null,
}));

describe('classbot shell planner alignment', () => {
  beforeEach(() => localStorage.clear());

  it('248px 왼쪽 레일과 1180px 본문을 쓰고 접으면 레일 전체 상태를 저장한다', async () => {
    const { container } = render(
      <AppShell role="student">
        <div>본문</div>
      </AppShell>,
    );

    const rail = container.querySelector('#app-rail');
    const railNav = screen.getByRole('navigation', { name: '클래스봇' });
    const content = container.querySelector('#main-content');
    const shell = content?.parentElement?.parentElement?.parentElement;

    expect(rail).toHaveAttribute('data-collapsed', 'false');
    expect(railNav).toHaveClass('w-[248px]', 'px-0', 'py-2');
    expect(content).toHaveClass('max-w-[1180px]');
    expect(shell).toHaveClass(styles.shell);
    expect(screen.getByRole('navigation', { name: '모바일 탭 메뉴' })).toHaveClass(styles.tabbar);

    fireEvent.click(screen.getByRole('button', { name: '사이드바 접기' }));

    await waitFor(() => expect(rail).toHaveAttribute('data-collapsed', 'true'));
    expect(shell).toHaveClass(styles.railCollapsed);
    expect(localStorage.getItem('puds-rail-collapsed')).toBe('1');
    expect(screen.getByRole('button', { name: '사이드바 펼치기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
