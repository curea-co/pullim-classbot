import { render, screen, act } from '@testing-library/react';
import { TeacherCommentCard } from '../teacher-comment-card';
import { useInterventionStore } from '@/lib/store/interventions';

beforeEach(() => useInterventionStore.setState({ events: [] }));

it('해당 과제·학생의 comment 가 있으면 "선생님 한마디" 카드를 렌더한다', () => {
  act(() =>
    useInterventionStore.getState().send({
      type: 'comment', botId: 'cb_001', studentId: 's1', assignmentId: 'as_1',
      message: '오답 정리가 훌륭했어요. 다음엔 시간 배분만 신경 써봐요!',
    }),
  );
  render(<TeacherCommentCard assignmentId="as_1" studentId="s1" />);
  expect(screen.getByText('선생님 한마디')).toBeTruthy();
  expect(screen.getByText(/오답 정리가 훌륭했어요/)).toBeTruthy();
});

it('comment 가 없으면 아무것도 렌더하지 않는다', () => {
  const { container } = render(<TeacherCommentCard assignmentId="as_1" studentId="s1" />);
  expect(container.firstChild).toBeNull();
});

it('다른 과제/학생의 comment 는 표시하지 않는다', () => {
  act(() =>
    useInterventionStore.getState().send({
      type: 'comment', botId: 'cb_001', studentId: 's2', assignmentId: 'as_1', message: '남의 것',
    }),
  );
  const { container } = render(<TeacherCommentCard assignmentId="as_1" studentId="s1" />);
  expect(container.firstChild).toBeNull();
});
