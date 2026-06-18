import { questionTypeMeta, questionTypeLabel } from '../question-type';

describe('questionTypeMeta', () => {
  it('should have mc with Korean label "객관식"', () => {
    expect(questionTypeMeta.mc.label).toBe('객관식');
  });

  it('should have essay with Korean label "서술형"', () => {
    expect(questionTypeMeta.essay.label).toBe('서술형');
  });

  it('should have short with Korean label "단답"', () => {
    expect(questionTypeMeta.short.label).toBe('단답');
  });

  it('should have numeric with Korean label "수치"', () => {
    expect(questionTypeMeta.numeric.label).toBe('수치');
  });

  it('each entry should have a truthy icon', () => {
    expect(questionTypeMeta.mc.icon).toBeTruthy();
    expect(questionTypeMeta.essay.icon).toBeTruthy();
    expect(questionTypeMeta.short.icon).toBeTruthy();
    expect(questionTypeMeta.numeric.icon).toBeTruthy();
  });
});

describe('questionTypeLabel', () => {
  it('should return Korean label for essay', () => {
    expect(questionTypeLabel('essay')).toBe('서술형');
  });

  it('should return the raw value for unknown type', () => {
    expect(questionTypeLabel('unknown')).toBe('unknown');
  });

  it('should return label for all known types', () => {
    expect(questionTypeLabel('mc')).toBe('객관식');
    expect(questionTypeLabel('short')).toBe('단답');
    expect(questionTypeLabel('numeric')).toBe('수치');
  });
});
