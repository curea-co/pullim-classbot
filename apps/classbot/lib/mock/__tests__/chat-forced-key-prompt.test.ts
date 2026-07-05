/**
 * forcedKeyToChatPrompt — 플래그 ON 실챗 빠른칩 계약 보존(가이드 수업).
 * flag-ON 에서 forcedKey(빠른칩)를 자연어 프롬프트로 변환해 스트림 텍스트로 답하게 하되,
 * 매핑 없는 키는 undefined(칩 라벨 폴백). 리치 카드(concept/example/quiz 턴)는 v2 defer.
 */
import { forcedKeyToChatPrompt } from '../chat';

describe('forcedKeyToChatPrompt — 가이드 수업 칩 → 자연어 프롬프트', () => {
  it.each([
    ['lesson_concept', '지금 개념을 더 자세히 설명해줘.'],
    ['lesson_example', '관련 예제를 하나 풀어서 보여줘.'],
    ['lesson_quiz', '관련 퀴즈를 하나 내줘.'],
    ['lesson_next', '다음 개념으로 넘어가서 설명해줘.'],
    ['today_summary', '오늘 배운 내용을 정리해줘.'],
    ['exam_prep', '시험 대비로 무엇을 공부하면 좋을지 알려줘.'],
  ] as const)('%s → 대응 프롬프트(입력 없이 칩만으로도 의도 전달)', (key, prompt) => {
    expect(forcedKeyToChatPrompt(key)).toBe(prompt);
  });

  it.each(['extremum', 'blank_inference', 'circuit', 'reading_inference', 'social_inference', 'reassurance'] as const)(
    '과목별/안심 키(%s)는 칩 라벨이 이미 자연어 → undefined(폴백)',
    (key) => {
      expect(forcedKeyToChatPrompt(key)).toBeUndefined();
    },
  );
});
