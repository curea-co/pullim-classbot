// 개발 전용 컴포넌트의 테스트 — DevRoleSwitch 를 제거할 때 이 파일도 함께 지운다.
import { render, screen } from '@testing-library/react';
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
