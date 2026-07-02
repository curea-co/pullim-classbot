import { render, screen, fireEvent } from '@testing-library/react';
import { CrisisEncourageForm } from '../crisis-intervention-panel';
import { useInterventionStore } from '@/lib/store/interventions';
import type { ClassroomStudent } from '@/lib/mock';

const student = { id: 's3', name: '지우' } as ClassroomStudent;

beforeEach(() => useInterventionStore.setState({ events: [] }));

it('응원 메시지 입력 → 보내기 → crisis 이벤트 발신 + 보냄 상태', () => {
  render(<CrisisEncourageForm student={student} botId="cb_001" />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '지우야, 천천히 가도 괜찮아. 선생님이 응원해!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /응원 보내기/ }));

  const events = useInterventionStore.getState().events;
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: 'crisis', studentId: 's3', botId: 'cb_001',
    message: '지우야, 천천히 가도 괜찮아. 선생님이 응원해!',
  });
  expect(screen.getByText(/응원을 보냈어요/)).toBeTruthy(); // 발신 후 상태 전환
});

it('빈 입력은 보내기 비활성', () => {
  render(<CrisisEncourageForm student={student} botId="cb_001" />);
  expect(
    screen.getByRole('button', { name: /응원 보내기/ }).hasAttribute('disabled'),
  ).toBe(true);
});
