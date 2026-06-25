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
  // 수학 극값 — 〈보기〉(boxed)
  'rp_demo_math:1100': {
    subjectLabel: '수학 · 도함수의 활용',
    stem: '함수 f(x)에 대한 〈보기〉의 설명 중 옳은 것은?',
    boxed: {
      lines: ['f(x) = x³ − 6x² + 9x + 1', "f'(x) = 3x² − 12x + 9 = 3(x−1)(x−3)"],
    },
    options: [
      'x = 1에서 극솟값을 갖는다',
      'x = 3에서 극댓값을 갖는다',
      'x = 1에서 극댓값을 갖는다',
      'x = 2는 극점이다',
      '극값을 갖지 않는다',
    ],
    answerIndex: 2,
    explanation:
      "f'(x)=3(x−1)(x−3). x=1 좌우로 +→− 이므로 x=1에서 극대, x=3 좌우로 −→+ 이므로 x=3에서 극소다. 따라서 ‘x=1에서 극댓값’이 옳다.",
  },
};

/** 데모/문서·PR-B 참조용 — 시드된 (replayId:atSec) 키. */
export const DEMO_REPLAY_QUIZ_KEYS = Object.keys(SEED);

export function getReplayQuiz(replayId: string, atSec: number): ExamQuestion | null {
  return SEED[`${replayId}:${atSec}`] ?? null;
}
