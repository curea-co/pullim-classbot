import { LESSON_FLOW_KEYS } from '../chat';
import { quickReplyChipKind } from '../classbot-dynamic-replies';

describe('LESSON_FLOW_KEYS', () => {
  it('수업 흐름키 4개 (개념/예제/퀴즈/다음)', () => {
    expect(LESSON_FLOW_KEYS).toHaveLength(4);
    expect([...LESSON_FLOW_KEYS]).toEqual([
      'lesson_concept', 'lesson_example', 'lesson_quiz', 'lesson_next',
    ]);
  });
});

describe('quickReplyChipKind', () => {
  it.each(LESSON_FLOW_KEYS)('수업 흐름키 %s → guide', key => {
    expect(quickReplyChipKind(key)).toBe('guide');
  });

  it.each(['today_summary', 'exam_prep', 'reassurance', 'extremum'] as const)(
    '비흐름키 %s → ask',
    key => {
      expect(quickReplyChipKind(key)).toBe('ask');
    },
  );
});
