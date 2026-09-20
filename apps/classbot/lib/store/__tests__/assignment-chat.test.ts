/**
 * 과제 대화 store — 이 화면의 계약 **셋**을 지킨다.
 *  1) 대화는 assignmentId 로 갈린다 (다른 과제의 말이 섞이지 않는다)
 *  2) seed 는 멱등하다 (재진입 때 학생이 쓴 말을 덮지 않는다)
 *  3) **저장되는 말풍선에 사람 이름이 없다** — 이 store 는 localStorage 에 적히고 로그아웃해도
 *     남는다. 여는 인사의 이름은 `leadWithName` 으로 화면이 붙인다(`lib/store/assignment-chat.ts`).
 */
import { buildAssignmentChatSeed } from '@/lib/mock/classbot-assignment-chat';

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

describe('저장되는 말풍선에는 사람 이름이 없다', () => {
  // 여는 인사는 「<이름>, 「제목」 같이 풀어 보자…」로 보이지만, **보이는 것과 저장되는 것이 다르다.**
  // 저장은 이름 없는 문장 + `leadWithName` 이고, 이름은 화면이 자기 세션에서 읽어 붙인다.
  it('오프너는 이름을 문장에 끼우지 않고 leadWithName 으로 표시만 남긴다', () => {
    const seedTurns = buildAssignmentChatSeed({
      assignmentId: 'as_1',
      title: '이차함수 3단원',
      scope: '이차함수',
      questionCount: 5,
      dueLabel: '오늘 22:00',
      botName: '수학봇',
      assignedBy: '김수학 선생님',
    });

    expect(seedTurns[0]?.leadWithName).toBe(true);
    expect(seedTurns[0]?.text).toBe('「이차함수 3단원」 같이 풀어 보자. 5문항이고 오늘 22:00까지야.');
    // 어느 줄에도 사람 이름이 들어갈 자리가 없다 — 맥락에 이름 칸 자체를 두지 않았다.
    for (const t of seedTurns) expect(t.text).not.toMatch(/김수학,|, 「/);
  });
});
