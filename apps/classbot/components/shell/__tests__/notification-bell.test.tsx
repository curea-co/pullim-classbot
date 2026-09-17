/**
 * 학생 벨 인박스 — **정본**(`GET /classbot/interventions?audience=student`)을 읽고, 읽음·모두 읽음을 낙관적으로 그린다
 * (계획 PR 5c). 훅은 mock 으로 세우고 화면만 본다.
 *
 * 못박는 것: 미읽음 배지가 숫자 + `aria-label` 인 것(색 단독 신호 금지) · 유형별 딥링크 · 항목을 누르면 그 id 로
 * 읽음 요청이 가는 것 · 「모두 읽음」이 미읽음이 있을 때만 서고 눌리는 것 · 로그인 게이트(401)와 빈 인박스가
 * 다른 말을 하는 것.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import type { InterventionDto } from '@/lib/api/classbot-dto';
import { sortedInbox, unreadCount } from '@/lib/interventions';
import { NotificationBell, NotificationInbox } from '../notification-bell';

let items: InterventionDto[] = [];
/** 훅이 갈라 주는 넷 중 어느 갈래인지 — 테스트가 갈아 끼운다. */
let state: 'ok' | 'loading' | 'signed-out' | 'error' = 'ok';
const markRead = jest.fn();
const markAllRead = jest.fn();

/** 실훅과 같은 모양(`InterventionInbox`)으로 돌려준다 — 화면은 이 넷만 본다. */
const inbox = () => ({
  items: state === 'ok' ? sortedInbox(items) : [],
  unread: state === 'ok' ? unreadCount(items) : 0,
  isLoading: state === 'loading',
  isSignedOut: state === 'signed-out',
  isError: state === 'error',
});

jest.mock('@/hooks/api/intervention', () => ({
  ...jest.requireActual('@/hooks/api/intervention'),
  useMyInterventions: () => inbox(),
  useMarkInterventionRead: () => ({ mutate: markRead, isPending: false }),
  useMarkAllInterventionsRead: () => ({ mutate: markAllRead, isPending: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

function item(over: Partial<InterventionDto> & { id: string }): InterventionDto {
  return {
    type: 'remind', botId: 'cls_1', studentId: 'sub-1', assignmentId: 'asg_1',
    message: "'기울기' 과제가 아직 제출 전이에요", createdAt: '2026-09-17T01:00:00.000Z', readAt: null, ...over,
  };
}

beforeEach(() => {
  items = [];
  state = 'ok';
  markRead.mockClear();
  markAllRead.mockClear();
});

/** 인박스만 따로 세운다 — 벨이 부르는 훅을 화면이 그대로 내려 준다. */
const renderInbox = () => render(<NotificationInbox inbox={inbox()} />);

it('미읽음 N건 → 벨에 숫자 배지 + aria-label (색 단독 신호 금지)', () => {
  items = [item({ id: 'i1' }), item({ id: 'i2', type: 'crisis', assignmentId: null, message: '힘내요' })];
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: /읽지 않은 알림 2개/ })).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('미읽음 0건 → 배지 없음, 기본 알림 레이블', () => {
  items = [item({ id: 'i1', readAt: '2026-09-17T02:00:00.000Z' })];
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: '알림' })).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
});

it('인박스 — 항목 문구·딥링크 렌더, 클릭 시 그 id 로 읽음 요청', () => {
  items = [item({ id: 'i1' })];
  renderInbox();
  expect(screen.getByText(/아직 제출 전이에요/)).toBeTruthy();
  const link = screen.getByRole('link');
  expect(link.getAttribute('href')).toBe('/classbot/assignment/asg_1'); // remind → 과제 상세
  fireEvent.click(link);
  expect(markRead).toHaveBeenCalledTimes(1);
  expect(markRead.mock.calls[0][0]).toBe('i1');
});

it('인박스 — 이미 읽은 항목은 다시 읽음 요청을 보내지 않는다', () => {
  items = [item({ id: 'i1', readAt: '2026-09-17T02:00:00.000Z' })];
  renderInbox();
  fireEvent.click(screen.getByRole('link'));
  expect(markRead).not.toHaveBeenCalled();
});

it('인박스 — comment 는 결과로, 과제 없는 crisis 는 그 반 대화로 (최신이 위)', () => {
  items = [
    item({ id: 'i1', type: 'comment', message: '잘했어요', createdAt: '2026-09-17T01:00:00.000Z' }),
    item({ id: 'i2', type: 'crisis', assignmentId: null, message: '천천히 가도 돼요', createdAt: '2026-09-17T03:00:00.000Z' }),
  ];
  renderInbox();
  const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
  expect(hrefs).toEqual(['/classbot/chat?classId=cls_1', '/classbot/assignment/asg_1/result']);
});

it('「모두 읽음」은 미읽음이 있을 때만 서고, 누르면 read-all 로 간다', () => {
  items = [item({ id: 'i1', readAt: '2026-09-17T02:00:00.000Z' })];
  const read = renderInbox();
  expect(screen.queryByTestId('inbox-read-all')).toBeNull();
  read.unmount();

  items = [item({ id: 'i1' })];
  renderInbox();
  fireEvent.click(screen.getByTestId('inbox-read-all'));
  expect(markAllRead).toHaveBeenCalledTimes(1);
});

it('비로그인은 기다림이 아니다 — 익명 방문자의 벨이 스피너에 갇히지 않는다', () => {
  // `/classbot/onboarding` 은 공개 경로라 비로그인으로도 이 벨이 선다(prod-verify 익명 레인).
  // 그때 쿼리는 `enabled:false` → v5 에서 영영 `isPending` 이므로, 화면은 `isSignedOut` 을 먼저 본다.
  state = 'signed-out';
  const gate = renderInbox();
  expect(screen.getByTestId('inbox-signed-out').textContent).toMatch(/로그인하면 알림을 볼 수 있어요/);
  expect(screen.queryByTestId('inbox-loading')).toBeNull();
  expect(screen.queryByTestId('inbox-read-all')).toBeNull();
  gate.unmount();

  // 벨 자체도 배지 없이 기본 레이블로 선다.
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: '알림' })).toBeTruthy();
});

it('기다림·장애·빈 인박스는 서로 다른 말을 한다', () => {
  state = 'loading';
  const loading = renderInbox();
  expect(screen.getByTestId('inbox-loading')).toBeTruthy();
  loading.unmount();

  state = 'error';
  const failed = renderInbox();
  expect(screen.getByTestId('inbox-error').textContent).toBe('알림을 불러오지 못했어요');
  failed.unmount();

  state = 'ok';
  renderInbox();
  expect(screen.getByText('새 알림이 없어요')).toBeTruthy();
});
