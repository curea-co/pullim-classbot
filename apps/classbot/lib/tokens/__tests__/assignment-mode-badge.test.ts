/**
 * 과제 모드 배지가 화면마다 갈리지 않게 못 박는다.
 *
 * 종전에 이 표가 네 곳에 복제돼 있어서 한 곳만 고치면 같은 과제가 목록에서는 레몬,
 * 상세에서는 파랑으로 보였다. 지금은 `assignmentModeBadge` 하나를 모두가 읽는다 —
 * 그 사실이 깨지면 여기서 먼저 걸린다.
 */
import { assignmentModeBadge } from '../assignment-state';
import { modeMeta as studentListMode } from '@/app/(student)/classbot/assignment/page';
import { modeMeta as teacherOpsMode } from '@/app/(teacher)/teacher/classbot/page';

const MODES = ['practice', 'exam', 'wrong-conquest'] as const;

it('세 모드가 서로 다른 면을 쓴다 — 파랑 계열로 뭉개지지 않는다 [08 § 15.6]', () => {
  const bgs = MODES.map(m => assignmentModeBadge[m].bg);
  expect(new Set(bgs).size).toBe(MODES.length);
});

it('오답정복은 레몬, 시험은 반전 면(navy) [08 § 15.6]', () => {
  expect(assignmentModeBadge['wrong-conquest'].bg).toMatch(/lemon/);
  expect(assignmentModeBadge.exam.bg).toMatch(/slate-900/);
  // 시험은 오류가 아니다 — 빨강을 쓰지 않는다
  expect(assignmentModeBadge.exam.bg).not.toMatch(/danger/);
  expect(assignmentModeBadge.exam.outline).not.toMatch(/danger/);
});

it('레몬 면 위 글자는 레몬 잉크다 — 흰 글씨는 안 읽힌다', () => {
  expect(assignmentModeBadge['wrong-conquest'].fg).toMatch(/lemon-ink/);
});

it('목록 화면들이 진실원과 같은 면을 쓴다 — 목록과 상세가 갈리지 않는다', () => {
  for (const m of MODES) {
    expect(studentListMode[m].color).toBe(assignmentModeBadge[m].bg);
    expect(teacherOpsMode[m].color).toBe(assignmentModeBadge[m].bg);
    expect(studentListMode[m].label).toBe(assignmentModeBadge[m].label);
  }
});
