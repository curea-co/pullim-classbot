/**
 * 결과 화면 「선생님 한마디」 — 벨과 같은 정본 인박스에서 그 과제의 최신 `comment` 하나를 고른다(계획 PR 5c).
 * 서버가 수신 본인으로 이미 걸러 주므로 이 컴포넌트는 학생 id 를 들지 않는다.
 */
import { render, screen } from '@testing-library/react';
import type { InterventionDto } from '@/lib/api/classbot-dto';
import { TeacherCommentCard } from '../teacher-comment-card';

let items: InterventionDto[] = [];
jest.mock('@/hooks/api/intervention', () => ({
  useMyInterventions: () => ({
    items, unread: 0, isLoading: false, isSignedOut: false, isError: false,
  }),
}));

function item(over: Partial<InterventionDto> & { id: string }): InterventionDto {
  return {
    type: 'comment', botId: 'cls_1', studentId: 'sub-1', assignmentId: 'asg_1', message: '좋았어요',
    createdAt: '2026-09-17T01:00:00.000Z', readAt: null, ...over,
  };
}

beforeEach(() => {
  items = [];
});

it('그 과제의 comment 가 있으면 "선생님 한마디" 카드를 렌더한다', () => {
  items = [item({ id: 'i1', message: '오답 정리가 훌륭했어요. 다음엔 시간 배분만 신경 써 봐요!' })];
  render(<TeacherCommentCard assignmentId="asg_1" />);
  expect(screen.getByText('선생님 한마디')).toBeTruthy();
  expect(screen.getByText(/오답 정리가 훌륭했어요/)).toBeTruthy();
});

it('comment 가 여럿이면 가장 최근 하나만 보인다', () => {
  items = [
    item({ id: 'i1', message: '옛 말', createdAt: '2026-09-16T01:00:00.000Z' }),
    item({ id: 'i2', message: '새 말', createdAt: '2026-09-17T01:00:00.000Z' }),
  ];
  render(<TeacherCommentCard assignmentId="asg_1" />);
  expect(screen.getByText('새 말')).toBeTruthy();
  expect(screen.queryByText('옛 말')).toBeNull();
});

it('comment 가 없으면 아무것도 렌더하지 않는다 — 아직 못 읽었을 때도 마찬가지다', () => {
  const empty = render(<TeacherCommentCard assignmentId="asg_1" />);
  expect(empty.container.firstChild).toBeNull();
  empty.unmount();

  // 다른 과제의 comment · 같은 과제의 remind 는 이 카드가 아니다.
  items = [item({ id: 'i1', assignmentId: 'asg_2' }), item({ id: 'i2', type: 'remind' })];
  const { container } = render(<TeacherCommentCard assignmentId="asg_1" />);
  expect(container.firstChild).toBeNull();
});
