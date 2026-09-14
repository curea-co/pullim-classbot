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
// 착지점이 있는 역할만 편다 — `/parent` 화면이 도착해 이제 셋이다.
it('착지점이 있는 세 역할을 노출하고 현재 role 을 눌린 상태로 표시한다', () => {
  render(<DevRoleSwitch role="student" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/classbot', '/teacher', '/parent']);
  expect(links.map((a) => a.textContent)).toEqual(['학생', '교사', '학부모']);
  expect(links[0].getAttribute('aria-current')).toBe('true');
  expect(links[1].getAttribute('aria-current')).toBeNull();
  expect(links[2].getAttribute('aria-current')).toBeNull();
});

it('학부모 화면에서는 학부모 쪽이 눌린 상태다', () => {
  render(<DevRoleSwitch role="parent" />);
  const links = Array.from(
    screen.getByRole('group', { name: '개발용 역할 전환' }).querySelectorAll('a'),
  );
  expect(links[2].textContent).toBe('학부모');
  expect(links[2].getAttribute('aria-current')).toBe('true');
});

it('교사 화면에서는 교사 쪽이 눌린 상태다', () => {
  render(<DevRoleSwitch role="teacher" />);
  const links = Array.from(
    screen.getByRole('group', { name: '개발용 역할 전환' }).querySelectorAll('a'),
  );
  expect(links[1].textContent).toBe('교사');
  expect(links[1].getAttribute('aria-current')).toBe('true');
});

// 화면만 바꾸고 신원을 그대로 두면 서버가 계속 서연으로 본다 → /api/* 가 남의 데이터를 준다.
// 이동 전에 쿠키가 실려야 새 문서 요청이 그 역할로 나간다.
it('누르면 이동 전에 개발용 신원 쿠키를 쓴다', () => {
  render(<DevRoleSwitch role="student" />);
  const group = screen.getByRole('group', { name: '개발용 역할 전환' });
  const links = Array.from(group.querySelectorAll('a'));

  fireEvent.click(links[1]); // 교사
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=teacher_001`);

  fireEvent.click(links[0]); // 학생
  expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=student_001`);
});

/** 주어진 host 로 창을 바꿔 렌더하고 원상복구한다. */
function renderAtHost(host: string) {
  const { location } = window;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...location, hostname: host.split(':')[0], host },
  });
  const result = render(<DevRoleSwitch role="student" />);
  Object.defineProperty(window, 'location', { configurable: true, value: location });
  return result;
}

/**
 * host 를 **상호작용이 끝날 때까지** 유지한 채 실행한다.
 *
 * `renderAtHost` 는 렌더 직후 원복하므로 **클릭 시점에는 jsdom 기본 host(`localhost`)** 로
 * 돌아가 있다. 쿠키 여부처럼 **클릭 핸들러가 host 를 읽는** 것을 재려면 그 원복이 곧
 * 하네스를 재는 함정이 된다 — 실제로 이 파일에 그 함정으로 통과하는 테스트를 한 번 썼다.
 * @param host - 유지할 host
 * @param run - 그 host 에서 돌릴 것
 */
function atHost(host: string, run: () => void) {
  const { location } = window;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...location, hostname: host.split(':')[0], host },
  });
  try {
    run();
  } finally {
    Object.defineProperty(window, 'location', { configurable: true, value: location });
  }
}

/** 배포 환경 변수를 세우고 되돌린다. */
function withEnv(value: string | undefined, run: () => void) {
  const saved = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (value === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
  else process.env.NEXT_PUBLIC_VERCEL_ENV = value;
  try {
    run();
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    else process.env.NEXT_PUBLIC_VERCEL_ENV = saved;
  }
}

// 이 버튼의 노출 판정은 서버가 쓰는 `isDevIdentityHost` 와 **같은 함수**다.
// 표가 둘이면 갈라진다 — 종전에는 여기서 `hostname !== PROD_HOST` 로 따로 비교해서,
// 서버가 허용 목록으로 좁혀진 뒤에도 버튼만 prod 아닌 **모든** 호스트에서 떠 있었다.
it.each([
  ['classbot.pullim.ai', false],
  // 허용 목록 밖 — 종전에는 여기서 버튼이 떴다
  ['evil.example.com', false],
  ['pullim-classbot-abc123.example.net', false],
  // `*.vercel.app` 은 preview 라고 확인되기 전까지 닫혀 있다(production 도 받는 접미사라서)
  ['pullim-classbot-abc123-curea.vercel.app', false],
  // 로컬·dev preview 는 뜬다 — **화면 전환은 서버를 부르지 않는다**(`isRoleSwitchHost`)
  ['localhost:3032', true],
  ['dev-classbot.pullim.ai', true],
])('%s → 렌더 %s', (host, shown) => {
  const { container } = renderAtHost(host);
  expect(container.innerHTML === '').toBe(!shown);
});

it('preview 배포의 PR 미리보기에서는 뜬다 — 화면 전환은 DB 와 무관하다', () => {
  withEnv('preview', () => {
    expect(renderAtHost('pullim-classbot-git-feat-x-curea.vercel.app').container)
      .not.toBeEmptyDOMElement();
  });
});

it('production 배포면 배포 도메인에서 숨는다', () => {
  withEnv('production', () => {
    expect(renderAtHost('pullim-classbot-abc123-curea.vercel.app').container).toBeEmptyDOMElement();
    expect(renderAtHost('dev-classbot.pullim.ai').container).toBeEmptyDOMElement();
  });
});

/*
  **쿠키는 로컬에서만 쓴다** — 이게 이 분리의 핵심이다. 배포에서 버튼을 눌러 명의를 세우면
  라우트가 `users` 를 조회하고 배포에는 DB 가 없어 500 이 난다. 배포에서는 화면만 바꾼다.
*/
it('배포 호스트에서는 눌러도 신원 쿠키를 쓰지 않는다 — 화면만 바꾼다', () => {
  withEnv('preview', () => {
    atHost('dev-classbot.pullim.ai', () => {
      const { container } = render(<DevRoleSwitch role="student" />);
      const link = container.querySelector('a[href="/parent"]');
      expect(link).not.toBeNull();
      fireEvent.click(link!);
      expect(document.cookie).not.toContain(DEV_IDENTITY_COOKIE);
    });
  });
});

// 짝이 되는 확인 — 로컬에서는 **쓴다.** 위 테스트가 「아무 데서도 안 쓴다」로 통과하면
// 이 장치가 죽은 것을 못 잡는다.
it('로컬에서는 눌러 신원 쿠키를 쓴다', () => {
  atHost('localhost:3032', () => {
    const { container } = render(<DevRoleSwitch role="student" />);
    fireEvent.click(container.querySelector('a[href="/parent"]')!);
    expect(document.cookie).toContain(`${DEV_IDENTITY_COOKIE}=parent_001`);
  });
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
it('드롭다운을 열면 착지점 있는 역할의 계정 전원이 보인다 — 한 역할에 계정이 둘인 것까지', () => {
  render(<DevRoleSwitch role="student" />);
  fireEvent.click(screen.getByRole('button', { name: '개발용 계정 전환' }));

  const menu = screen.getByRole('menu');
  expect(within(menu).getByText('dev · 계정 바꾸기')).toBeInTheDocument();
  const links = Array.from(menu.querySelectorAll('a'));
  // allowlist 중 **착지점이 있는** 역할의 계정만 — 각자 자기 역할의 홈으로 간다.
  expect(links.map((a) => a.getAttribute('href'))).toEqual([
    '/classbot', '/classbot', '/teacher', '/teacher', '/parent',
  ]);
  for (const label of [
    '학생 · 서연', '학생 · 민준', '교사 · 김수학', '교사 · 박영어', '학부모 · 어머니',
  ]) {
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
