import { scoreExplanation } from '@/app/(student)/classbot/chat/page';
import { getSelfExplain, getBotLesson } from '@/lib/mock/classbot-lesson';

const KW = ['부호', '극대', '극소', '임계점'];

describe('scoreExplanation', () => {
  it('returns strong when ≥60% keywords match', () => {
    // 3/4 = 0.75 ≥ 0.6
    expect(scoreExplanation('부호 변화로 극대 극소를 판정', KW)).toBe('strong');
  });

  it('returns partial when ≥30% and <60% keywords match', () => {
    // 2/4 = 0.5
    expect(scoreExplanation('극대와 극소를 구분', KW)).toBe('partial');
  });

  it('returns weak when <30% keywords match', () => {
    // 1/4 = 0.25
    expect(scoreExplanation('극대만 안다', KW)).toBe('weak');
  });

  it('returns weak for empty string', () => {
    expect(scoreExplanation('', KW)).toBe('weak');
    expect(scoreExplanation('   ', KW)).toBe('weak');
  });

  it('returns weak when there are no keywords', () => {
    expect(scoreExplanation('아무말', [])).toBe('weak');
  });

  it('normalizes case (case-insensitive match)', () => {
    expect(scoreExplanation('V=IR Therefore', ['v=ir', 'THEREFORE'])).toBe('strong');
  });
});

describe('getSelfExplain — fallback + mapping', () => {
  it('maps by conceptId', () => {
    const se = getSelfExplain('cb_001', 'c2');
    expect(se?.conceptId).toBe('c2');
  });

  it('falls back to first prompt when conceptId missing or unknown', () => {
    expect(getSelfExplain('cb_001')?.conceptId).toBe('c1');
    expect(getSelfExplain('cb_001', 'nope')?.conceptId).toBe('c1');
  });
});

describe('lesson data integrity — selfExplains', () => {
  const botIds = ['cb_001', 'cb_002', 'cb_003', 'cb_004', 'cb_005', '__fallback__'];
  it.each(botIds)('%s: every selfExplains[].conceptId ∈ concepts[].id', botId => {
    const lesson = getBotLesson(botId);
    const conceptIds = new Set(lesson.concepts.map(c => c.id));
    const list = lesson.selfExplains ?? [];
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const se of list) {
      expect(conceptIds.has(se.conceptId)).toBe(true);
      expect(se.keywords.length).toBeGreaterThan(0);
      expect(se.sampleAnswer.length).toBeGreaterThan(0);
      expect(se.feedbackStrong.length).toBeGreaterThan(0);
      expect(se.feedbackPartial.length).toBeGreaterThan(0);
      expect(se.feedbackWeak.length).toBeGreaterThan(0);
    }
  });
});
