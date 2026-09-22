/**
 * 낸 과제 목록의 규칙 — 정본 행(`AssignmentSummaryDto`) 위에서. 상태(진행 중·마감)·마감 임박·거르기·정렬·요약·URL.
 * 마감은 **지금 기준**이다 — 낼 때 굳힌 `dDay` 를 `dispatchedAt` 로 다시 센다(`remainingDDay`). 그래서 `now` 를 넣는다.
 */
import {
  assignmentListHref,
  buildRows,
  filterRows,
  isDueSoon,
  modeOf,
  remainingOf,
  sortRows,
  statusOf,
  summarize,
  toModeFilter,
  toStatusFilter,
  toTeacherClass,
  type TeacherClass,
} from '../assignment-filters';
import type { AssignmentSummaryDto, BotCardDto } from '@/lib/api/classbot-dto';

/** 2026-09-16 12:00 (로컬) — 아래 fixture 가 낸 날. 그날 보면 굳힌 dDay 가 그대로 남은 날수다. */
const NOW = new Date(2026, 8, 16, 12, 0).getTime();
const DAY = 86_400_000;
const dispatchedDaysAgo = (n: number) => new Date(2026, 8, 16 - n, 8, 0).toISOString();

function make(over: Partial<AssignmentSummaryDto> = {}): AssignmentSummaryDto {
  return {
    id: 'asg_1',
    classId: 'cls_1',
    title: '도함수 마무리',
    scope: '미적분 III',
    subject: '수학Ⅱ',
    grade: '고2',
    mode: 'practice',
    questionCount: 5,
    difficulty: '중',
    dueLabel: '내일 22:00',
    dDay: 1,
    dispatchStatus: 'sent',
    dispatchedAt: dispatchedDaysAgo(0),
    examTimeLimitMin: null,
    state: 'todo',
    chapterFrom: null,
    chapterTo: null,
    achievementCodes: null,
    ...over,
  };
}

const CLASSES = new Map<string, TeacherClass>([
  ['cls_1', { id: 'cls_1', name: '고2 미적분 A반', subject: '수학Ⅱ', grade: '고2', enrolledCount: 12, isActive: true }],
]);

describe('toTeacherClass — 정본 반 카드(useOperatorClasses)에서 과제 축이 읽는 칸만', () => {
  /** `name`(봇 이름)과 `className`(반 이름)에 **다른 글자** — 같으면 어느 칸을 읽든 통과한다(#679). */
  const withProfile: BotCardDto = {
    id: 'cls_1', botId: 'bot_math', name: '미적분 도우미', className: '고2 미적분 A반',
    description: null, isActive: true, role: 'teacher',
    profile: {
      subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '🤖',
      quickPrompts: [], enrolledCount: 12, isLive: false, currentLesson: null,
    },
  };
  const withoutProfile: BotCardDto = {
    id: 'cls_2', botId: null, name: '중3 국어 B반', className: '중3 국어 B반',
    description: null, isActive: false, role: 'teacher', profile: null,
  };

  it('프로필이 있으면 과목·학년·인원을 그대로, 없으면 빈 문자열·null', () => {
    expect(toTeacherClass(withProfile)).toEqual({ id: 'cls_1', name: '고2 미적분 A반', subject: '수학Ⅱ', grade: '고2', enrolledCount: 12, isActive: true });
    expect(toTeacherClass(withoutProfile)).toEqual({ id: 'cls_2', name: '중3 국어 B반', subject: '', grade: '', enrolledCount: null, isActive: false });
  });

  it('`name` 칸은 반 이름이다 — 이 칸이 과제 배포 드롭다운의 선택지 라벨이다', () => {
    expect(toTeacherClass(withProfile).name).toBe('고2 미적분 A반');
    expect(toTeacherClass(withProfile).name).not.toBe('미적분 도우미');
  });

  it('같은 봇을 건 두 반은 과목·학년까지 같다 — 갈리는 것은 반 이름뿐이다(오배포 방지)', () => {
    const a = toTeacherClass({ ...withProfile, id: 'cls_a', className: '중2 수학 A반' });
    const b = toTeacherClass({ ...withProfile, id: 'cls_b', className: '중2 수학 B반' });
    expect(a.subject).toBe(b.subject);
    expect(a.grade).toBe(b.grade);
    expect(a.name).not.toBe(b.name);
  });

  it('`className` 이 없는 옛 응답(#679 배포 전)은 `name` 으로 떨어진다 — 선택지가 비지 않는다', () => {
    const legacy: BotCardDto = { id: 'cls_9', name: '고1 통합과학', description: null, isActive: true, role: 'teacher', profile: null };
    expect(toTeacherClass(legacy).name).toBe('고1 통합과학');
  });
});

describe('remainingOf · statusOf — 굳힌 dDay 를 지금 기준으로 다시 센다', () => {
  it('낸 날에는 굳힌 값 그대로 — 0 이상이면 진행 중', () => {
    expect(remainingOf(make({ dDay: 0 }), NOW)).toBe(0);
    expect(statusOf(make({ dDay: 0 }), NOW)).toBe('live');
    expect(statusOf(make({ dDay: 7 }), NOW)).toBe('live');
  });
  it('D-3 으로 닷새 전에 낸 과제는 오늘 마감이 지났다 — 굳힌 값으로는 영영 안 오던 「마감」', () => {
    const a = make({ dDay: 3, dispatchedAt: dispatchedDaysAgo(5) });
    expect(remainingOf(a, NOW)).toBe(-2);
    expect(statusOf(a, NOW)).toBe('closed');
  });
  it('시간이 흐르면 같은 행의 상태가 바뀐다', () => {
    const a = make({ dDay: 1 });
    expect(statusOf(a, NOW)).toBe('live');
    expect(statusOf(a, NOW + 2 * DAY)).toBe('closed');
  });
});

describe('isDueSoon — 오늘·내일이면 급하다, 진행 중일 때만', () => {
  it('내일(1)·오늘(0)은 급하다', () => {
    expect(isDueSoon(make({ dDay: 1 }), NOW)).toBe(true);
    expect(isDueSoon(make({ dDay: 0 }), NOW)).toBe(true);
  });
  it('이틀 뒤는 안 급하다 — 그러나 하루 지나면 급해진다', () => {
    const a = make({ dDay: 2 });
    expect(isDueSoon(a, NOW)).toBe(false);
    expect(isDueSoon(a, NOW + DAY)).toBe(true);
  });
  it('마감이 지났으면 급한 것이 아니라 끝난 것이다', () => {
    expect(isDueSoon(make({ dDay: 1 }), NOW + 3 * DAY)).toBe(false);
  });
});

describe('modeOf — 서버 string 을 화면 union 으로', () => {
  it('아는 값은 그대로, 낯선 값은 연습으로 접는다', () => {
    expect(modeOf(make({ mode: 'exam' }))).toBe('exam');
    expect(modeOf(make({ mode: 'wrong-conquest' }))).toBe('wrong-conquest');
    expect(modeOf(make({ mode: 'weird' }))).toBe('practice');
  });
});

describe('buildRows — 반 이름 조인 · 지금 기준 라벨', () => {
  it('반 목록에서 이름·과목을 채우고, 못 찾으면 과제 행의 과목으로 떨어진다', () => {
    const [known, unknown] = buildRows([make(), make({ id: 'asg_2', classId: 'cls_x', subject: '국어' })], CLASSES, NOW);
    expect(known.className).toBe('고2 미적분 A반');
    expect(known.subject).toBe('수학Ⅱ');
    expect(unknown.className).toBe('');
    expect(unknown.subject).toBe('국어');
  });
  it('dDay 라벨은 남은 날수에서 만든다 — 이틀 전에 D-3 으로 낸 과제는 「내일」', () => {
    const [row] = buildRows([make({ dDay: 3, dispatchedAt: dispatchedDaysAgo(2) })], CLASSES, NOW);
    expect(row.dDayLabel).toBe('내일');
    expect(row.dueSoon).toBe(true);
    expect(row.dueLabel).toBe('내일 22:00');
  });
  it('지난 마감은 「지난 n일」', () => {
    const [row] = buildRows([make({ dDay: 3, dispatchedAt: dispatchedDaysAgo(5) })], CLASSES, NOW);
    expect(row.dDayLabel).toBe('지난 2일');
    expect(row.status).toBe('closed');
  });
});

describe('filterRows', () => {
  const rows = buildRows(
    [
      make({ id: 'live', dDay: 3 }),
      make({ id: 'closed', dDay: 1, dispatchedAt: dispatchedDaysAgo(3) }),
      make({ id: 'exam', mode: 'exam', classId: 'cls_2' }),
    ],
    CLASSES,
    NOW,
  );

  it('「전체」는 전부다', () => {
    expect(filterRows(rows, { status: 'all', mode: 'all' }).map((r) => r.assignment.id)).toEqual(['live', 'closed', 'exam']);
  });
  it('상태·모드·반은 그대로 건다', () => {
    expect(filterRows(rows, { status: 'closed', mode: 'all' }).map((r) => r.assignment.id)).toEqual(['closed']);
    expect(filterRows(rows, { status: 'all', mode: 'exam' }).map((r) => r.assignment.id)).toEqual(['exam']);
    expect(filterRows(rows, { status: 'all', mode: 'all', classId: 'cls_2' }).map((r) => r.assignment.id)).toEqual(['exam']);
  });
  it('모르는 반 id 는 빈 목록이다 — 조용히 전체를 보여 주지 않는다', () => {
    expect(filterRows(rows, { status: 'all', mode: 'all', classId: 'cls_nope' })).toEqual([]);
  });
});

describe('sortRows — 급한 것이 위로', () => {
  it('급한 진행 중 → 진행 중 → 마감, 같은 칸에서는 새로 낸 것이 위', () => {
    const rows = buildRows(
      [
        make({ id: 'closed', dDay: 0, dispatchedAt: dispatchedDaysAgo(1) }),
        make({ id: 'old-live', dDay: 5, dispatchedAt: new Date(2026, 8, 16, 7).toISOString() }),
        make({ id: 'new-live', dDay: 5, dispatchedAt: new Date(2026, 8, 16, 9).toISOString() }),
        make({ id: 'soon', dDay: 0 }),
      ],
      CLASSES,
      NOW,
    );
    expect(sortRows(rows).map((r) => r.assignment.id)).toEqual(['soon', 'new-live', 'old-live', 'closed']);
  });
});

describe('summarize — 거르개와 무관하게 전체를 센다', () => {
  it('진행 중·마감 임박·마감을 따로 센다', () => {
    const rows = buildRows(
      [make({ id: 'a', dDay: 0 }), make({ id: 'b', dDay: 4 }), make({ id: 'c', dDay: 1, dispatchedAt: dispatchedDaysAgo(3) })],
      CLASSES,
      NOW,
    );
    expect(summarize(rows)).toEqual({ live: 2, dueSoon: 1, closed: 1 });
  });
});

describe('URL', () => {
  it('기본값은 주소에 적지 않는다', () => {
    expect(assignmentListHref({ status: 'all', mode: 'all' })).toBe('/teacher/assignment');
  });
  it('건 조건만 적는다 — 반은 `class` 한 칸이다', () => {
    expect(assignmentListHref({ status: 'live', mode: 'all', classId: 'cls_1' })).toBe('/teacher/assignment?status=live&class=cls_1');
  });
  it('모르는 값은 기본값으로 떨어진다 — 정본에 없는 「회수됨」도 그렇다', () => {
    expect(toStatusFilter('weird')).toBe('all');
    expect(toStatusFilter('withdrawn')).toBe('all');
    expect(toStatusFilter(null)).toBe('all');
    expect(toModeFilter('weird')).toBe('all');
    expect(toStatusFilter('closed')).toBe('closed');
    expect(toModeFilter('exam')).toBe('exam');
  });
});
