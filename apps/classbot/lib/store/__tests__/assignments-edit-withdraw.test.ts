/**
 * 낸 과제 고치기·회수 — 이 스토어가 지키는 계약 셋만 본다 (`proc/spec/14 § 3.3.5`·`§ 3.3.6`·`§ 5.3`).
 *  1) 회수는 **지우지 않는다** — 제출 기록이 남는다
 *  2) patch 로 신원·내기 상태를 못 바꾼다 (고치기와 내기/회수는 다른 일이다)
 *  3) 되돌리면 회수 흔적(`withdrawnAt`)이 지워진다
 */
import { useAssignmentStore, type Submission, type UserAssignment } from '../assignments';

function make(over: Partial<UserAssignment> = {}): UserAssignment {
  return {
    id: 'as_1', botId: 'cb_001', title: '도함수 마무리', scope: '미적분 III',
    subject: '수학Ⅱ', grade: '고2', chapterFrom: 'a', chapterTo: 'b',
    achievementCodes: [], questionCount: 5, difficulty: '중', mode: 'practice',
    source: 'teacher-assigned', assignedBy: '수학이 형', assignedAt: '오늘 19:50',
    dueLabel: '내일 22:00', dDay: 'D-1', completedCount: 0, state: 'in-progress',
    solveHref: '/x', dispatchStatus: 'sent', targetStudentIds: [],
    ...over,
  } as UserAssignment;
}

const submission: Submission = {
  id: 'sub_1', assignmentId: 'as_1', studentId: 's1',
  submittedAt: '2026-09-15T10:00:00.000Z', answers: {}, scorePercent: 80,
};

beforeEach(() => {
  useAssignmentStore.setState({
    dispatched: [make()], drafts: [], submissions: [submission], lastDispatched: null,
  });
});

describe('withdraw', () => {
  it('학생 목록에서 내리되 제출 기록은 남긴다', () => {
    // 지우기로 만들면 회수가 곧 증거 인멸이 된다 (§ 5.3).
    useAssignmentStore.getState().withdraw('as_1');
    const s = useAssignmentStore.getState();
    expect(s.dispatched[0].dispatchStatus).toBe('withdrawn');
    expect(s.dispatched[0].withdrawnAt).toEqual(expect.any(String));
    expect(s.submissions).toHaveLength(1);
  });

  it('과제가 목록에서 사라지지는 않는다 — 교사는 회수한 것도 본다', () => {
    useAssignmentStore.getState().withdraw('as_1');
    expect(useAssignmentStore.getState().dispatched).toHaveLength(1);
  });

  it('없는 id 는 아무것도 바꾸지 않는다', () => {
    const before = useAssignmentStore.getState().dispatched;
    useAssignmentStore.getState().withdraw('as_nope');
    expect(useAssignmentStore.getState().dispatched[0]).toEqual(before[0]);
  });
});

describe('restore', () => {
  it('되돌리면 회수 흔적이 지워진다', () => {
    const store = useAssignmentStore.getState();
    store.withdraw('as_1');
    store.restore('as_1');
    const a = useAssignmentStore.getState().dispatched[0];
    expect(a.dispatchStatus).toBe('sent');
    expect(a.withdrawnAt).toBeUndefined();
  });
});

describe('updateDispatched', () => {
  it('열린 칸은 그대로 덮는다', () => {
    useAssignmentStore.getState().updateDispatched('as_1', {
      title: '도함수 마무리(수정)', dueLabel: '모레 22:00', dDay: 'D-2',
    });
    const a = useAssignmentStore.getState().dispatched[0];
    expect(a.title).toBe('도함수 마무리(수정)');
    expect(a.dDay).toBe('D-2');
  });

  it('신원과 내기 상태는 patch 로 못 바꾼다', () => {
    // 그 둘은 고치기가 아니라 다른 일(내기·회수)이라 각자의 액션이 있다.
    useAssignmentStore.getState().updateDispatched('as_1', {
      id: 'as_hijack', dispatchStatus: 'withdrawn', withdrawnAt: '2026-01-01T00:00:00.000Z',
      title: '제목만 바뀐다',
    } as Partial<UserAssignment>);
    const a = useAssignmentStore.getState().dispatched[0];
    expect(a.id).toBe('as_1');
    expect(a.dispatchStatus).toBe('sent');
    expect(a.withdrawnAt).toBeUndefined();
    expect(a.title).toBe('제목만 바뀐다');
  });

  it('초안도 같은 액션으로 고친다 — 잠금은 화면이 정한다', () => {
    useAssignmentStore.setState({ dispatched: [], drafts: [make({ id: 'as_d', dispatchStatus: 'draft' })] });
    useAssignmentStore.getState().updateDispatched('as_d', { title: '초안 수정' });
    expect(useAssignmentStore.getState().drafts[0].title).toBe('초안 수정');
  });
});
