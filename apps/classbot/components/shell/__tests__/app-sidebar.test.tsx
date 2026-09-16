/**
 * 학생 사이드바의 중첩(결정 ④ · 2026-09-16 · `apps/classbot/CLAUDE.md § 5` ㉠).
 *
 * `MobileDrawer` 가 그리는 표면이다(`AppSidebarRail` 래퍼는 지금 참조 0) — 배포 셸의 `OsRail` 쪽은
 * `nav-adapter.test.ts` 가 못박는다. 여기서 보는 것은 셋: 「봇 대화」가 「내 수업방」 아래 `data-depth=1` 행으로 서는가 ·
 * `/classbot/chat` 과 커리큘럼(`/classbot/learn/*`)에서 그 행이 켜지는가(`findActiveSubHref` 의 matchPrefix) ·
 * compact 모드에서도 행이 남는가.
 */
import { render, screen } from '@testing-library/react';

let pathname = '/classbot/chat';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

import { AppSidebar, findActiveSubHref } from '../app-sidebar';
import { classbotStudentSection } from '../nav-config';

const chatRow = () => screen.getByRole('link', { name: '봇 대화' });

describe('findActiveSubHref — 중첩 항목과 matchPrefix 까지 본다', () => {
  it.each([
    ['/classbot/chat', '/classbot/chat'],
    ['/classbot/learn/t1', '/classbot/chat'],
    ['/classbot/learn/t1/u1', '/classbot/chat'],
    ['/classbot/classroom', '/classbot/classroom'],
    ['/classbot/assignment/a1', '/classbot/assignment'],
    ['/classbot', '/classbot'],
  ])('%s → %s', (path, expected) => {
    expect(findActiveSubHref(path, classbotStudentSection)).toBe(expected);
  });

  it('도메인 밖 경로는 undefined — 안쪽 경로는 종전대로 홈(`/classbot`)이 접두사로 받는다', () => {
    expect(findActiveSubHref('/teacher/bots', classbotStudentSection)).toBeUndefined();
    expect(findActiveSubHref('/classbot/me', classbotStudentSection)).toBe('/classbot');
  });
});

describe('AppSidebar(student) — 봇 대화는 내 수업방 아래 한 단계', () => {
  beforeEach(() => {
    pathname = '/classbot/chat';
  });

  it('풀 모드: depth-1 행으로 서고, 지금 경로라 켜진다', () => {
    render(<AppSidebar role="student" />);
    const li = chatRow().closest('li');
    expect(li).toHaveAttribute('data-depth', '1');
    // 그 위 층은 「내 수업방」이다.
    expect(li?.parentElement?.closest('li')).toHaveAttribute('data-depth', '0');
    expect(li?.parentElement?.closest('li')?.querySelector('a')).toHaveAttribute('href', '/classbot/classroom');
    expect(chatRow()).toHaveAttribute('aria-current', 'page');
    // 형제 「받은 과제」는 첫 층 그대로.
    expect(screen.getByRole('link', { name: '받은 과제' }).closest('li')).toHaveAttribute('data-depth', '0');
  });

  it('커리큘럼 경로에서도 봇 대화가 켜진다 — 배포 레일과 같은 판정', () => {
    pathname = '/classbot/learn/t1';
    render(<AppSidebar role="student" />);
    expect(chatRow()).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '내 수업방' })).not.toHaveAttribute('aria-current');
  });

  it('compact 모드에도 행이 남는다(아이콘 전용 · title 로 이름을 든다)', () => {
    render(<AppSidebar role="student" compact />);
    const link = screen.getByTitle('봇 대화');
    expect(link).toHaveAttribute('href', '/classbot/chat');
    expect(link.closest('li')).toHaveAttribute('data-depth', '1');
  });
});
