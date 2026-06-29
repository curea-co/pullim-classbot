/**
 * 퀴즈 확신도(calibration) 토큰 — B5.
 *
 * 학생이 답을 고른 뒤 "얼마나 확신하는지"를 optional 로 표시하면,
 * 정답 여부 × 확신도 6칸 매트릭스로 메타인지 보정 피드백을 준다.
 *
 * 색 규약(전 배치 공통, 학생 라우트):
 * - good = blue, neutral = slate 만 사용.
 * - **danger(빨강) 미사용** — 'wrong+sure'(확신했는데 틀림)도 벌주지 않고
 *   neutral + 보정 카피로 코칭한다. green/amber/emerald/lime/yellow 절대 금지.
 */

export type Confidence = 'sure' | 'unsure' | 'guess';

export interface ConfidenceOption {
  value: Confidence;
  label: string;
  emoji: string;
}

export const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { value: 'sure', label: '확실해', emoji: '💪' },
  { value: 'unsure', label: '애매해', emoji: '🤔' },
  { value: 'guess', label: '찍었어', emoji: '🎲' },
];

export type CalibrationTone = 'good' | 'neutral';

export interface CalibrationFeedback {
  tone: CalibrationTone;
  title: string;
  body: string;
}

/**
 * 정답 여부 × 확신도 6칸 보정 피드백.
 * - correct + sure  → good   ('아는 걸 안다' = 잘 보정됨)
 * - 나머지 5칸       → neutral (특히 wrong+sure 도 danger 아님 — 확신 보정 코칭)
 */
export function getCalibrationFeedback(correct: boolean, conf: Confidence): CalibrationFeedback {
  if (correct) {
    switch (conf) {
      case 'sure':
        return {
          tone: 'good',
          title: '정확히 알고 있었어요',
          body: '확신한 만큼 맞혔어요 — 메타인지가 잘 맞았어요. 이 개념은 이제 네 것!',
        };
      case 'unsure':
        return {
          tone: 'neutral',
          title: '맞았지만 애매했죠?',
          body: '정답이지만 확신이 낮았어요. 왜 맞는지 한 번 더 설명해보면 확신이 단단해져요.',
        };
      case 'guess':
        return {
          tone: 'neutral',
          title: '찍어서 맞았어요',
          body: '결과는 정답이지만 근거가 약했어요. 운에 기대지 않게 풀이 과정을 짚어볼까요?',
        };
    }
  }
  switch (conf) {
    case 'sure':
      return {
        tone: 'neutral',
        title: '확신했는데 빗나갔네요',
        body: '확신과 결과가 어긋났어요 — 가장 배울 게 많은 순간이에요. 어디서 갈렸는지 같이 보자.',
      };
    case 'unsure':
      return {
        tone: 'neutral',
        title: '애매했고 빗나갔어요',
        body: '헷갈렸던 게 맞았어요. 헷갈린 지점이 곧 보강 포인트예요. 개념을 다시 짚어보자.',
      };
    case 'guess':
      return {
        tone: 'neutral',
        title: '찍었고 빗나갔어요',
        body: '아직 근거가 부족해요. 정답 풀이를 보고 다음엔 찍지 않고 풀 수 있게 해보자.',
      };
  }
}

/** 보정 배너 톤 → 토큰 클래스. good=blue, neutral=slate. danger 없음. */
export const CALIB_TONE_CLASS: Record<CalibrationTone, string> = {
  good: 'bg-pullim-blue-50 text-pullim-blue-700',
  neutral: 'bg-pullim-slate-50 text-pullim-slate-700',
};
