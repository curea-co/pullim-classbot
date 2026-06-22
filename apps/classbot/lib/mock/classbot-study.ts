/**
 * 봇대화 우측 레일용 mock — 봇별 연습 퀴즈 + 학습 가이드(핵심 개념 카드).
 * 봇의 subject/chapter 맥락에 맞춘 시드. BE 연동 전까지 데이터 권위는 여기.
 */

export interface ChatQuiz {
  id: string;
  /** 문제 번호 라벨 (예: Q-12) */
  problemNumber: string;
  title: string;
  difficulty: '하' | '중' | '상';
}

export interface StudyConcept {
  id: string;
  concept: string;
  /** 한 줄 요약 */
  summary: string;
}

interface BotStudy {
  quizzes: ChatQuiz[];
  concepts: StudyConcept[];
}

const STUDY: Record<string, BotStudy> = {
  // cb_001 — 수학Ⅱ · 미적분 III장
  cb_001: {
    quizzes: [
      { id: 'q1', problemNumber: 'Q-12', title: '접선의 방정식 구하기', difficulty: '중' },
      { id: 'q2', problemNumber: 'Q-13', title: '극값과 도함수의 부호', difficulty: '상' },
      { id: 'q3', problemNumber: 'Q-14', title: '순간변화율 해석', difficulty: '하' },
    ],
    concepts: [
      { id: 'c1', concept: '도함수의 정의', summary: '평균변화율의 극한이 f′(x). 미분계수는 한 점의 순간 기울기예요.' },
      { id: 'c2', concept: '극값 판정', summary: "f′(x)=0인 점에서 부호가 +→− 면 극대, −→+ 면 극소." },
      { id: 'c3', concept: '합성함수 미분', summary: '연쇄법칙 — (f∘g)′ = f′(g(x))·g′(x).' },
    ],
  },
  // cb_002 — 영어 · 수능 빈칸 7유형
  cb_002: {
    quizzes: [
      { id: 'q1', problemNumber: 'B-07', title: '빈칸 추론 — 연결어 단서', difficulty: '중' },
      { id: 'q2', problemNumber: 'B-08', title: '주제문 위치로 빈칸 잡기', difficulty: '상' },
    ],
    concepts: [
      { id: 'c1', concept: '빈칸 = 주제문', summary: '빈칸은 글의 핵심. 반복·재진술되는 키워드가 정답 단서예요.' },
      { id: 'c2', concept: '연결어 신호', summary: 'however/therefore 뒤는 논리 전환·결론 → 빈칸 방향을 결정해요.' },
      { id: 'c3', concept: '오답 함정', summary: '지문 단어를 그대로 쓴 선택지는 함정인 경우가 많아요.' },
    ],
  },
  // cb_003 — 통합과학
  cb_003: {
    quizzes: [
      { id: 'q1', problemNumber: 'S-03', title: '전기회로 — 직렬·병렬 저항', difficulty: '중' },
      { id: 'q2', problemNumber: 'S-04', title: '옴의 법칙 적용', difficulty: '하' },
    ],
    concepts: [
      { id: 'c1', concept: '옴의 법칙', summary: 'V = I·R — 전압은 전류와 저항의 곱이에요.' },
      { id: 'c2', concept: '직렬 vs 병렬', summary: '직렬은 저항의 합, 병렬은 역수의 합. 병렬일수록 합성저항이 작아져요.' },
    ],
  },
  // cb_004 — 국어
  cb_004: {
    quizzes: [
      { id: 'q1', problemNumber: 'K-05', title: '비문학 — 주제·구조 파악', difficulty: '중' },
      { id: 'q2', problemNumber: 'K-06', title: '문장 간 논리 관계', difficulty: '상' },
    ],
    concepts: [
      { id: 'c1', concept: '문단 중심문장', summary: '각 문단의 중심문장을 모으면 글 전체 구조가 보여요.' },
      { id: 'c2', concept: '지시어 추적', summary: '이/그/이러한이 가리키는 대상을 정확히 짚어야 독해가 빨라져요.' },
    ],
  },
  // cb_005 — 사회
  cb_005: {
    quizzes: [
      { id: 'q1', problemNumber: 'C-02', title: '수요·공급 곡선의 이동', difficulty: '중' },
    ],
    concepts: [
      { id: 'c1', concept: '수요·공급', summary: '가격이 오르면 수요↓·공급↑. 균형점에서 시장가격이 정해져요.' },
      { id: 'c2', concept: '기회비용', summary: '어떤 선택으로 포기한 차선의 가치예요.' },
    ],
  },
};

const FALLBACK: BotStudy = {
  quizzes: [{ id: 'q1', problemNumber: 'Q-01', title: '기초 개념 점검', difficulty: '하' }],
  concepts: [{ id: 'c1', concept: '오늘의 핵심', summary: '대화에서 다룬 개념을 카드로 정리해 드려요.' }],
};

export function getChatQuizzes(botId: string): ChatQuiz[] {
  return (STUDY[botId] ?? FALLBACK).quizzes;
}

export function getStudyGuide(botId: string): StudyConcept[] {
  return (STUDY[botId] ?? FALLBACK).concepts;
}
