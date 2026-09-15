import {
  assignmentListHref,
  buildRows,
  filterRows,
  isDueSoon,
  progressForTargets,
  sortRows,
  statusOf,
  wholeClassSize,
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

/** 2026-09-15 18:00 고정 — 마감 판정은 시각을 보므로 기준을 못박는다. */
const NOW = new Date(2026, 8, 15, 18, 0).getTime();
/** NOW 기준 N시간 뒤(음수면 전)의 ISO. */
const iso = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();
/** buildRows·summarize 는 now 를 안 받는다 — 그 경로용으로 지금 기준 시각을 쓴다. */
const realIso = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

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

describe('isDueSoon — 라벨이 아니라 시각을 본다', () => {
  /*
    `dDay` 는 낼 때 굳는다. 그걸로 재면 「D-1 로 낸 과제」는 한 달 뒤에도 마감 임박이고,
    「D-7 로 낸 과제」는 마감 하루 전에도 안 급하다. 그래서 `dueAt` 을 본다.
  */
  it('하루 안에 닫히면 급하다', () => {
    expect(isDueSoon(make({ dueAt: iso(+3), dDay: 'D-7' }), NOW)).toBe(true);
  });

  it('하루보다 멀면 안 급하다 — 라벨이 D-1 이라도', () => {
    expect(isDueSoon(make({ dueAt: iso(+50), dDay: 'D-1' }), NOW)).toBe(false);
  });

  it('마감이 지났으면 급한 것이 아니라 끝난 것이다', () => {
    expect(isDueSoon(make({ dueAt: iso(-1) }), NOW)).toBe(false);
    expect(statusOf(make({ dueAt: iso(-1) }), NOW)).toBe('closed');
  });

  it('진행 중이 아니면 마감이 가까워도 급하지 않다', () => {
    expect(isDueSoon(make({ dueAt: iso(+3), dispatchStatus: 'draft' }), NOW)).toBe(false);
    expect(isDueSoon(make({ dueAt: iso(+3), dispatchStatus: 'withdrawn' }), NOW)).toBe(false);
  });

  it('마감 시각을 모르는 옛 행은 급하지 않은 것으로 본다', () => {
    // 모를 때 빨갛게 칠하지 않는다.
    expect(isDueSoon(make({ dueAt: undefined, dDay: 'D-1' }), NOW)).toBe(false);
  });

  it('마감 시각이 없으면 서버 판정(state)으로 떨어진다', () => {
    // BE 동기화 행은 마감 시각을 안 싣고 상태만 싣는다.
    expect(statusOf(make({ dueAt: undefined, state: 'overdue' }), NOW)).toBe('closed');
  });
});

describe('buildRows — 대상 인원', () => {
  const noSubmissions: Submission[] = [];

  it('대상이 비어 있으면 반 전체다 — 세는 곳은 학생별 현황 패널과 같은 명단이다', () => {
    /*
      종전에는 봇 운영 기록의 반 인원 합을 셌다. 그런데 화면 아래 패널·리마인드는
      `classRoster` 를 편다 — 「대상 12명」인데 명단이 18줄이 뜨고, 13명이 내면 회수 모달이
      「12명 중 13명이 이미 풀었어요」를 말했다. 패널이 보여 주는 것이 교사가 읽는 사실이다.
    */
    const [row] = buildRows([make()], noSubmissions, botIndex);
    expect(row.targetCount).toBe(wholeClassSize());
    expect(row.classroomLabels).toEqual(['중2 수학 A반']);
  });

  it('대상을 골라 냈으면 그 수가 대상이다', () => {
    const [row] = buildRows([make({ targetStudentIds: ['s1', 's2'] })], noSubmissions, botIndex);
    expect(row.targetCount).toBe(2);
  });

  it('평균도 학생당 하나로 센다 — 마지막 제출이 그 학생의 답이다', () => {
    /*
      제출은 학생 수로 세면서 평균만 제출 건으로 세면, 두 번 낸 학생이 평균을 두 배로 끌어당긴다
      (「제출 2명」인데 평균은 세 건의 평균). 세는 단위를 둘로 두지 않는다.
    */
    const subs = [
      { id: 'x1', assignmentId: 'as_1', studentId: 's1', submittedAt: '2026-09-15T00:00:00Z', answers: {}, scorePercent: 80 },
      { id: 'x2', assignmentId: 'as_1', studentId: 's1', submittedAt: '2026-09-15T01:00:00Z', answers: {}, scorePercent: 90 },
      { id: 'x3', assignmentId: 'as_1', studentId: 's2', submittedAt: '2026-09-15T02:00:00Z', answers: {}, scorePercent: 70 },
    ];
    // s1 의 마지막 답은 90 — (90 + 70) / 2 = 80. 세 건 평균(80)과 우연히 같지 않게 고른 값이다.
    expect(progressForTargets(make(), subs)).toEqual({ submittedCount: 2, avgScore: 80 });
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
    // 붙은 반이 없어도 「반 전체」의 뜻은 그대로다 — 아래 패널이 같은 명단을 펴 보이므로
    // 여기서 0 을 말하면 같은 화면이 두 숫자를 갖는다.
    expect(row.targetCount).toBe(wholeClassSize());
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
        make({ id: 'closed', dueAt: realIso(-1) }),
        make({ id: 'draft', dispatchStatus: 'draft' }),
        make({ id: 'live', dueAt: realIso(+100) }),
        make({ id: 'urgent', dueAt: realIso(+3) }),
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
        make({ id: '1', dueAt: realIso(+3) }),
        make({ id: '2', dueAt: realIso(+100) }),
        make({ id: '3', dispatchStatus: 'draft' }),
        make({ id: '4', dueAt: realIso(-1) }),
      ],
      [],
      botIndex,
    );
    // 마감 임박은 진행 중의 부분집합이다 — 따로 빼지 않는다.
    expect(summarize(rows)).toEqual({ live: 2, dueSoon: 1, draft: 1, closed: 1, scheduled: 0 });
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

describe('statusOf — 예약은 제 칸을 갖는다', () => {
  it('예약된 과제를 진행 중으로 접지 않는다', () => {
    // 접으면 회수 버튼이 붙고, 되돌릴 때 `sent` 로 굳어 예약이 조용히 사라진다.
    expect(statusOf(make({ dispatchStatus: 'scheduled' }))).toBe('scheduled');
  });

  it('예약은 마감이 가까워도 급하지 않다 — 아직 안 나갔다', () => {
    expect(isDueSoon(make({ dispatchStatus: 'scheduled', dDay: 'D-1' }))).toBe(false);
  });
});
