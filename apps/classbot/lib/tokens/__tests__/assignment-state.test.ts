import { getAssignmentVisual } from '../assignment-state';
import { palette } from '../palette';
import type { Assignment } from '@/lib/mock';

const base = (over: Partial<Assignment>): Assignment => ({
  id: 'a',
  botId: 'cb_001',
  title: 'Test',
  scope: 'Test scope',
  subject: 'Test',
  grade: 'Test',
  chapterFrom: 'Test',
  chapterTo: 'Test',
  achievementCodes: [],
  mode: 'practice',
  state: 'in-progress',
  dDay: 'D-5',
  questionCount: 10,
  completedCount: 2,
  difficulty: '중',
  source: 'teacher-assigned',
  assignedBy: 'Test',
  assignedAt: 'Test',
  dueLabel: 'Test',
  solveHref: 'Test',
  ...over,
} as Assignment & typeof over);

it('liner colors come from palette (no magic hex)', () => {
  expect(getAssignmentVisual(base({ mode: 'exam' })).linerHex).toBe(palette.gray[950]);
  expect(getAssignmentVisual(base({ mode: 'wrong-conquest' })).linerHex).toBe(palette.lemon.base);
  expect(getAssignmentVisual(base({ state: 'overdue' })).linerHex).toBe(palette.danger[600]);
  expect(getAssignmentVisual(base({ dDay: '오늘' })).linerHex).toBe(palette.primary[800]);
  expect(getAssignmentVisual(base({})).linerHex).toBe(palette.primary[50]);
  expect(getAssignmentVisual(base({})).linerHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
});

/** 색 규약 잠금 ① — [08 § 1.3] success/warn 은 deprecated. 어느 상태에도 쓰지 않는다. */
it('과제 카드 시각 토큰에 success·warn 이 없다', () => {
  const all = [
    base({ mode: 'exam' }),
    base({ mode: 'wrong-conquest' }),
    base({ state: 'submitted' }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(getAssignmentVisual);

  for (const v of all) {
    expect(`${v.progressClass} ${v.dDayChipClass}`).not.toMatch(/pullim-(success|warn)/);
  }
});

/**
 * 색 규약 잠금 ② — 레몬은 **오답정복 한 모드에만**.
 * [08 § 15.6] 이 「오답정복 = accent.lime · lime chip」을 못 박고 있어 그 자리는 남긴다.
 * 대신 나머지 다섯 상태로 새어 나가면 [§ 1.6] 「화면당 1~2곳」이 바로 깨지므로 여기서 막는다.
 * 진척 막대는 데이터라 오답정복에서도 블루다 — 카드가 여러 장 깔릴 때의 안전판.
 */
it('레몬은 오답정복 칩·라이너에만 쓰인다', () => {
  const wrong = getAssignmentVisual(base({ mode: 'wrong-conquest' }));
  expect(wrong.dDayChipClass).toMatch(/pullim-lemon/);
  expect(wrong.linerHex).toBe(palette.lemon.base);
  expect(wrong.progressClass).not.toMatch(/pullim-lemon/);

  const others = [
    base({ mode: 'exam' }),
    base({ state: 'submitted' }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(getAssignmentVisual);

  for (const v of others) {
    expect(`${v.progressClass} ${v.dDayChipClass}`).not.toMatch(/pullim-lemon/);
    expect(v.linerHex).not.toBe(palette.lemon.base);
  }
});

/** 색을 못 읽어도 상태를 알 수 있어야 한다 — 모든 상태에 글자 라벨이 붙는다. */
it('모든 상태가 글자 라벨을 가진다', () => {
  const labels = [
    base({ mode: 'exam' }),
    base({ mode: 'wrong-conquest' }),
    base({ state: 'submitted' }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(a => getAssignmentVisual(a).semanticLabel);

  expect(new Set(labels).size).toBe(6);
  for (const l of labels) expect(l.length).toBeGreaterThan(0);
});
