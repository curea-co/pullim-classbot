import {
  assignmentListHref,
  buildRows,
  filterRows,
  isDueSoon,
  sortRows,
  statusOf,
  summarize,
  toModeFilter,
  toStatusFilter,
  type BotFacts,
} from '../assignment-filters';
import type { Submission, UserAssignment } from '@/lib/store/assignments';

/** 판정에 쓰이는 칸만 채운 과제 — 나머지는 화면이 그릴 뿐 규칙이 읽지 않는다. */
function make(over: Partial<UserAssignment> = {}): UserAssignment {
  return {
    id: 'as_1',
    botId: 'cb_001',
    title: '도함수 마무리',
    scope: '미적분 III',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: 'a',
    chapterTo: 'b',
    achievementCodes: [],
    questionCount: 5,
    difficulty: '중',
    mode: 'practice',
    source: 'teacher-assigned',
    assignedBy: '수학이 형',
    assignedAt: '오늘 19:50',
    dueLabel: '내일 22:00',
    dDay: 'D-3',
    completedCount: 0,
    state: 'todo',
    solveHref: '/x',
    dispatchStatus: 'sent',
    targetStudentIds: [],
    ...over,
  } as UserAssignment;
}

const botIndex = new Map<string, BotFacts>([
  ['cb_001', {
    botId: 'cb_001',
    botName: '수학이 형',
    avatarEmoji: '🧑‍🏫',
    classrooms: [{ classroomId: 'cr_math_a', label: '중2 수학 A반', studentCount: 18 }],
  }],
  ['cb_002', {
    botId: 'cb_002', botName: '영어 누나', avatarEmoji: '👩‍🏫', classrooms: [],
  }],
]);

describe('statusOf — 교사 시점이 학생 시점보다 먼저다', () => {
  it('회수된 과제는 이미 제출한 학생이 있어도 「회수됨」이다', () => {
    // 이걸 「진행 중」으로 읽으면 회수가 없던 일이 된다.
    expect(statusOf(make({ dispatchStatus: 'withdrawn', state: 'submitted' }))).toBe('withdrawn');
  });

  it('초안은 학생 상태를 보지 않는다', () => {
    expect(statusOf(make({ dispatchStatus: 'draft', state: 'in-progress' }))).toBe('draft');
  });

  it('낸 과제는 학생 시점으로 갈린다 — 지난 것은 마감', () => {
    expect(statusOf(make({ state: 'overdue' }))).toBe('closed');
    expect(statusOf(make({ state: 'in-progress' }))).toBe('live');
  });
});

describe('isDueSoon', () => {
  it('D-1 과 오늘만 급하다', () => {
    expect(isDueSoon(make({ dDay: 'D-1' }))).toBe(true);
    expect(isDueSoon(make({ dDay: '오늘' }))).toBe(true);
    expect(isDueSoon(make({ dDay: 'D-2' }))).toBe(false);
  });

  it('진행 중이 아니면 마감이 가까워도 급하지 않다', () => {
    // 초안은 아직 아무도 못 받았고, 회수된 과제는 이미 끝난 결정이다.
    expect(isDueSoon(make({ dDay: 'D-1', dispatchStatus: 'draft' }))).toBe(false);
    expect(isDueSoon(make({ dDay: 'D-1', dispatchStatus: 'withdrawn' }))).toBe(false);
  });
});

describe('buildRows — 대상 인원', () => {
  const noSubmissions: Submission[] = [];

  it('대상이 비어 있으면 반 전체다 (store 계약)', () => {
    const [row] = buildRows([make()], noSubmissions, botIndex);
    expect(row.targetCount).toBe(18);
    expect(row.classroomLabels).toEqual(['중2 수학 A반']);
  });

  it('대상을 골라 냈으면 그 수가 대상이다', () => {
    const [row] = buildRows([make({ targetStudentIds: ['s1', 's2'] })], noSubmissions, botIndex);
    expect(row.targetCount).toBe(2);
  });

  it('제출은 학생 수로 센다 — 한 학생이 여러 번 내도 하나다', () => {
    const subs = [
      { id: 'x1', assignmentId: 'as_1', studentId: 's1', submittedAt: '2026-09-15T00:00:00Z', answers: {}, scorePercent: 80 },
      { id: 'x2', assignmentId: 'as_1', studentId: 's1', submittedAt: '2026-09-15T01:00:00Z', answers: {}, scorePercent: 90 },
      { id: 'x3', assignmentId: 'as_1', studentId: 's2', submittedAt: '2026-09-15T02:00:00Z', answers: {}, scorePercent: 70 },
    ];
    const [row] = buildRows([make()], subs, botIndex);
    expect(row.submittedCount).toBe(2);
  });

  it('운영 기록에 반이 없는 봇도 행을 만든다 — 이름 빈 줄을 두지 않는다', () => {
    const [row] = buildRows([make({ botId: 'cb_002' })], noSubmissions, botIndex);
    expect(row.botName).toBe('영어 누나');
    expect(row.targetCount).toBe(0);
  });
});

describe('filterRows', () => {
  const rows = buildRows(
    [
      make({ id: 'a', mode: 'exam', state: 'overdue' }),
      make({ id: 'b', mode: 'practice' }),
      make({ id: 'c', botId: 'cb_002', mode: 'practice' }),
    ],
    [],
    botIndex,
  );

  it('상태·모드는 그대로 건다', () => {
    expect(filterRows(rows, { status: 'closed', mode: 'all' }, botIndex).map(r => r.assignment.id)).toEqual(['a']);
    expect(filterRows(rows, { status: 'all', mode: 'exam' }, botIndex).map(r => r.assignment.id)).toEqual(['a']);
  });

  it('반 거르기는 「그 반에 붙은 봇인가」로 옮겨 묻는다', () => {
    // 과제는 반이 아니라 봇에 달려서다 — cb_002 는 붙은 반이 없어 걸러진다.
    expect(
      filterRows(rows, { status: 'all', mode: 'all', roomId: 'cr_math_a' }, botIndex).map(r => r.assignment.id),
    ).toEqual(['a', 'b']);
  });

  it('모르는 반 id 는 빈 목록이다 — 조용히 전체를 보여 주지 않는다', () => {
    expect(filterRows(rows, { status: 'all', mode: 'all', roomId: 'cr_nope' }, botIndex)).toEqual([]);
  });
});

describe('sortRows — 급한 것이 위로', () => {
  it('급한 진행 중 → 진행 중 → 초안 → 마감 → 회수됨', () => {
    const rows = buildRows(
      [
        make({ id: 'withdrawn', dispatchStatus: 'withdrawn' }),
        make({ id: 'closed', state: 'overdue' }),
        make({ id: 'draft', dispatchStatus: 'draft' }),
        make({ id: 'live' }),
        make({ id: 'urgent', dDay: 'D-1' }),
      ],
      [],
      botIndex,
    );
    expect(sortRows(rows).map(r => r.assignment.id)).toEqual([
      'urgent', 'live', 'draft', 'closed', 'withdrawn',
    ]);
  });

  it('같은 칸 안에서는 새로 낸 것이 위다', () => {
    const rows = buildRows(
      [
        make({ id: 'old', dispatchedAt: '2026-09-01T00:00:00Z' }),
        make({ id: 'new', dispatchedAt: '2026-09-10T00:00:00Z' }),
      ],
      [],
      botIndex,
    );
    expect(sortRows(rows).map(r => r.assignment.id)).toEqual(['new', 'old']);
  });
});

describe('summarize — 거르개와 무관하게 전체를 센다', () => {
  it('진행 중·마감 임박·초안을 따로 센다', () => {
    const rows = buildRows(
      [
        make({ id: '1', dDay: 'D-1' }),
        make({ id: '2' }),
        make({ id: '3', dispatchStatus: 'draft' }),
        make({ id: '4', state: 'overdue' }),
      ],
      [],
      botIndex,
    );
    // 마감 임박은 진행 중의 부분집합이다 — 따로 빼지 않는다.
    expect(summarize(rows)).toEqual({ live: 2, dueSoon: 1, draft: 1 });
  });
});

describe('URL', () => {
  it('기본값은 주소에 적지 않는다', () => {
    expect(assignmentListHref({ status: 'all', mode: 'all' })).toBe('/teacher/assignment');
  });

  it('건 조건만 적는다', () => {
    expect(assignmentListHref({ status: 'live', mode: 'exam', botId: 'cb_001' }))
      .toBe('/teacher/assignment?status=live&mode=exam&bot=cb_001');
  });

  it('모르는 값은 기본값으로 떨어진다 — 주소를 손으로 고쳐도 깨지지 않는다', () => {
    expect(toStatusFilter('nope')).toBe('all');
    expect(toStatusFilter(null)).toBe('all');
    expect(toModeFilter('exam')).toBe('exam');
    expect(toModeFilter(undefined)).toBe('all');
  });
});
