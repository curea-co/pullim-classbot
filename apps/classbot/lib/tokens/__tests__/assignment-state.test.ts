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
  expect(getAssignmentVisual(base({ dDay: '오늘' })).linerHex).toBe(palette.warning[600]);
  expect(getAssignmentVisual(base({})).linerHex).toBe(palette.primary[50]);
  expect(getAssignmentVisual(base({})).linerHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
});
