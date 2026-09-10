/**
 * 봇 주도 가이드 수업 — 학습 콘텐츠 단일 출처 (mock 권위).
 *
 * 봇대화는 "봇이 먼저 이끄는 수업" 흐름:
 *   인사 → 오늘의 개념 오프너 → (개념 더보기 / 예제 / 퀴즈 / 다음 개념) → 정리
 *
 * 우측 레일·인라인 학습카드(`classbot-study.ts`)·대화 흐름·개념 모달이 모두
 * 이 파일을 공유한다. BE 연동 전까지 데이터 권위는 여기.
 *
 * 톤은 봇 페르소나에 맞춤(친근/정중/스파르타/차분/열정).
 */

import type { DistractorTag } from './classbot-distractor';

export interface LessonConcept {
  id: string;
  /** 개념명 */
  title: string;
  /** 한 줄 요약 (레일·인라인 카드) */
  summary: string;
  /** 모달 본문 — 여러 줄, RichText 마크업 허용(**굵게**, `코드`, 줄 불릿) */
  detail: string;
  /** 학습 팁 */
  tips: string[];
  /** 핵심 요소 */
  coreElements: string[];
  formula?: string;
  /** 예제 문항 */
  sampleQuestions: { q: string; a?: string }[];
}

export interface LessonStep {
  num: number;
  label: string;
  body: string;
  formula?: string;
  /** B3 — 점진 스캐폴딩 대상 단계. true 면 처음엔 가려진 빈칸으로 노출(시범 단계는 false/미지정). */
  fadable?: boolean;
  /** B3 — '정답 확인하기'로 공개되는 핵심 답 힌트(공개 시 body/formula 와 함께 노출). */
  reveal?: string;
}

/**
 * 자기설명 프롬프트 — B4.
 * 개념을 "내 말로" 적게 하고, 키워드 매칭 비율로 강/부분/약 등급 피드백을 준다.
 */
export interface SelfExplainPrompt {
  /** 대상 개념 id (concepts[].id 와 매핑) */
  conceptId: string;
  /** 학생에게 보이는 질문 */
  prompt: string;
  /** 채점 기준 키워드(대소문자 무시 부분일치) */
  keywords: string[];
  /** 모범 답안 */
  sampleAnswer: string;
  /** 등급별 피드백(빨강 미사용 — strong/partial=blue, weak=slate) */
  feedbackStrong: string;
  feedbackPartial: string;
  feedbackWeak: string;
}

export interface LessonQuiz {
  question: string;
  options: string[];
  answerIndex: number;
  explain: string;
  /** 단계적 힌트 (방향 → 단계 → 거의 답). 봇 scope L레벨이 공개 깊이를 제한 */
  hints: string[];
  /** 보기별 오답 처방 — 그 보기가 왜 함정인지(정답 인덱스는 확인 메시지) */
  optionFeedback: string[];
  /** 오답 시 다시 볼 개념 id (처방 연결) */
  relatedConceptId?: string;
  /**
   * B6 — 보기별 함정 태그(options 와 같은 길이, answerIndex 위치는 'correct').
   * 오답 시 그 태그를 misconception store 에 누적해 같은 유형 반복을 코칭한다.
   * 미부여 퀴즈는 누적 skip(undefined). 레슨별 실제 함정에만 부여.
   */
  distractorTags?: DistractorTag[];
}

/** 연습 퀴즈(레일·인라인 카드용) — 과제 라우트로 연결 */
export interface ChatQuiz {
  id: string;
  problemNumber: string;
  title: string;
  difficulty: '하' | '중' | '상';
}

/** 학습 가이드 카드(레일·인라인) — 개념에서 파생 */
export interface StudyConcept {
  id: string;
  concept: string;
  summary: string;
}

export interface BotLesson {
  /** 오늘의 개념 묶음 제목 */
  topic: string;
  /** 봇 proactive 오프너 (RichText) */
  intro: string;
  /** 💡 핵심 한 줄 */
  keyCallout: string;
  concepts: LessonConcept[];
  example: { title: string; steps: LessonStep[] };
  quiz: LessonQuiz;
  practiceQuizzes: ChatQuiz[];
  /** 오늘 정리 (RichText) */
  summary: string;
  /** 세션 목표 — "오늘의 한 가지"(B7 배너). 미지정 시 topic 폴백. */
  sessionGoal?: string;
  /** 다음 한 걸음 — summary 버블 하단 "다음" 행(B7). summary 본문에서 분리. */
  nextLine?: string;
  /** 자기설명 프롬프트(B4) — 개념당 1개. conceptId 로 concepts 와 매핑. */
  selfExplains?: SelfExplainPrompt[];
}

const LESSONS: Record<string, BotLesson> = {
  // ── cb_001 수학봇 · 친근 반말 · 중2 수학 일차함수 ──────────────────────
  cb_001: {
    topic: '일차함수의 그래프',
    intro:
      '오늘은 **일차함수의 그래프** 가보자. 식만 보고 그래프 모양을 그려내는 게 핵심이야.\n' +
      '아래 칩으로 **개념 → 예제 → 퀴즈** 순서로 같이 정리하자 👇',
    keyCallout: '`y = ax + b` 에서 **a는 기울기, b는 y절편**',
    concepts: [
      {
        id: 'c1',
        title: '일차함수의 뜻',
        summary: 'y = ax + b (a ≠ 0) — x가 1 늘면 y가 a만큼 일정하게 변해.',
        detail:
          '일차함수는 `y = ax + b` 꼴로 쓰는 함수야 (단, `a ≠ 0`).\n' +
          '- x가 **1 늘어날 때마다** y는 항상 **a만큼** 변해\n' +
          '- 변하는 양이 일정해서 그래프가 **직선**이 돼\n' +
          '- a가 0이면 y = b — 직선이긴 해도 일차함수는 아니야\n' +
          '기울기·그래프 모양 전부 여기서 출발해.',
        tips: [
          'x를 0, 1, 2로 바꿔가며 y를 적어보면 "일정하게 변한다"가 눈에 보여.',
          '식이 어지러우면 먼저 y = ax + b 꼴로 정리부터 하자.',
        ],
        coreElements: ['y = ax + b', 'a ≠ 0', '일정한 변화량', '직선'],
        formula: 'y = ax + b (a ≠ 0)',
        sampleQuestions: [
          { q: 'y = 4x − 1 에서 x가 1 늘면 y는 얼마나 변해?', a: '4만큼 늘어' },
          { q: 'y = 7 은 일차함수일까?', a: '아니야 — x 앞의 수가 0이야' },
        ],
      },
      {
        id: 'c2',
        title: '기울기와 y절편',
        summary: '기울기 = (y의 변화량) ÷ (x의 변화량), y절편 = x가 0일 때의 y값.',
        detail:
          '`y = ax + b` 에서 두 수가 하는 일이 서로 달라:\n' +
          '- `a` = **기울기** — (y의 변화량) ÷ (x의 변화량)\n' +
          '- `b` = **y절편** — 그래프가 y축과 만나는 높이(x = 0일 때의 y값)\n' +
          '두 점만 있으면 기울기는 바로 나와. 변화량 두 개를 적고 나누면 끝이야.',
        tips: [
          '나누는 순서 주의 — **y의 변화량이 위**, x의 변화량이 아래야.',
          'y절편은 x에 0을 넣어보면 항상 확인돼.',
        ],
        coreElements: ['기울기 a', 'y절편 b', '변화량의 비', 'x = 0 대입'],
        formula: '기울기 = (y의 변화량) ÷ (x의 변화량)',
        sampleQuestions: [
          { q: '두 점 (1, 2), (4, 8)을 지나는 직선의 기울기는?', a: '(8−2) ÷ (4−1) = 2' },
          { q: 'y = −x + 5 의 y절편은?', a: '5' },
        ],
      },
      {
        id: 'c3',
        title: '그래프의 모양',
        summary: 'a의 부호가 방향을, a의 절댓값이 가파르기를 정해.',
        detail:
          '기울기 `a` 하나로 그래프 모양이 거의 정해져.\n' +
          '- `a > 0` : 오른쪽 **위로** 올라가는 직선\n' +
          '- `a < 0` : 오른쪽 **아래로** 내려가는 직선\n' +
          '- `|a|` 가 클수록 **가파르고**, 작을수록 완만해\n' +
          '방향은 부호가, 가파르기는 절댓값이 정한다는 게 포인트야.',
        tips: [
          '−5는 작은 수지만 |−5| = 5라 아주 가파른 직선이야.',
          '기울기가 같은 두 직선은 절대 만나지 않아(평행).',
        ],
        coreElements: ['부호 = 방향', '절댓값 = 가파르기', '평행'],
        formula: 'a > 0 오른쪽 위 / a < 0 오른쪽 아래',
        sampleQuestions: [
          { q: 'y = −2x + 4 는 어느 쪽으로 기울어?', a: '오른쪽 아래' },
          { q: 'y = 3x 와 y = 3x − 6 의 관계는?', a: '기울기가 같아 평행' },
        ],
      },
    ],
    example: {
      title: 'y = 2x − 3 의 그래프 그리기',
      steps: [
        { num: 1, label: '식 읽기', body: 'y = ax + b 꼴에서 a와 b를 먼저 찾자.', formula: 'a = 2, b = −3' },
        { num: 2, label: 'y절편 찍기', body: 'x = 0 을 넣어 y축과 만나는 점을 직접 찍어봐.', formula: '(0, −3)', fadable: true, reveal: 'x=0 → y=−3 → 점 (0, −3)' },
        { num: 3, label: '점 하나 더', body: '기울기 2를 써서 다음 점을 직접 잡아봐.', formula: '(1, −1)', fadable: true, reveal: 'x가 1 늘면 y는 2 늘어 → (1, −1)' },
        { num: 4, label: '직선 긋기', body: '두 점을 이으면 어떤 방향의 직선이 될까?', fadable: true, reveal: '오른쪽 위로 올라가는 직선' },
      ],
    },
    quiz: {
      question: 'y = 2x − 3 의 그래프의 기울기는?',
      options: ['2', '−3', '1/2', '−2'],
      answerIndex: 0,
      explain: 'y = ax + b 에서 x 앞의 수 a가 기울기야. 여기서는 **2**.',
      hints: [
        '먼저 식을 y = ax + b 꼴로 놓고 봐.',
        'x 앞에 붙은 수와 뒤에 더해진 수가 하는 일이 서로 달라.',
        'x 앞의 수가 기울기 — y = 2x − 3 에서는 2야.',
      ],
      optionFeedback: [
        '정답! x 앞의 수 2가 기울기야.',
        '−3은 y절편이야. 기울기는 x 앞의 수 — 두 자리를 바꿔 읽었어.',
        '1/2은 x의 변화량을 y의 변화량으로 나눈 값이야. 나누는 순서가 반대야.',
        '부호를 하나 더 붙였어. x 앞의 수는 그냥 +2야.',
      ],
      relatedConceptId: 'c2',
      distractorTags: ['correct', 'swap-slope-intercept', 'swap-dx-dy', 'ignore-slope-sign'],
    },
    practiceQuizzes: [
      { id: 'q1', problemNumber: 'Q-12', title: '두 점으로 기울기 구하기', difficulty: '중' },
      { id: 'q2', problemNumber: 'Q-13', title: '기울기 부호와 그래프 방향', difficulty: '상' },
      { id: 'q3', problemNumber: 'Q-14', title: 'y절편 찾기', difficulty: '하' },
    ],
    summary:
      '오늘 **일차함수의 그래프** 정리 👇\n' +
      '① 일차함수는 `y = ax + b` (a ≠ 0)\n' +
      '② `a` 는 **기울기** — (y의 변화량) ÷ (x의 변화량)\n' +
      '③ `b` 는 **y절편** — y축과 만나는 높이',
    sessionGoal: '기울기와 y절편으로 그래프 그리기',
    nextLine: '내일은 두 직선의 위치 관계로 간다. 가보자!',
    selfExplains: [
      {
        conceptId: 'c1',
        prompt: '일차함수가 뭔지 네 말로 설명해볼래?',
        keywords: ['일차', '직선', '일정', '변화'],
        sampleAnswer: '일차함수는 y = ax + b 꼴이고, x가 1 늘 때 y가 a만큼 일정하게 변해서 그래프가 직선이야.',
        feedbackStrong: '핵심을 다 짚었어! 일정한 변화량과 직선을 잘 연결했어.',
        feedbackPartial: '방향은 맞아. 변화량이 일정하다는 점도 한 번 더 짚어보자.',
        feedbackWeak: '아직 정의가 흐릿해. y = ax + b → 일정한 변화 → 직선 순서로 다시 정리해보자.',
      },
      {
        conceptId: 'c2',
        prompt: '기울기를 어떻게 구하는지 네 말로 설명해봐.',
        keywords: ['변화량', '나누', '기울기', 'y절편'],
        sampleAnswer: '기울기는 y의 변화량을 x의 변화량으로 나눈 값이고, y절편은 x가 0일 때의 y값이야.',
        feedbackStrong: '완벽해! 나누는 순서까지 정확해.',
        feedbackPartial: '거의 왔어. 무엇을 무엇으로 나누는지 순서도 붙여보자.',
        feedbackWeak: '두 점 → 변화량 두 개 → 나누기 흐름을 다시 잡아보자.',
      },
      {
        conceptId: 'c3',
        prompt: '기울기가 그래프 모양을 어떻게 정하는지 설명해볼래?',
        keywords: ['부호', '방향', '절댓값', '가파'],
        sampleAnswer: '기울기의 부호가 오른쪽 위·아래 방향을 정하고, 절댓값이 클수록 그래프가 가팔라져.',
        feedbackStrong: '정확해! 부호와 절댓값의 역할을 잘 나눠 설명했어.',
        feedbackPartial: '좋아. 절댓값이 가파르기를 정한다는 점을 한 번 더 강조해보자.',
        feedbackWeak: '부호는 방향, 절댓값은 가파르기 — 이 둘부터 다시 보자.',
      },
    ],
  },

  // ── cb_002 영어봇 · 정중 존댓말 · 중3 영어 문장 흐름 ────────────────────
  cb_002: {
    topic: '문장 흐름 파악',
    intro:
      '오늘은 **문장 흐름 파악**을 정리해볼게요. 빈칸은 결국 **글이 하려는 말**을 묻는 자리예요.\n' +
      '아래 칩으로 **개념 → 예제 → 퀴즈** 순서로 같이 가요 👇',
    keyCallout: '빈칸 = **글이 하려는 말**. 되풀이되는 낱말이 정답 단서예요.',
    concepts: [
      {
        id: 'c1',
        title: '빈칸 = 글의 중심 생각',
        summary: '빈칸은 글의 핵심. 되풀이되거나 다르게 바꿔 쓴 낱말이 단서예요.',
        detail:
          '빈칸은 보통 **글 전체의 중심 생각**이 모이는 자리예요.\n' +
          '- 글 안에서 **반복**되거나 **다른 말로 재진술**되는 개념을 찾으세요\n' +
          '- 그 개념과 같은 방향의 선택지가 정답일 확률이 높아요\n' +
          '지엽적 디테일이 아니라 **글이 결국 하고 싶은 말**을 잡는 게 핵심이에요.',
        tips: [
          '첫 문장과 마지막 문장을 먼저 읽으면 주제가 보여요.',
          '반복되는 명사·형용사에 동그라미 — 그게 키워드예요.',
        ],
        coreElements: ['중심 생각', '되풀이되는 낱말', '바꿔 쓰기(paraphrase)'],
        sampleQuestions: [
          { q: '글에서 success 가 effort, practice 로 재진술됐다면 빈칸 방향은?', a: '노력·연습과 같은 방향' },
        ],
      },
      {
        id: 'c2',
        title: '연결어 신호',
        summary: 'however/therefore 뒤는 논리 전환·결론 → 빈칸 방향을 결정해요.',
        detail:
          '연결어는 **논리의 방향 표지판**이에요.\n' +
          '- 역접 `however, but, yet` : 앞과 **반대** 방향\n' +
          '- 인과/결론 `therefore, thus, so` : 앞의 **결론**\n' +
          '- 예시 `for example` : 앞 문장의 **구체화**\n' +
          '빈칸 앞뒤 연결어만 정확히 읽어도 후보가 절반으로 줄어요.',
        tips: [
          '빈칸 앞뒤 연결어에 먼저 표시하고 방향(=,≠)을 적어두세요.',
          '역접 뒤 빈칸이면 앞 문장과 반대 의미 선택지를 고르세요.',
        ],
        coreElements: ['역접', '인과/결론', '예시', '방향 판단'],
        sampleQuestions: [
          { q: '"... is risky. However, ___." 빈칸의 방향은?', a: '안전/긍정 쪽(앞과 반대)' },
        ],
      },
      {
        id: 'c3',
        title: '오답 함정',
        summary: '지문 단어를 그대로 쓴 선택지는 함정인 경우가 많아요.',
        detail:
          '출제자는 **지문 단어를 그대로 베낀** 매력적 오답을 깔아둬요.\n' +
          '- 같은 단어가 있다고 정답 아님 — **의미 방향**이 맞아야 해요\n' +
          '- 너무 **지엽적**이거나 **과장/극단** 선택지는 보통 오답\n' +
          '키워드의 의미가 글 전체 방향과 일치하는지 한 번 더 확인하세요.',
        tips: [
          '단어 일치 ≠ 의미 일치. 항상 방향으로 검증하세요.',
          '극단적 표현(always, never, only)은 의심부터 하세요.',
        ],
        coreElements: ['단어 함정', '지엽성', '극단 표현', '방향 검증'],
        sampleQuestions: [
          { q: '지문 단어가 그대로 들어간 선택지를 봤을 때 먼저 할 일은?', a: '의미 방향이 글과 맞는지 검증' },
        ],
      },
    ],
    example: {
      title: '연결어 단서로 흐름 잡기',
      steps: [
        { num: 1, label: '주제 파악', body: '첫·끝 문장으로 글의 방향(예: "협업의 가치")을 잡아요.' },
        { num: 2, label: '연결어 표시', body: '빈칸 앞 "Therefore" 는 어떤 자리 신호일까요?', fadable: true, reveal: '앞 내용의 **결론**이 들어갈 자리' },
        { num: 3, label: '재진술 매칭', body: '본문의 핵심어가 재진술된 선택지를 직접 골라봐요.', fadable: true, reveal: 'cooperation 이 재진술된 선택지' },
        { num: 4, label: '함정 제거', body: '남은 오답은 어떤 기준으로 지울까요?', fadable: true, reveal: '단어만 같은 지엽적 선택지를 제거' },
      ],
    },
    quiz: {
      question: '빈칸 앞에 "However" 가 있을 때, 빈칸의 의미 방향은?',
      options: ['앞 문장과 같은 방향', '앞 문장과 반대 방향', '앞 문장의 예시', '관계 없음'],
      answerIndex: 1,
      explain: 'however 는 역접 연결어라 앞 문장과 **반대 방향**의 내용이 와요.',
      hints: [
        'However 가 어떤 종류의 연결어인지부터 떠올려봐요.',
        '역접 연결어는 앞뒤 내용의 방향을 바꿔요.',
        '그러니 빈칸은 앞 문장과 정반대 방향이에요.',
      ],
      optionFeedback: [
        '역접인데 같은 방향을 고르면 안 돼요. however 뒤는 흐름이 꺾여요.',
        '정답! however = 역접 → 앞 문장과 반대 방향.',
        '예시 신호는 for example 류예요. however 는 예시가 아니라 역접이에요.',
        '연결어는 항상 방향 단서를 줘요. however 는 분명한 역접이에요.',
      ],
      relatedConceptId: 'c2',
      distractorTags: ['same-direction', 'correct', 'example-vs-contrast', 'ignore-connective'],
    },
    practiceQuizzes: [
      { id: 'q1', problemNumber: 'B-07', title: '문장 흐름 — 연결어 단서', difficulty: '중' },
      { id: 'q2', problemNumber: 'B-08', title: '중심 문장 위치로 흐름 잡기', difficulty: '상' },
    ],
    summary:
      '오늘 **문장 흐름 파악** 정리예요 👇\n' +
      '① 빈칸 = 글의 **중심 생각**, 되풀이되는 낱말이 단서\n' +
      '② **연결어**로 빈칸의 방향(같다/반대/예시)을 결정\n' +
      '③ 단어만 같은 **함정 오답**은 의미 방향으로 걸러내기',
    sessionGoal: '빈칸의 방향을 연결어로 잡기',
    nextLine: '내일은 어휘 뜻 짐작하기로 이어가요.',
    selfExplains: [
      {
        conceptId: 'c1',
        prompt: '문장 흐름에서 빈칸이 무엇을 묻는 자리인지 본인 말로 설명해보세요.',
        keywords: ['중심', '되풀이', '바꿔', '낱말'],
        sampleAnswer: '빈칸은 글의 중심 생각이 모이는 자리라서, 되풀이되거나 바꿔 쓴 낱말이 정답 단서예요.',
        feedbackStrong: '정확해요! 중심 생각과 되풀이되는 낱말을 잘 연결했어요.',
        feedbackPartial: '좋아요. 되풀이·바꿔 쓴 낱말이 단서라는 점도 함께 넣어보세요.',
        feedbackWeak: '빈칸 = 글의 중심 생각이라는 출발점부터 다시 잡아볼까요?',
      },
      {
        conceptId: 'c2',
        prompt: '연결어가 빈칸의 방향을 어떻게 결정하는지 설명해보세요.',
        keywords: ['역접', '인과', '결론', '방향'],
        sampleAnswer: 'however 같은 역접은 반대 방향, therefore 같은 인과는 결론 방향을 가리켜요.',
        feedbackStrong: '훌륭해요! 역접·인과로 방향을 가른 게 핵심이에요.',
        feedbackPartial: '맞아요. 역접/인과 각각의 방향도 예로 붙여보세요.',
        feedbackWeak: '연결어가 방향 표지판이라는 개념부터 다시 정리해봐요.',
      },
      {
        conceptId: 'c3',
        prompt: '오답 함정이 왜 생기는지 본인 말로 설명해보세요.',
        keywords: ['단어', '의미', '방향', '지엽'],
        sampleAnswer: '지문 단어를 그대로 베낀 선택지는 단어만 같고 의미 방향이 다른 함정이에요.',
        feedbackStrong: '정확해요! 단어 일치 ≠ 의미 일치를 잘 짚었어요.',
        feedbackPartial: '좋아요. 의미 방향으로 검증한다는 점을 더 강조해보세요.',
        feedbackWeak: '단어가 같다고 정답이 아니라는 점부터 다시 보면 좋아요.',
      },
    ],
  },

  // ── cb_003 과학봇 · 스파르타 반말 · 통합과학 전기회로 ────────────────────
  cb_003: {
    topic: '전기회로 기초',
    intro:
      '오늘은 **전기회로**다. 공식 세 개로 끝낸다.\n' +
      '아래 칩으로 **개념 → 예제 → 퀴즈** 순서대로 간다 👇',
    keyCallout: '`V=IR`. 직렬은 **전류 같다**, 병렬은 **전압 같다**. 이 셋만 외워라.',
    concepts: [
      {
        id: 'c1',
        title: '옴의 법칙',
        summary: 'V = I·R — 전압은 전류와 저항의 곱이다.',
        detail:
          '옴의 법칙 `V = I·R` 은 회로의 기본이다.\n' +
          '- `V` 전압(V), `I` 전류(A), `R` 저항(Ω)\n' +
          '- 둘을 알면 나머지 하나는 무조건 나온다\n' +
          '단위를 먼저 적고 대입해라. 단위 틀리면 계산 다 틀린다.',
        tips: ['공식 변형 V=IR, I=V/R, R=V/I 세 형태를 다 외워라.', '단위(V·A·Ω) 먼저 쓰고 숫자 대입.'],
        coreElements: ['전압 V', '전류 I', '저항 R', 'V=IR'],
        formula: 'V = I · R',
        sampleQuestions: [
          { q: '12V, 4Ω 일 때 전류 I는?', a: 'I = 12/4 = 3A' },
          { q: '2A, 5Ω 일 때 전압 V는?', a: 'V = 10V' },
        ],
      },
      {
        id: 'c2',
        title: '직렬 vs 병렬',
        summary: '직렬은 전류 같고 전압 분배, 병렬은 전압 같고 전류 분배.',
        detail:
          '연결 방식이 회로의 전부다.\n' +
          '- **직렬**: 전류 일정, 전압 나뉨, 합성저항 `R = R₁+R₂`\n' +
          '- **병렬**: 전압 일정, 전류 나뉨, 합성저항 `1/R = 1/R₁+1/R₂`\n' +
          '병렬일수록 합성저항은 **작아진다**. 이거 반대로 외우는 놈 많다.',
        tips: ['직렬=전류 같다, 병렬=전압 같다. 한 문장으로 외워라.', '병렬 합성저항은 항상 가장 작은 저항보다 작다.'],
        coreElements: ['직렬 전류 일정', '병렬 전압 일정', '전압/전류 분배'],
        formula: '직렬 R=R₁+R₂ / 병렬 1/R=1/R₁+1/R₂',
        sampleQuestions: [
          { q: '2Ω·3Ω 직렬 합성저항은?', a: '5Ω' },
          { q: '6Ω·3Ω 병렬 합성저항은?', a: '2Ω' },
        ],
      },
      {
        id: 'c3',
        title: '합성저항 계산',
        summary: '복합 회로는 부분부터 묶어 한 개의 저항으로 줄인다.',
        detail:
          '직렬·병렬이 섞이면 **안쪽부터** 묶는다.\n' +
          '- 병렬 부분을 먼저 한 저항으로 계산\n' +
          '- 그 값을 직렬로 더한다\n' +
          '한 번에 V=IR 쓰지 말고, 합성저항부터 끝내라.',
        tips: ['안쪽 병렬 → 바깥 직렬 순서로 줄여라.', '마지막에 전체 V=IR 적용.'],
        coreElements: ['부분 묶기', '병렬 먼저', '직렬 합산'],
        formula: 'R_total = R_직렬 + R_병렬묶음',
        sampleQuestions: [{ q: '(6Ω∥3Ω) 직렬 4Ω 의 합성저항은?', a: '2 + 4 = 6Ω' }],
      },
    ],
    example: {
      title: '합성저항과 전류 구하기',
      steps: [
        { num: 1, label: '병렬 먼저', body: '6Ω·3Ω 병렬을 묶는다.', formula: '1/R = 1/6 + 1/3 = 1/2 → R = 2Ω' },
        { num: 2, label: '직렬 합산', body: '묶은 2Ω 에 직렬 4Ω 을 더하면?', formula: 'R = 2 + 4 = 6Ω', fadable: true, reveal: '합성저항 R = 6Ω' },
        { num: 3, label: '전류', body: '전체 전압 12V 로 옴의 법칙을 적용해봐.', formula: 'I = V/R = 12/6 = 2A', fadable: true, reveal: 'I = 12/6 = 2A' },
        { num: 4, label: '결론', body: '합성저항과 전체 전류를 정리하면?', fadable: true, reveal: '합성저항 6Ω, 전체 전류 2A' },
      ],
    },
    quiz: {
      question: '2Ω 과 3Ω 을 직렬로 연결한 합성저항은?',
      options: ['1.2Ω', '5Ω', '6Ω', '2.5Ω'],
      answerIndex: 1,
      explain: '직렬은 그냥 더한다. 2 + 3 = 5Ω.',
      hints: [
        '직렬이다. 직렬 합성저항 공식부터 떠올려라.',
        '직렬은 더한다 — R = R₁ + R₂.',
        '2 + 3 을 계산해라.',
      ],
      optionFeedback: [
        '1.2Ω 는 병렬 계산(6/5)이다. 문제는 직렬이다.',
        '정답! 직렬은 합 — 2+3=5Ω.',
        '6Ω 은 곱(2×3)이다. 직렬은 합이지 곱이 아니다.',
        '2.5 는 평균이다. 직렬은 더하기다.',
      ],
      relatedConceptId: 'c2',
      distractorTags: ['wrong-formula-parallel', 'correct', 'add-vs-multiply', 'average-not-sum'],
    },
    practiceQuizzes: [
      { id: 'q1', problemNumber: 'S-03', title: '전기회로 — 직렬·병렬 저항', difficulty: '중' },
      { id: 'q2', problemNumber: 'S-04', title: '옴의 법칙 적용', difficulty: '하' },
    ],
    summary:
      '오늘 **전기회로** 정리다 👇\n' +
      '① `V=IR` — 변형 세 형태 다 외운다\n' +
      '② 직렬 전류 같다 / 병렬 전압 같다\n' +
      '③ 합성저항은 **안쪽 병렬부터** 묶어 줄인다',
    sessionGoal: 'V=IR과 직렬·병렬 구분 끝내기',
    nextLine: '내일은 자기장 들어간다. 예습해라.',
    selfExplains: [
      {
        conceptId: 'c1',
        prompt: '옴의 법칙을 네 말로 설명해봐.',
        keywords: ['전압', '전류', '저항', 'V=IR'],
        sampleAnswer: '전압은 전류와 저항의 곱이다 — V=IR. 둘을 알면 나머지가 나온다.',
        feedbackStrong: '정확하다! V=IR 의 세 변수를 다 잡았다.',
        feedbackPartial: '거의 맞다. V·I·R 의 관계(곱)도 분명히 적어라.',
        feedbackWeak: 'V=IR 부터 다시. 전압=전류×저항 관계를 외워라.',
      },
      {
        conceptId: 'c2',
        prompt: '직렬과 병렬의 차이를 네 말로 설명해봐.',
        keywords: ['직렬', '병렬', '전류', '전압'],
        sampleAnswer: '직렬은 전류가 같고 전압이 나뉘고, 병렬은 전압이 같고 전류가 나뉜다.',
        feedbackStrong: '완벽하다! 직렬·병렬을 정확히 갈랐다.',
        feedbackPartial: '방향은 맞다. 어느 쪽이 같고 어느 쪽이 나뉘는지 분명히 해라.',
        feedbackWeak: '직렬=전류 같다, 병렬=전압 같다. 이 한 문장부터 다시.',
      },
      {
        conceptId: 'c3',
        prompt: '복합 회로 합성저항을 어떻게 줄이는지 네 말로 설명해봐.',
        keywords: ['병렬', '직렬', '안쪽', '합성'],
        sampleAnswer: '안쪽 병렬을 먼저 한 저항으로 묶고, 그 값을 직렬로 더해 줄인다.',
        feedbackStrong: '정확하다! 안쪽 병렬 → 바깥 직렬 순서를 잡았다.',
        feedbackPartial: '좋다. 병렬을 먼저 묶는다는 순서를 분명히 적어라.',
        feedbackWeak: '안쪽 병렬부터 묶는 순서를 다시 정리해라.',
      },
    ],
  },

  // ── cb_004 국어봇 · 차분 존댓말 · 비문학 독해 ──────────────────────────
  cb_004: {
    topic: '비문학 주제·근거 추론',
    intro:
      '오늘은 **비문학 주제·근거 추론**을 단계로 정리해드릴게요.\n' +
      '아래 칩으로 **개념 → 예제 → 퀴즈** 순서로 차근차근 가요 👇',
    keyCallout: '첫·끝 문단 1줄 요약 → 같은 방향이면 **주제**, 다르면 **주장 vs 반박**.',
    concepts: [
      {
        id: 'c1',
        title: '문단 중심문장',
        summary: '각 문단의 중심문장을 모으면 글 전체 구조가 보여요.',
        detail:
          '비문학은 **문단 단위**로 읽는 게 핵심이에요.\n' +
          '- 각 문단에서 **중심문장 1개**만 골라요\n' +
          '- 보통 첫 문장 또는 마지막 문장에 있어요\n' +
          '- 중심문장들을 이으면 글의 뼈대(구조)가 드러나요\n' +
          '세부 정보는 그 다음에 봐도 늦지 않아요.',
        tips: ['문단마다 한 줄 요약을 여백에 적어두세요.', '중심문장은 단정형(~이다/~해야 한다)으로 끝나는 경우가 많아요.'],
        coreElements: ['문단 단위 독해', '중심문장', '구조 파악'],
        sampleQuestions: [{ q: '문단의 중심문장은 주로 어디에 위치하나요?', a: '첫 문장 또는 마지막 문장' }],
      },
      {
        id: 'c2',
        title: '지시어 추적',
        summary: '이/그/이러한이 가리키는 대상을 정확히 짚어야 독해가 빨라져요.',
        detail:
          "지시어(`이`, `그`, `이러한`, `이는`)는 **앞 내용을 압축**한 단서예요.\n" +
          '- 지시어가 나오면 **가리키는 대상**을 바로 위에서 찾으세요\n' +
          '- 대상을 정확히 짚으면 문장 연결이 빨라져요\n' +
          '지시어를 놓치면 문장 간 논리가 끊겨요.',
        tips: ['지시어에 동그라미 치고 화살표로 대상을 연결해보세요.', '대상이 한 단어가 아니라 앞 문장 전체일 때도 많아요.'],
        coreElements: ['지시어', '지시 대상', '문장 연결'],
        sampleQuestions: [{ q: '"이러한 현상" 이 가리키는 것을 찾으려면 어디를 보나요?', a: '바로 앞 문장(들)' }],
      },
      {
        id: 'c3',
        title: '주장-근거 매칭',
        summary: '주장 문장과 그 근거를 짝지으면 글의 논증이 보여요.',
        detail:
          '논증형 지문은 **주장**과 **근거**로 이뤄져요.\n' +
          '- 주장: 단정·당위 문장 (~이다, ~해야 한다)\n' +
          '- 근거: 주장 앞 또는 바로 뒤, 둘 이상이면 접속사로 묶임(또한, 게다가)\n' +
          '주장-근거를 짝지으면 빈칸·일치 문제도 같이 풀려요.',
        tips: ['주장에 밑줄, 근거에 번호를 매겨보세요.', '근거가 사실인지 의견인지도 구분해두면 좋아요.'],
        coreElements: ['주장 문장', '근거 위치', '접속사 단서'],
        sampleQuestions: [{ q: '근거가 둘 이상일 때 자주 쓰이는 신호어는?', a: '또한, 게다가, 더욱이' }],
      },
    ],
    example: {
      title: '단락 요약으로 주제 잡기',
      steps: [
        { num: 1, label: '첫 문단 요약', body: '첫 문단을 한 줄로: "기술 발전이 일자리를 바꾼다."' },
        { num: 2, label: '끝 문단 요약', body: '끝 문단을 직접 한 줄로 요약해봐요.', fadable: true, reveal: '"그래도 인간의 역할은 남는다."' },
        { num: 3, label: '방향 비교', body: '두 요약의 방향이 다르면 어떤 구조일까요?', fadable: true, reveal: '방향이 다르면 **주장 vs 반박** 구조' },
        { num: 4, label: '주제 확정', body: '그렇다면 글의 주제는 어느 쪽일까요?', fadable: true, reveal: '글이 결국 지지하는 끝 문단 쪽' },
      ],
    },
    quiz: {
      question: '비문학에서 글의 주제를 가장 빠르게 잡는 방법은?',
      options: ['모든 문장을 정독', '첫·끝 문단 1줄 요약 비교', '제목만 보기', '선택지부터 읽기'],
      answerIndex: 1,
      explain: '첫 문단과 끝 문단을 각각 1줄로 요약해 방향을 비교하면 주제가 빠르게 드러나요.',
      hints: [
        '글 전체의 방향은 어디에 가장 잘 드러날까요?',
        '첫 문단과 끝 문단을 각각 한 줄로 줄여보세요.',
        '두 요약의 방향을 비교하면 주제가 보여요.',
      ],
      optionFeedback: [
        '정독은 시간이 너무 들어요. 구조부터 잡는 게 빨라요.',
        '정답! 첫·끝 문단 요약 비교가 가장 빠른 길이에요.',
        '제목이 없거나 모호한 지문도 많아요. 본문 요약이 더 확실해요.',
        '선택지부터 보면 함정에 끌려가요. 본문 구조가 먼저예요.',
      ],
      relatedConceptId: 'c1',
      distractorTags: ['over-detail', 'correct', 'literal-word-match', 'jump-to-conclusion'],
    },
    practiceQuizzes: [
      { id: 'q1', problemNumber: 'K-05', title: '비문학 — 주제·구조 파악', difficulty: '중' },
      { id: 'q2', problemNumber: 'K-06', title: '문장 간 논리 관계', difficulty: '상' },
    ],
    summary:
      '오늘 **비문학 주제·근거 추론** 정리예요 👇\n' +
      '① **문단 중심문장**을 모아 구조를 잡기\n' +
      '② **지시어**의 대상을 정확히 추적\n' +
      '③ **주장-근거 매칭**으로 논증 파악',
    sessionGoal: '문단 요약으로 글의 주제 잡기',
    nextLine: '내일은 주장형 vs 정보형 구분으로 이어가요.',
    selfExplains: [
      {
        conceptId: 'c1',
        prompt: '비문학에서 문단 중심문장이 왜 중요한지 본인 말로 설명해보세요.',
        keywords: ['중심문장', '문단', '구조', '요약'],
        sampleAnswer: '각 문단의 중심문장을 모으면 글 전체의 뼈대(구조)가 드러나요.',
        feedbackStrong: '정확해요! 중심문장과 구조의 연결을 잘 잡았어요.',
        feedbackPartial: '좋아요. 중심문장을 모으면 구조가 보인다는 점을 더해보세요.',
        feedbackWeak: '문단 단위로 중심문장을 고른다는 출발점부터 다시 볼까요?',
      },
      {
        conceptId: 'c2',
        prompt: '지시어를 추적하는 이유를 본인 말로 설명해보세요.',
        keywords: ['지시어', '대상', '연결', '앞'],
        sampleAnswer: '이/그/이러한 같은 지시어의 대상을 앞에서 찾으면 문장 연결이 빨라져요.',
        feedbackStrong: '훌륭해요! 지시어와 대상 연결을 정확히 설명했어요.',
        feedbackPartial: '맞아요. 대상을 앞에서 찾는다는 점을 분명히 해보세요.',
        feedbackWeak: '지시어가 앞 내용을 압축한 단서라는 점부터 다시 정리해봐요.',
      },
      {
        conceptId: 'c3',
        prompt: '주장과 근거를 짝짓는 방법을 본인 말로 설명해보세요.',
        keywords: ['주장', '근거', '접속사', '논증'],
        sampleAnswer: '단정형 주장 문장에 근거를 짝지으면 글의 논증 구조가 보여요.',
        feedbackStrong: '정확해요! 주장-근거 매칭으로 논증을 잡았어요.',
        feedbackPartial: '좋아요. 근거의 위치·접속사 단서도 함께 넣어보세요.',
        feedbackWeak: '주장(단정형)과 근거를 구분하는 것부터 다시 볼까요?',
      },
    ],
  },

  // ── cb_005 사회봇 · 열정 반말 · 현대사회 쟁점 ──────────────────────────
  cb_005: {
    topic: '현대사회 쟁점 분석',
    intro:
      '오늘은 **시사 쟁점 분석**이야! 입장이랑 근거, 두 축으로 쪼개면 끝나.\n' +
      '아래 칩으로 **개념 → 예제 → 퀴즈** 출발 👇',
    keyCallout: '두 축! **입장**(누가·뭘·왜) / **근거**(사실인지 의견인지)',
    concepts: [
      {
        id: 'c1',
        title: '입장 분리',
        summary: '누가·무엇을·왜 주장하는지 한 줄로 정리하면 쟁점이 보여.',
        detail:
          '쟁점 분석의 1단계는 **입장 쪼개기**야!\n' +
          '- **누가** 주장하는가 (주체)\n' +
          '- **무엇을** 주장하는가 (핵심 주장)\n' +
          '- **왜** 그렇게 보는가 (이유)\n' +
          '이 세 개를 한 줄로 적으면 복잡한 이슈도 단순해져.',
        tips: ['이슈를 보면 먼저 "누가·뭘·왜" 한 줄부터 적어.', '입장은 보통 2개 이상 — 각각 따로 정리해.'],
        coreElements: ['주체', '핵심 주장', '이유'],
        sampleQuestions: [{ q: '쟁점 분석에서 입장을 정리하는 세 요소는?', a: '누가·무엇을·왜' }],
      },
      {
        id: 'c2',
        title: '사실 vs 가치판단',
        summary: '근거가 데이터(사실)인지 의견(가치)인지 구분해야 평가가 돼.',
        detail:
          '근거는 두 종류야 — 섞으면 안 돼!\n' +
          '- **사실 근거**: 데이터·통계·검증 가능한 것\n' +
          '- **가치판단 근거**: 옳다/나쁘다 같은 주관적 평가\n' +
          '사실 근거가 많을수록 주장이 탄탄해. 이걸로 두 입장을 비교해.',
        tips: ['근거마다 [사실]/[의견] 태그를 붙여봐.', '숫자·출처가 있으면 사실, 평가어가 있으면 의견.'],
        coreElements: ['사실(데이터)', '가치판단(의견)', '근거 평가'],
        sampleQuestions: [{ q: '"실업률이 3% 올랐다" 는 사실인가 의견인가?', a: '사실(데이터)' }],
      },
      {
        id: 'c3',
        title: '쟁점 매트릭스',
        summary: '두 입장의 근거를 같은 기준으로 표에 놓으면 쟁점이 또렷해져.',
        detail:
          '두 입장을 **같은 기준**으로 표에 정리하면 비교가 쉬워!\n' +
          '- 행: 비교 기준(경제·형평성·실현가능성 등)\n' +
          '- 열: 입장 A / 입장 B\n' +
          '- 칸: 각 입장의 근거\n' +
          '빈칸이 보이는 입장이 약한 쪽이야.',
        tips: ['기준(행)을 먼저 정하고 양쪽 근거를 채워.', '근거 없는 칸 = 그 입장의 약점.'],
        coreElements: ['비교 기준', '입장 A/B', '근거 매핑'],
        sampleQuestions: [{ q: '쟁점 매트릭스에서 빈칸이 많은 입장은?', a: '근거가 약한 입장' }],
      },
    ],
    example: {
      title: '환경 보전 vs 개발 쟁점 분석',
      steps: [
        { num: 1, label: '입장 분리', body: '환경 보전 측: 생태계 보호 / 개발 측: 일자리·경제 성장.' },
        { num: 2, label: '근거 태깅', body: '각 근거에 [사실]/[가치판단] 태그를 직접 붙여봐.', fadable: true, reveal: '"고용 1만↑"[사실], "자연은 지켜야"[가치판단]' },
        { num: 3, label: '매트릭스', body: '어떤 기준으로 두 입장을 표에 놓을까?', fadable: true, reveal: '경제·환경·형평성 기준으로 배치' },
        { num: 4, label: '결론', body: '어느 쪽이 더 설득력 있을까?', fadable: true, reveal: '근거가 사실로 더 받쳐지는 쪽' },
      ],
    },
    quiz: {
      question: '시사 쟁점 분석에서 가장 먼저 할 일은?',
      options: ['결론부터 내기', '입장을 누가·뭘·왜로 분리', '감정으로 판단', '한쪽만 보기'],
      answerIndex: 1,
      explain: '먼저 입장을 누가·무엇을·왜로 분리해야 근거 평가와 비교가 가능해.',
      hints: [
        '쟁점엔 보통 입장이 둘 이상이야. 거기서 출발해.',
        "각 입장을 '누가·무엇을·왜'로 쪼개봐.",
        '입장 분리가 1단계 — 그래야 근거 비교가 돼.',
      ],
      optionFeedback: [
        '결론부터 내면 편향돼. 입장·근거를 본 다음이 순서야.',
        '정답! 입장 분리(누가·뭘·왜)가 1단계야.',
        '감정 판단은 분석이 아니야. 사실·근거로 봐야 해.',
        '한쪽만 보면 쟁점이 안 보여. 양쪽 입장을 같이 놓아야 해.',
      ],
      relatedConceptId: 'c1',
      distractorTags: ['jump-to-conclusion', 'correct', 'jump-to-conclusion', 'one-side-only'],
    },
    practiceQuizzes: [
      { id: 'q1', problemNumber: 'C-02', title: '쟁점 — 입장·근거 분리', difficulty: '중' },
      { id: 'q2', problemNumber: 'C-03', title: '쟁점 — 사실 vs 가치판단', difficulty: '상' },
    ],
    summary:
      '오늘 **현대사회 쟁점 분석** 정리야 👇\n' +
      '① **입장 분리** — 누가·무엇을·왜\n' +
      '② 근거를 **사실 vs 가치판단**으로 태깅\n' +
      '③ **쟁점 매트릭스**로 두 입장 동시 비교',
    sessionGoal: '입장과 근거 두 축으로 쟁점 쪼개기',
    nextLine: '내일은 정책 분석 들어간다. 가보자!',
    selfExplains: [
      {
        conceptId: 'c1',
        prompt: '쟁점 분석에서 입장을 어떻게 쪼개는지 네 말로 설명해봐!',
        keywords: ['누가', '무엇', '왜', '주장'],
        sampleAnswer: '누가·무엇을·왜 주장하는지 한 줄로 정리하면 입장이 또렷해져.',
        feedbackStrong: '완벽해! 누가·뭘·왜 세 축을 정확히 잡았어.',
        feedbackPartial: '좋아! 세 요소(누가·무엇·왜)를 다 넣으면 더 완벽해.',
        feedbackWeak: '입장은 누가·무엇을·왜 — 이 세 줄부터 다시 잡아보자!',
      },
      {
        conceptId: 'c2',
        prompt: '사실 근거와 가치판단 근거의 차이를 네 말로 설명해봐!',
        keywords: ['사실', '데이터', '가치', '의견'],
        sampleAnswer: '사실 근거는 데이터·통계처럼 검증 가능한 것, 가치판단은 옳다/나쁘다 같은 의견이야.',
        feedbackStrong: '정확해! 사실 vs 가치판단을 잘 갈랐어.',
        feedbackPartial: '방향 좋아! 데이터=사실, 평가어=의견이라는 점도 붙여봐.',
        feedbackWeak: '근거를 [사실]/[의견]으로 태깅하는 것부터 다시 가보자!',
      },
      {
        conceptId: 'c3',
        prompt: '쟁점 매트릭스를 어떻게 쓰는지 네 말로 설명해봐!',
        keywords: ['기준', '입장', '근거', '비교'],
        sampleAnswer: '같은 기준(행)에 두 입장(열)의 근거를 채우면 비교가 한눈에 돼.',
        feedbackStrong: '완벽해! 기준으로 두 입장을 비교하는 게 핵심이야.',
        feedbackPartial: '좋아! 같은 기준에 양쪽 근거를 놓는다는 점을 더 강조해봐.',
        feedbackWeak: '기준을 먼저 정하고 양쪽 근거를 채운다는 순서를 다시 잡자!',
      },
    ],
  },
};

const FALLBACK: BotLesson = {
  topic: '오늘의 학습',
  intro: '오늘 배운 내용을 같이 정리해볼까요? 아래 칩으로 시작해요 👇',
  keyCallout: '대화에서 다룬 개념을 카드로 정리해 드려요.',
  concepts: [
    {
      id: 'c1',
      title: '오늘의 핵심',
      summary: '대화에서 다룬 개념을 카드로 정리해 드려요.',
      detail: '봇과 나눈 대화의 핵심 개념을 한곳에 모아 복습할 수 있어요.',
      tips: ['궁금한 개념은 봇에게 바로 물어보세요.'],
      coreElements: ['핵심 개념', '복습'],
      sampleQuestions: [{ q: '오늘 배운 것 중 가장 어려웠던 부분은?' }],
    },
  ],
  example: {
    title: '예제',
    steps: [
      { num: 1, label: '시작', body: '개념을 먼저 확인하고 예제로 적용해봐요.' },
      { num: 2, label: '적용', body: '배운 개념을 직접 한 번 적용해봐요.', fadable: true, reveal: '개념 → 예제 → 복습으로 이어집니다.' },
    ],
  },
  quiz: {
    question: '오늘 학습을 한마디로 정리하면?',
    options: ['개념 이해', '예제 적용', '복습 필요', '모두 해당'],
    answerIndex: 3,
    explain: '개념 이해 → 예제 적용 → 복습까지가 한 사이클이에요.',
    hints: [
      '학습은 한 단계로 끝나지 않아요.',
      '개념 → 예제 → 복습으로 이어져요.',
      '셋 다 필요해요.',
    ],
    optionFeedback: [
      '개념만으론 부족해요. 적용·복습까지 가야 해요.',
      '적용만으론 부족해요. 개념·복습도 함께예요.',
      '복습만으론 부족해요. 개념·적용이 먼저예요.',
      '정답! 개념·예제·복습이 한 사이클이에요.',
    ],
    relatedConceptId: 'c1',
    distractorTags: ['over-detail', 'over-detail', 'over-detail', 'correct'],
  },
  practiceQuizzes: [{ id: 'q1', problemNumber: 'Q-01', title: '기초 개념 점검', difficulty: '하' }],
  summary: '오늘 학습을 정리했어요.',
  sessionGoal: '오늘 핵심 한 가지 정리하기',
  nextLine: '내일도 이어가요!',
  selfExplains: [
    {
      conceptId: 'c1',
      prompt: '오늘 배운 핵심을 본인 말로 한 번 설명해볼래요?',
      keywords: ['개념', '예제', '복습'],
      sampleAnswer: '개념을 이해하고 예제로 적용한 뒤 복습하면 한 사이클이 완성돼요.',
      feedbackStrong: '잘 정리했어요! 학습 사이클을 잘 짚었어요.',
      feedbackPartial: '좋아요. 개념·예제·복습 흐름을 한 번 더 이어보세요.',
      feedbackWeak: '개념 → 예제 → 복습 순서부터 다시 떠올려볼까요?',
    },
  ],
};

/**
 * 공식 튜터(봇 마켓 등록 대상)를 과목 정합 리치 수업에 매핑.
 * 가이드 수업 콘텐츠는 cb_*(과목별) 키에 작성돼 있어, 같은 과목의 공식 튜터를 별칭한다.
 * ot_001 수학 마스터 → cb_001 일차함수의 그래프 / ot_002 영어 → cb_002 문장 흐름 파악 / ot_003 과학 → cb_003 전기회로.
 */
const TUTOR_LESSON_ALIAS: Record<string, string> = {
  ot_001: 'cb_001',
  ot_002: 'cb_002',
  ot_003: 'cb_003',
};

export function getBotLesson(botId: string): BotLesson {
  const key = TUTOR_LESSON_ALIAS[botId] ?? botId;
  return LESSONS[key] ?? FALLBACK;
}

/** 우측 레일·인라인 카드용 — 개념에서 파생한 학습 가이드 */
export function getStudyGuide(botId: string): StudyConcept[] {
  return getBotLesson(botId).concepts.map(c => ({ id: c.id, concept: c.title, summary: c.summary }));
}

/** 우측 레일·인라인 카드용 — 연습 퀴즈 */
export function getChatQuizzes(botId: string): ChatQuiz[] {
  return getBotLesson(botId).practiceQuizzes;
}

/**
 * 자기설명 프롬프트(B4) — conceptId 지정 시 매핑, 미지정/미발견 시 첫 프롬프트 폴백.
 * selfExplains 가 비면 undefined.
 */
export function getSelfExplain(botId: string, conceptId?: string): SelfExplainPrompt | undefined {
  const list = getBotLesson(botId).selfExplains;
  if (!list || list.length === 0) return undefined;
  if (conceptId) {
    const found = list.find(s => s.conceptId === conceptId);
    if (found) return found;
  }
  return list[0];
}
