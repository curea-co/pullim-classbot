/**
 * 과제 대화 store — 이 화면의 계약 두 가지만 지킨다.
 *  1) 대화는 assignmentId 로 갈린다 (다른 과제의 말이 섞이지 않는다)
 *  2) seed 는 멱등하다 (재진입 때 학생이 쓴 말을 덮지 않는다)
 */
import { useAssignmentChatStore, type AssignmentChatTurn } from '../assignment-chat';

const turn = (id: string, text: string): AssignmentChatTurn => ({
  id,
  role: 'bot',
  text,
  at: 1_700_000_000_000,
});

beforeEach(() => {
  useAssignmentChatStore.setState({ byAssignment: {} });
});

describe('useAssignmentChatStore', () => {
  it('대화를 assignmentId 로 갈라 담는다', () => {
    const { seed, append } = useAssignmentChatStore.getState();
    seed('as_a', [turn('a0', 'A 오프너')]);
    seed('as_b', [turn('b0', 'B 오프너')]);
    append('as_a', { id: 'a1', role: 'student', text: 'A 질문', at: 1 });

    const { byAssignment } = useAssignmentChatStore.getState();
    expect(byAssignment.as_a.map(t => t.text)).toEqual(['A 오프너', 'A 질문']);
    expect(byAssignment.as_b.map(t => t.text)).toEqual(['B 오프너']);
  });

  it('이미 대화가 있으면 seed 가 덮지 않는다', () => {
    const { seed, append } = useAssignmentChatStore.getState();
    seed('as_a', [turn('a0', '첫 오프너')]);
    append('as_a', { id: 'a1', role: 'student', text: '학생이 쓴 말', at: 2 });

    seed('as_a', [turn('a0b', '다시 깔린 오프너')]);

    expect(useAssignmentChatStore.getState().byAssignment.as_a.map(t => t.text))
      .toEqual(['첫 오프너', '학생이 쓴 말']);
  });

  it('빈 대화에는 seed 가 들어간다', () => {
    const { seed } = useAssignmentChatStore.getState();
    seed('as_c', []);
    seed('as_c', [turn('c0', '오프너')]);

    expect(useAssignmentChatStore.getState().byAssignment.as_c).toHaveLength(1);
  });
});
