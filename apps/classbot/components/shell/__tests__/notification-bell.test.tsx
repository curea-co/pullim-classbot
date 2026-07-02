import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationBell, NotificationInbox } from '../notification-bell';
import { useInterventionStore } from '@/lib/store/interventions';

// 벨은 현재 학생(roster me) 수신함 — 데모 폴백 s1(서연) 로 mock (replay-recap 테스트 관례).
jest.mock('@/lib/current-user', () => ({
  useRosterMe: () => ({ id: 's1', name: '서연' }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const send = (over: Partial<Parameters<ReturnType<typeof useInterventionStore.getState>['send']>[0]> = {}) =>
  useInterventionStore.getState().send({
    type: 'remind', botId: 'cb_001', studentId: 's1',
    assignmentId: 'as_1', message: "'도함수' 과제가 아직 제출 전이에요", ...over,
  });

beforeEach(() => useInterventionStore.setState({ events: [] }));

it('미읽음 N건 → 벨에 숫자 배지 + aria-label (색 단독 신호 금지)', () => {
  act(() => { send(); send({ type: 'crisis', assignmentId: undefined, message: '힘내!' }); });
  render(<NotificationBell />);
  const bell = screen.getByRole('button', { name: /읽지 않은 알림 2개/ });
  expect(bell).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
});

it('미읽음 0건 → 배지 없음, 기본 알림 레이블', () => {
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: '알림' })).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
});

it('인박스 — 항목 문구·딥링크 렌더, 클릭 시 읽음 처리', () => {
  act(() => send());
  const [e] = useInterventionStore.getState().events;
  render(<NotificationInbox studentId="s1" />);
  expect(screen.getByText(/아직 제출 전이에요/)).toBeTruthy();
  const item = screen.getByRole('link');
  expect(item.getAttribute('href')).toBe('/classbot/assignment/as_1'); // remind → 과제 상세
  fireEvent.click(item);
  expect(useInterventionStore.getState().events.find((x) => x.id === e.id)?.readAt).toBeTruthy();
});

it('인박스 — comment 는 결과 페이지로, crisis 는 챗으로 딥링크', () => {
  act(() => {
    send({ type: 'comment', message: '잘했어요!' });
    send({ type: 'crisis', assignmentId: undefined, message: '천천히 가도 돼요' });
  });
  render(<NotificationInbox studentId="s1" />);
  const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
  expect(hrefs).toContain('/classbot/assignment/as_1/result');
  expect(hrefs).toContain('/classbot/chat');
});

it('인박스 — 비어 있으면 빈 상태 문구', () => {
  render(<NotificationInbox studentId="s1" />);
  expect(screen.getByText(/새 알림이 없어요/)).toBeTruthy();
});
