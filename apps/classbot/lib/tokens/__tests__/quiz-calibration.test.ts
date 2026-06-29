import {
  CONFIDENCE_OPTIONS,
  CALIB_TONE_CLASS,
  getCalibrationFeedback,
  type Confidence,
} from '../quiz-calibration';

const CONFS: Confidence[] = ['sure', 'unsure', 'guess'];

describe('CONFIDENCE_OPTIONS', () => {
  it('has 3 options with value/label/emoji', () => {
    expect(CONFIDENCE_OPTIONS).toHaveLength(3);
    expect(CONFIDENCE_OPTIONS.map(o => o.value)).toEqual(['sure', 'unsure', 'guess']);
    for (const o of CONFIDENCE_OPTIONS) {
      expect(typeof o.label).toBe('string');
      expect(o.label.length).toBeGreaterThan(0);
      expect(typeof o.emoji).toBe('string');
      expect(o.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe('getCalibrationFeedback — 6-cell matrix', () => {
  it('correct + sure → good', () => {
    expect(getCalibrationFeedback(true, 'sure').tone).toBe('good');
  });

  it('the other 5 cells → neutral (no danger), incl wrong+sure', () => {
    expect(getCalibrationFeedback(true, 'unsure').tone).toBe('neutral');
    expect(getCalibrationFeedback(true, 'guess').tone).toBe('neutral');
    expect(getCalibrationFeedback(false, 'sure').tone).toBe('neutral');
    expect(getCalibrationFeedback(false, 'unsure').tone).toBe('neutral');
    expect(getCalibrationFeedback(false, 'guess').tone).toBe('neutral');
  });

  it('every cell returns a non-empty title and body', () => {
    for (const correct of [true, false]) {
      for (const conf of CONFS) {
        const fb = getCalibrationFeedback(correct, conf);
        expect(fb.title.length).toBeGreaterThan(0);
        expect(fb.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('only emits good or neutral tones', () => {
    for (const correct of [true, false]) {
      for (const conf of CONFS) {
        expect(['good', 'neutral']).toContain(getCalibrationFeedback(correct, conf).tone);
      }
    }
  });
});

describe('CALIB_TONE_CLASS — palette discipline', () => {
  it('good=blue, neutral=slate', () => {
    expect(CALIB_TONE_CLASS.good).toMatch(/blue/);
    expect(CALIB_TONE_CLASS.neutral).toMatch(/slate/);
  });

  it('uses no green/amber/emerald/lime/yellow/danger tokens', () => {
    for (const cls of Object.values(CALIB_TONE_CLASS)) {
      expect(cls).not.toMatch(/amber|green|emerald|lime|yellow|danger/);
    }
  });
});
