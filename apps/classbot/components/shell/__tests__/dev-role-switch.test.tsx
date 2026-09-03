// 개발 전용 컴포넌트의 테스트 — DevRoleSwitch 를 제거할 때 이 파일도 함께 지운다.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DevRoleSwitch } from '../dev-role-switch';
import { DEV_IDENTITY_COOKIE } from '@/lib/dev-identity';

/** jsdom 의 document.cookie 를 비운다(테스트 간 누수 방지). */
function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(clearAllCookies);

// jsdom 기본 호스트는 localhost → prod 호스트가 아니므로 노출된다.
// 학부모 화면이 이 PR 에서 도착해 진입점이 셋이 된다.
it('세 역할 진입점을 노출하고 현재 role 을 눌린 상태로 표시한다', () => {
  render(<DevRoleSwitch role="student" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/classbot', '/teacher', '/parent']);
  expect(links.map((a) => a.textContent)).toEqual(['학생', '교사', '학부모']);
  expect(links[0].getAttribute('aria-current')).toBe('true');
  expect(links[1].getAttribute('aria-current')).toBeNull();
  expect(links[2].getAttribute('aria-current')).toBeNull();
});

it('교사 화면에서는 교사 쪽이, 학부모 화면에서는 학부모 쪽이 눌린 상태다', () => {
  const { unmount } = render(<DevRoleSwitch role="teacher" />);
  let links = Array.from(
    screen.getByRole('group', { name: '개발용 역할 전환' }).querySelectorAll('a'),
  );
  expect(links[1].textContent).toBe('교사');
  expect(links[1].getAttribute('aria-current')).toBe('true');
  unmount();

  render(<DevRoleSwitch role="parent" />);
  links = Array.from(
    screen.getByRole('group', { name: '개발용 역할 전환' }).querySelectorAll('a'),
  );
  expect(links[2].textContent).toBe('학부모');
  expect(links[2].getAttribute('aria-current')).toBe('true');
});

// 화면만 바꾸고 신원을 그대로 두면 서버가 계속 서연으로 본다 → /api/* 가 남의 데이터를 준다.
// 이동 전에 쿠키가 실려야 새 문서 요청이 그 역할로 나간다.
it('누르면 이동 전에 개발용 신원 쿠키를 쓴다', () => {
  render(<DevRoleSwitch role="student" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));

  fireEvent.click(links[1]); // 교사
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=teacher_001`);

  fireEvent.click(links[2]); // 학부모
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=parent_001`);

  fireEvent.click(links[0]); // 학생
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=student_001`);
});

it('prod 호스트에서는 아무것도 렌더하지 않는다', () => {
  const { location } = window;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...location, hostname: 'classbot.pullim.ai', host: 'classbot.pullim.ai' },
  });
  const { container } = render(<DevRoleSwitch role="student" />);
  expect(container).toBeEmptyDOMElement();
  Object.defineProperty(window, 'location', { configurable: true, value: location });
});

// 드롭다운(<md 폴백)을 실제로 연다.
//
// 이 케이스가 없던 동안 `DropdownMenuLabel`(= Base UI `Menu.GroupLabel`)이
// `Menu.Group` 밖에 있었고, `useMenuGroupRootContext()` 는 컨텍스트가 없으면
// 개발·운영 양쪽에서 throw 한다 — 즉 드롭다운을 여는 순간 React 트리가 죽었다.
// 렌더만 하는 위 케이스들은 트리거를 누르지 않아 그것을 통과시켰다.
// 드롭다운은 세그먼트의 축소판이 아니라 **계정 고르는 곳**이다.
// 세그먼트는 역할당 대표 계정 하나로만 가므로, 두 번째 교사(박영어)와 빈 학생(민준)으로
// 갈 길이 여기 없으면 「학생이 여러 선생님 반에 들어간다」를 손으로 확인할 수 없다.
it('드롭다운을 열면 데모 계정 전원이 보인다 — 한 역할에 계정이 둘인 것까지', () => {
  render(<DevRoleSwitch role="student" />);
  fireEvent.click(screen.getByRole('button', { name: '개발용 계정 전환' }));

  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('dev · 계정 바꾸기')).toBeInTheDocument();
  const links = Array.from(menu.querySelectorAll('a'));
  // allowlist(DEV_IDENTITIES) 전원 — 5명, 각자 자기 역할의 홈으로 간다.
  expect(links.map((a) => a.getAttribute('href'))).toEqual([
    '/classbot', '/classbot', '/teacher', '/teacher', '/parent',
  ]);
  for (const label of ['학생 · 서연', '학생 · 민준', '교사 · 김수학', '교사 · 박영어', '학부모 · 어머니']) {
    expect(within(menu).getByText(label)).toBeInTheDocument();
  }
});

it('드롭다운 항목도 이동 전에 신원 쿠키를 쓴다 — 대표가 아닌 계정도', () => {
  render(<DevRoleSwitch role="student" />);

  // 항목을 누르면 메뉴가 닫히고 노드가 떨어져 나간다 → 매번 다시 열고 다시 집는다.
  const pick = (index: number) => {
    fireEvent.click(screen.getByRole('button', { name: '개발용 계정 전환' }));
    const links = Array.from(screen.getByRole('menu').querySelectorAll('a'));
    fireEvent.click(links[index]);
  };

  pick(3); // 교사 · 박영어 — 세그먼트로는 갈 수 없는 계정
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=teacher_002`);

  pick(1); // 학생 · 민준
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=s2`);
});

// 체크는 역할이 아니라 **계정**을 따라간다 — 한 역할에 계정이 둘이라
// 역할로 표시하면 박영어로 들어가 있어도 김수학에 체크가 붙는다.
it('체크 표시는 지금 쿠키에 실린 계정 하나에만 붙는다', () => {
  document.cookie = `${DEV_IDENTITY_COOKIE}=teacher_002; path=/`;
  render(<DevRoleSwitch role="teacher" />);
  fireEvent.click(screen.getByRole('button', { name: '개발용 계정 전환' }));
  const links = Array.from(screen.getByRole('menu').querySelectorAll('a'));

  expect(links.filter((a) => a.getAttribute('aria-current') === 'true')).toHaveLength(1);
  expect(links[3].getAttribute('aria-current')).toBe('true'); // 박영어
  expect(links[2].getAttribute('aria-current')).toBeNull();   // 김수학
});
