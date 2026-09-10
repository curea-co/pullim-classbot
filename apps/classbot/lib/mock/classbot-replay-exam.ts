/**
 * 리플레이 '다시 풀기' 시험지 문항 (mock). spec §5.
 * 약점 세그먼트(atSec) ↔ 실제 모의고사 스타일 문항 매핑. 데모 리플레이용 시드.
 * 데모 리플레이 자체(studentReplays 재시드)는 PR-B에서 추가 — 키(replayId:atSec)는 여기서 고정.
 */

/** 국어/영어 지문 — serif 박스로 렌더(문단 구조). */
export type ExamPassage = { paragraphs: string[] };
/** 수학/과학 〈보기〉·조건 박스. */
export type ExamBoxed = { lines: string[] };

export type ExamQuestion = {
  /** 발문 */
  stem: string;
  passage?: ExamPassage;
  boxed?: ExamBoxed;
  /** ①~⑤ 보기 */
  options: string[];
  answerIndex: number;
  /** 제출 후 해설 */
  explanation: string;
  /** 시험지 헤더 라벨 — "영어 · 빈칸 추론" 등 */
  subjectLabel: string;
};

const SEED: Record<string, ExamQuestion> = {
  // 영어 빈칸 추론 — 지문(passage)
  'rp_demo_eng:740': {
    subjectLabel: '영어 · 빈칸 추론',
    stem: '다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?',
    passage: {
      paragraphs: [
        'Although technology has made communication faster and more constant, it has not necessarily made it ＿＿＿＿＿. The sheer volume of messages we exchange each day has grown dramatically, yet the depth of mutual understanding has not kept pace.',
        'When every exchange is brief and immediate, we often trade reflection for speed. Genuine connection, the researchers argue, depends less on how quickly we respond than on how carefully we listen.',
      ],
    },
    options: ['cheaper', 'faster', 'more frequent', 'more meaningful', 'more public'],
    answerIndex: 3,
    explanation:
      '글은 "빠르고 잦아졌지만 이해의 깊이는 따라오지 못했다"는 대조 구조다. 빈칸엔 속도·양과 대비되는 ‘의미 있는(more meaningful)’이 적절하다.',
  },
  // 수학 일차함수 — 〈보기〉(boxed)
  'rp_demo_math:1100': {
    subjectLabel: '수학 · 일차함수의 그래프',
    stem: '〈보기〉의 직선 l 에 대한 설명 중 옳은 것은?',
    boxed: {
      lines: ['두 점 A(1, 2), B(4, 8) 을 지나는 직선 l', '직선 l 의 기울기를 a 라 하자'],
    },
    options: [
      'a = 1/2 이다',
      'a = 3 이다',
      'a = 2 이다',
      '직선 l 은 오른쪽 아래로 내려간다',
      '기울기를 구할 수 없다',
    ],
    answerIndex: 2,
    explanation:
      '기울기는 (y의 변화량) ÷ (x의 변화량) = (8 − 2) ÷ (4 − 1) = 6 ÷ 3 = 2 다. a = 2 이고 양수라 오른쪽 위로 올라간다.',
  },
};

/** 데모/문서·PR-B 참조용 — 시드된 (replayId:atSec) 키. */
export const DEMO_REPLAY_QUIZ_KEYS = Object.keys(SEED);

export function getReplayQuiz(replayId: string, atSec: number): ExamQuestion | null {
  return SEED[`${replayId}:${atSec}`] ?? null;
}
