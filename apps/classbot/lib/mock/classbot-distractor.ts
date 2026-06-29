/**
 * 오답 함정(distractor) 태그 카탈로그 — B6.
 *
 * 퀴즈 보기마다 "이 보기가 어떤 사고 함정인지"를 태그로 단다(`LessonQuiz.distractorTags`).
 * 정답 위치는 'correct' 태그(누적 무시). 같은 함정 유형에 반복해서 걸리면
 * misconception store 가 누적하고, 임계 도달 시 챗에 코칭 카드를 띄운다.
 *
 * BE 연동 전까지 데이터 권위는 여기. 흡수 후 실 API 로 스왑은 Phase β 별도 PR.
 */

/**
 * 함정 태그 유니언. 'correct' 는 정답 위치(누적 대상 아님).
 * 나머지는 과목 공통 사고 함정. cb_001~005·FALLBACK 퀴즈에 실제 함정만 부여한다.
 */
export type DistractorTag =
  | 'correct'
  | 'confuse-max-min'         // 극대/극소(최댓/최솟) 혼동
  | 'plug-x-not-fx'           // x를 답으로 쓰고 f(x)를 안 구함
  | 'sign-no-change'          // 부호 변화 안 보고 임계점만으로 판단
  | 'same-direction'          // 역접인데 같은 방향으로 봄
  | 'example-vs-contrast'     // 예시/역접 신호어 혼동
  | 'ignore-connective'       // 연결어 단서를 무시
  | 'wrong-formula-parallel'  // 병렬/직렬 공식 뒤바꿈
  | 'add-vs-multiply'         // 더하기/곱하기 혼동
  | 'average-not-sum'         // 합 대신 평균
  | 'jump-to-conclusion'      // 분석 없이 결론부터
  | 'one-side-only'           // 한쪽 입장/근거만 봄
  | 'literal-word-match'      // 단어 일치 = 의미 일치로 착각
  | 'over-detail';            // 지엽적 디테일에 매달림

export interface DistractorMeta {
  tag: Exclude<DistractorTag, 'correct'>;
  /** 짧은 유형명(코칭 카드 헤더 보조) */
  label: string;
  /** 격려 톤 코칭 문구(text-pullim-slate-800) */
  coaching: string;
  /** '개념 다시 보기' 연결용 개념 id(레슨 내). 미지정 시 quiz.relatedConceptId 폴백. */
  relatedConceptId?: string;
}

/**
 * 함정 태그별 메타. 'correct' 는 제외(정답은 코칭 대상 아님).
 * literal-word-match / over-detail / one-side-only = "지엽적 오답에 잘 걸려요" 계열.
 */
export const DISTRACTOR_META: Record<Exclude<DistractorTag, 'correct'>, DistractorMeta> = {
  'confuse-max-min': {
    tag: 'confuse-max-min',
    label: '극대·극소 혼동',
    coaching: '극대(최댓)와 극소(최솟)를 바꿔 고르는 패턴이 보여. 부호가 +→−면 극대, −→+면 극소 — 어느 쪽을 묻는지 먼저 확인해보자.',
    relatedConceptId: 'c2',
  },
  'plug-x-not-fx': {
    tag: 'plug-x-not-fx',
    label: 'x와 f(x) 혼동',
    coaching: "f'(x)=0 의 해(x)를 그대로 답으로 쓰는 패턴이야. 극값은 그 x를 f에 다시 넣은 f(x) 값이라는 걸 한 번 더 떠올려보자.",
    relatedConceptId: 'c2',
  },
  'sign-no-change': {
    tag: 'sign-no-change',
    label: '부호 변화 미확인',
    coaching: "임계점만 찾고 부호 변화를 빼먹는 패턴이 반복돼. f'(x)=0 다음엔 항상 좌우 부호 변화까지 확인하는 습관을 들이자.",
    relatedConceptId: 'c2',
  },
  'same-direction': {
    tag: 'same-direction',
    label: '역접 방향 착각',
    coaching: '역접 연결어(however 등) 뒤를 앞과 같은 방향으로 보는 패턴이야. 역접 뒤는 흐름이 꺾인다는 걸 기억하자.',
    relatedConceptId: 'c2',
  },
  'example-vs-contrast': {
    tag: 'example-vs-contrast',
    label: '신호어 종류 혼동',
    coaching: '예시 신호어(for example)와 역접/인과를 섞어 보는 패턴이 보여. 연결어 종류부터 분류하고 방향을 정하자.',
    relatedConceptId: 'c2',
  },
  'ignore-connective': {
    tag: 'ignore-connective',
    label: '연결어 단서 무시',
    coaching: '연결어가 주는 방향 단서를 흘려보내는 패턴이야. 빈칸 앞뒤 연결어부터 표시하고 방향(=,≠)을 적어보자.',
    relatedConceptId: 'c2',
  },
  'wrong-formula-parallel': {
    tag: 'wrong-formula-parallel',
    label: '직렬·병렬 공식 뒤바꿈',
    coaching: '직렬과 병렬 합성저항 공식을 뒤바꾸는 패턴이 보여. 직렬=더하기, 병렬=역수 합 — 한 문장으로 다시 외우자.',
    relatedConceptId: 'c2',
  },
  'add-vs-multiply': {
    tag: 'add-vs-multiply',
    label: '더하기·곱하기 혼동',
    coaching: '더해야 할 곳에서 곱하는(또는 반대) 패턴이야. 직렬 합성저항은 곱이 아니라 합이라는 걸 짚고 가자.',
    relatedConceptId: 'c2',
  },
  'average-not-sum': {
    tag: 'average-not-sum',
    label: '합 대신 평균',
    coaching: '합을 구할 자리에서 평균을 내는 패턴이 보여. 무엇을 구하는 연산인지 먼저 확인하자.',
    relatedConceptId: 'c2',
  },
  'jump-to-conclusion': {
    tag: 'jump-to-conclusion',
    label: '결론부터 내기',
    coaching: '분석 단계를 건너뛰고 결론부터 고르는 패턴이야. 입장·근거를 먼저 분리한 뒤 판단하자.',
    relatedConceptId: 'c1',
  },
  'one-side-only': {
    tag: 'one-side-only',
    label: '한쪽만 보기',
    coaching: '한쪽 입장·근거만 보고 답하는 패턴이 반복돼. 양쪽을 같은 기준에 놓고 비교하는 습관을 들이자.',
    relatedConceptId: 'c1',
  },
  'literal-word-match': {
    tag: 'literal-word-match',
    label: '단어 일치 함정',
    coaching: '지문 단어가 그대로 들어간 선택지를 정답으로 고르는 패턴이야. 단어 일치 ≠ 의미 일치 — 항상 방향으로 검증하자.',
    relatedConceptId: 'c1',
  },
  'over-detail': {
    tag: 'over-detail',
    label: '지엽적 디테일',
    coaching: '글 전체 방향보다 지엽적 디테일에 매달리는 패턴이 보여. 결국 글이 하고 싶은 말(주제)을 먼저 잡자.',
    relatedConceptId: 'c1',
  },
};

/** 함정 태그 → 메타. 'correct' 또는 미등록 태그는 null(누적/코칭 대상 아님). */
export function getDistractorMeta(tag: DistractorTag | undefined): DistractorMeta | null {
  if (!tag || tag === 'correct') return null;
  return DISTRACTOR_META[tag] ?? null;
}
