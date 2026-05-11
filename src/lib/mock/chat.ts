/**
 * 클래스봇 학생 채팅 mock — 인사 / 빠른 프롬프트 / 자동 응답.
 * 원본 phase1.ts에서 채팅 관련 export만 추출.
 */

export const classbotChatGreeting =
  '서연 안녕! 수학이 형이야 🙌 오늘 미적분 III장 진행 중인데 궁금한 거 있으면 편하게 물어봐. ' +
  'Scope L3라서 개념 설명까지 도와줄 수 있어. 답은 직접 알려주진 않을 거지만, 길은 알려줄게.';

export type ClassbotQuickPrompt = {
  text: string;
  expectedReplyKey: string;
};

export const classbotQuickPrompts: ClassbotQuickPrompt[] = [
  { text: '극값 어떻게 찾아요?',         expectedReplyKey: 'extremum' },
  { text: '오늘 수업 요약해줘요',         expectedReplyKey: 'today_summary' },
  { text: '4월 학평 대비 뭐 해야 해요?', expectedReplyKey: 'exam_prep' },
  { text: '저 잘하고 있는 거예요?',       expectedReplyKey: 'reassurance' },
];

export const classbotChatReplies: Record<string, string> = {
  extremum:
    '좋은 질문! 일단 직접 시도해보자. 도함수 f\'(x)를 먼저 구하고, f\'(x) = 0인 x를 찾아봐. ' +
    '그 다음에 부호 변화 표를 5초 그려보는 거야. + → −면 극대, − → +면 극소. 부호 안 바뀌면 극값 X 야. 이거 풀림 비주얼에서 슬라이더로 만져보면 한 방에 잡혀!',
  today_summary:
    '오늘 미적분 III장 — 도함수 활용·극값·변곡점 진행했어. 핵심 메시지 3개:\n' +
    '① 부호 변화 없으면 극값 없음\n② f"(x) 부호 변화는 변곡점\n③ 극값 vs 극점 — y값/x값 구분 명확히\n\n' +
    '내일은 함수의 그래프 개형 종합으로 갈 거야.',
  exam_prep:
    '4월 학평까지 D-6. 오답정복 큐 보니 미분 부호 변화 패턴이 5번째 막혔던데, 정복 세트 1개 + 비주얼 시뮬레이션 5분이면 잡힐 거 같아. ' +
    '플래너에 자동 추가해줄까?',
  reassurance:
    '서연, 솔직히 말하면 — 영어 빈칸 추론 14p 올린 건 우리 반에서 너 혼자야. 17일 연속도 대단해. ' +
    '미분 한 가지만 더 잡으면 다음 모의 1등급권. 페이스 유지하자.',
};

/** 채팅에서 매칭 안 되는 자유 질문에 대한 디폴트 응답 (클래스봇 톤) */
export const classbotDefaultReply =
  '음, 좀 더 구체적으로 말해줄래? 어느 단원·어느 문제에서 막혔는지 알려주면 더 정확히 도와줄 수 있어. ' +
  '아니면 "도와줘" 누르면 5단계 힌트로 같이 풀어볼 수도 있고.';

export function pickClassbotReply(question: string): string {
  const lower = question.toLowerCase();
  if (lower.match(/극값|극대|극소|미분|도함수/)) return classbotChatReplies.extremum;
  if (lower.match(/오늘.*수업|요약|정리/)) return classbotChatReplies.today_summary;
  if (lower.match(/시험|학평|모의|모평|준비/)) return classbotChatReplies.exam_prep;
  if (lower.match(/잘하|힘들|괜찮|어떡|어떻게/)) return classbotChatReplies.reassurance;
  return classbotDefaultReply;
}
