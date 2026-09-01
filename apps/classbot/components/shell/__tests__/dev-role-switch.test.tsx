// 개발 전용 컴포넌트의 테스트 — DevRoleSwitch 를 제거할 때 이 파일도 함께 지운다.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DevRoleSwitch } from '../dev-role-switch';

// jsdom 기본 호스트는 localhost → prod 호스트가 아니므로 노출된다.
it('두 역할 진입점을 노출하고 현재 role 을 눌린 상태로 표시한다', () => {
  render(<DevRoleSwitch role="student" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/classbot', '/teacher']);
  expect(links[0].getAttribute('aria-current')).toBe('true');
  expect(links[1].getAttribute('aria-current')).toBeNull();
});

it('교사 화면에서는 교사·학부모 쪽이 눌린 상태다', () => {
  render(<DevRoleSwitch role="teacher" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));
  expect(links[1].textContent).toBe('교사·학부모');
  expect(links[1].getAttribute('aria-current')).toBe('true');
});

it('prod 호스트에서는 아무것도 렌더하지 않는다', () => {
  const { location } = window;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...location, hostname: 'classbot.pullim.ai' },
  });
  const { container } = render(<DevRoleSwitch role="student" />);
  expect(container).toBeEmptyDOMElement();
  Object.defineProperty(window, 'location', { configurable: true, value: location });
});

// 드롭다운(<sm 폴백)을 실제로 연다.
//
// 이 케이스가 없던 동안 `DropdownMenuLabel`(= Base UI `Menu.GroupLabel`)이
// `Menu.Group` 밖에 있었고, `useMenuGroupRootContext()` 는 컨텍스트가 없으면
// 개발·운영 양쪽에서 throw 한다 — 즉 드롭다운을 여는 순간 React 트리가 죽었다.
// 렌더만 하는 위 세 케이스는 트리거를 누르지 않아 그것을 통과시켰다.
it('드롭다운을 열면 라벨과 두 항목이 보인다', () => {
  render(<DevRoleSwitch role="student" />);
  fireEvent.click(screen.getByRole('button', { name: '개발용 역할 전환' }));

  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('dev · 역할 전환')).toBeInTheDocument();
  const links = Array.from(menu.querySelectorAll('a'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/classbot', '/teacher']);
  expect(links[0].getAttribute('aria-current')).toBe('true');
});
