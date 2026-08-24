import { modeMeta as studentModeMeta } from '@/app/(student)/classbot/assignment/page';
import { modeMeta as teacherModeMeta } from '@/app/(teacher)/teacher/classbot/page';

/**
 * 과제 모드 배지 3종 구분력 잠금.
 *
 * 권위: [08-design-system § 15.6](proc/spec/08-design-system.md) —
 *   「뱃지 3종(연습/오답정복/시험)이 모두 파랑 계열로 보이던 회귀를 **해결**」
 *
 * 회귀 이력: 시험 배지를 빨강(`bg-pullim-danger`)에서 navy 로 옮기면서
 * 연습(blue-400)·오답정복(blue-700)·시험(navy)이 전부 파랑 계열로 뭉갰던 적이 있다.
 * 그래서 「셋이 서로 다르다」를 색 이름 나열이 아니라 **면이 갈리는지**로 검사한다.
 *
 * 학생 목록과 교사 목록이 같은 표를 각자 들고 있어서 **두 벌 다** 건다 —
 * 한쪽만 고치면 같은 학생 과제가 화면마다 다르게 읽힌다.
 */

const TABLES = [
  ['학생 받은 과제', studentModeMeta],
  ['교사 낸 과제', teacherModeMeta],
] as const;

describe.each(TABLES)('%s — 모드 배지 3종', (_name, meta) => {
  it('세 모드의 면이 서로 다르다 (모두 파랑 계열로 뭉개지지 않는다)', () => {
    const faces = [meta.practice.color, meta['wrong-conquest'].color, meta.exam.color];
    expect(new Set(faces).size).toBe(3);
  });

  it('오답정복은 레몬 면이다 ([08 § 15.6] accent.lime)', () => {
    expect(meta['wrong-conquest'].color).toBe('bg-pullim-lemon');
  });

  it('시험은 navy 반전 면이다 ([08 § 15.6] surface.inverse) — 빨강이 아니다', () => {
    expect(meta.exam.color).toBe('bg-pullim-slate-900');
    expect(meta.exam.color).not.toMatch(/danger/);
  });

  it('연습만 브랜드 블루 계열이다 — 셋 중 파랑은 하나뿐', () => {
    const blues = [meta.practice.color, meta['wrong-conquest'].color, meta.exam.color]
      .filter(c => c.includes('pullim-blue'));
    expect(blues).toEqual(['bg-pullim-blue-400']);
  });

  it('각 면 위 글자색이 그 면에서 읽힌다 (레몬 위 흰 글씨 금지)', () => {
    expect(meta['wrong-conquest'].fg).toBe('text-pullim-lemon-ink');
    expect(meta.practice.fg).toBe('text-white');
    expect(meta.exam.fg).toBe('text-white');
  });

  it('세 모드가 서로 다른 아이콘·라벨을 갖는다 — 색을 못 읽어도 갈린다', () => {
    const icons = [meta.practice.icon, meta['wrong-conquest'].icon, meta.exam.icon];
    const labels = [meta.practice.label, meta['wrong-conquest'].label, meta.exam.label];
    expect(new Set(icons).size).toBe(3);
    expect(new Set(labels).size).toBe(3);
  });
});
