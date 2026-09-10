import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { modeMeta as studentModeMeta } from '@/app/(student)/classbot/assignment/page';
import { modeMeta as teacherModeMeta } from '@/app/(teacher)/teacher/classbot/page';
import { modeMeta as detailModeMeta } from '@/components/classbot/assignment-overview-header';

/**
 * 과제 모드 배지 3종 구분력 잠금.
 *
 * 권위: [08-design-system § 15.6](proc/spec/08-design-system.md) —
 *   「뱃지 3종(연습/오답정복/시험)이 모두 파랑 계열로 보이던 회귀를 **해결**」
 *
 * 회귀 이력 둘:
 *  ① 시험 배지를 빨강에서 navy 로 옮기면서 연습(blue-400)·오답정복(blue-700)·시험(navy)이
 *     전부 파랑 계열로 뭉갰다. 그래서 「셋이 서로 다르다」를 색 이름 나열이 아니라
 *     **면이 갈리는지**로 검사한다.
 *  ② 같은 표를 화면마다 손으로 베껴 두어 목록·상세·교사 화면이 갈렸다. 그래서
 *     `assignmentModeBadge` 한 곳만 진실원으로 두고, **세 소비자가 거기서 파생되는지**를 검사한다.
 */

describe('assignmentModeBadge — 진실원', () => {
  it('세 모드의 면이 서로 다르다 (모두 파랑 계열로 뭉개지지 않는다)', () => {
    const faces = [
      assignmentModeBadge.practice.bg,
      assignmentModeBadge['wrong-conquest'].bg,
      assignmentModeBadge.exam.bg,
    ];
    expect(new Set(faces).size).toBe(3);
  });

  it('오답정복은 레몬 면이다 ([08 § 15.6] accent.lime)', () => {
    expect(assignmentModeBadge['wrong-conquest'].bg).toBe('bg-pullim-lemon');
  });

  it('시험은 navy 반전 면이다 ([08 § 15.6] surface.inverse) — 빨강이 아니다', () => {
    expect(assignmentModeBadge.exam.bg).toBe('bg-pullim-slate-900');
    expect(assignmentModeBadge.exam.bg).not.toMatch(/danger/);
  });

  it('파랑 계열 면은 연습 하나뿐이다', () => {
    const blues = [
      assignmentModeBadge.practice.bg,
      assignmentModeBadge['wrong-conquest'].bg,
      assignmentModeBadge.exam.bg,
    ].filter(c => c.includes('pullim-blue'));
    expect(blues).toEqual(['bg-pullim-blue-400']);
  });

  it('각 면 위 글자색이 그 면에서 읽힌다 — 레몬 위 흰 글씨 금지', () => {
    expect(assignmentModeBadge['wrong-conquest'].fg).toBe('text-pullim-lemon-ink');
    expect(assignmentModeBadge.practice.fg).toBe('text-white');
    expect(assignmentModeBadge.exam.fg).toBe('text-white');
  });

  it('세 모드가 서로 다른 라벨을 갖는다 — 색을 못 읽어도 갈린다', () => {
    const labels = [
      assignmentModeBadge.practice.label,
      assignmentModeBadge['wrong-conquest'].label,
      assignmentModeBadge.exam.label,
    ];
    expect(new Set(labels).size).toBe(3);
  });
});

/**
 * 같은 과제가 화면마다 다르게 읽히면 안 된다.
 * 학생 목록 · 교사 목록 · 과제 상세 헤더 — 셋 다 진실원에서 파생돼야 한다.
 */
const CONSUMERS = [
  ['학생 받은 과제 목록', studentModeMeta],
  ['교사 낸 과제 목록', teacherModeMeta],
  ['과제 개요 헤더(상세)', detailModeMeta],
] as const;

describe.each(CONSUMERS)('%s — 진실원에서 파생된다', (_name, meta) => {
  it.each(['practice', 'exam', 'wrong-conquest'] as const)('%s 배지가 진실원과 같다', (mode) => {
    expect(meta[mode].bg).toBe(assignmentModeBadge[mode].bg);
    expect(meta[mode].fg).toBe(assignmentModeBadge[mode].fg);
    expect(meta[mode].label).toBe(assignmentModeBadge[mode].label);
  });

  it('세 모드가 서로 다른 아이콘을 갖는다 — 색을 못 읽어도 갈린다', () => {
    const icons = [meta.practice.icon, meta['wrong-conquest'].icon, meta.exam.icon];
    expect(new Set(icons).size).toBe(3);
  });
});
