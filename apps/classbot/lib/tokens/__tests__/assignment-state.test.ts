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
  expect(getAssignmentVisual(base({ mode: 'wrong-conquest' })).linerHex).toBe(palette.gray[300]);
  expect(getAssignmentVisual(base({ state: 'overdue' })).linerHex).toBe(palette.danger[600]);
  expect(getAssignmentVisual(base({ dDay: '오늘' })).linerHex).toBe(palette.primary[800]);
  expect(getAssignmentVisual(base({})).linerHex).toBe(palette.primary[50]);
  expect(getAssignmentVisual(base({})).linerHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
});

/**
 * 색 규약 잠금 — [08 § 1.3] success/warn deprecated · [§ 1.6] 레몬은 키 CTA 한정.
 * 과제 카드는 한 화면에 여러 장 깔리므로 이 셋 중 어느 것도 쓰지 않는다.
 */
it('과제 카드 시각 토큰에 success·warn·lemon 이 없다', () => {
  const all = [
    base({ mode: 'exam' }),
    base({ mode: 'wrong-conquest' }),
    base({ state: 'submitted' }),
    base({ state: 'overdue' }),
    base({ dDay: '오늘' }),
    base({}),
  ].map(getAssignmentVisual);

  for (const v of all) {
    const classes = `${v.progressClass} ${v.dDayChipClass}`;
    expect(classes).not.toMatch(/pullim-(success|warn|lemon)/);
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
