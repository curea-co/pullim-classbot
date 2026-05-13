/**
 * 클래스봇 학생 채팅 mock — 빠른 프롬프트 / 자동 응답.
 * 봇 캐릭터 톤별로 분기 (친근 / 정중 / 스파르타).
 * 봇별 첫 인삿말은 `ClassBot.greeting`에서 옴 (lib/mock/classbot.ts).
 */

export type ReplyKey =
  | 'extremum'         // 수학 — 극값 찾기 (cb_001)
  | 'blank_inference'  // 영어 — 빈칸 추론 (cb_002)
  | 'circuit'          // 과학 — 전기회로 (cb_003)
  | 'today_summary'
  | 'exam_prep'
  | 'reassurance';

export type ClassbotQuickPrompt = {
  text: string;
  expectedReplyKey: ReplyKey;
};

/** cb_001 수학이 형 — 친근 톤 (반말) */
const repliesFriendly: Record<ReplyKey, string> = {
  extremum:
    '좋은 질문! 일단 직접 시도해보자. 도함수 f\'(x)를 먼저 구하고, f\'(x) = 0인 x를 찾아봐. ' +
    '그 다음에 부호 변화 표를 5초 그려보는 거야. + → −면 극대, − → +면 극소. 부호 안 바뀌면 극값 X 야. 이거 풀림 비주얼에서 슬라이더로 만져보면 한 방에 잡혀!',
  blank_inference:
    '빈칸 추론은 글 흐름을 먼저 잡아야 돼. 빈칸 앞뒤 문장의 논리 관계(역접/인과/예시)를 먼저 표시하고, 그 관계에 맞는 단어를 골라봐. ' +
    '풀림 비주얼에서 단락 흐름 도식으로 만져보면 한 방에 잡혀.',
  circuit:
    '전기회로 처음부터? 일단 옴의 법칙 V=IR부터. 직렬 회로는 전류가 같고 전압이 나뉘고, 병렬은 반대야. ' +
    '통합과학 1단원 핵심 3공식이 옴의 법칙·직렬·병렬 — 이 셋만 잡으면 80% 끝. 풀림 비주얼로 회로 만져보면 한 방에 정리돼.',
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

/** cb_002 영어 누나 — 정중 톤 (친근한 존댓말) */
const repliesFormal: Record<ReplyKey, string> = {
  extremum:
    '좋은 질문이에요. 일단 직접 시도해봐요. 도함수 f\'(x)를 먼저 구하고, f\'(x) = 0인 x를 찾아봐요. ' +
    '그 다음에 부호 변화 표를 5초 그려보는 거예요. + → −면 극대, − → +면 극소. 부호 안 바뀌면 극값은 없어요. 풀림 비주얼에서 슬라이더로 만져보면 한 번에 잡혀요.',
  blank_inference:
    '빈칸 추론은 글의 흐름을 먼저 잡아야 해요. 빈칸 앞뒤 문장의 논리 관계(역접/인과/예시)를 먼저 표시하고, 그 관계에 맞는 단어를 골라요. ' +
    '7유형 중 5~7번이 접속사 논리 관계인데, 거기서 막히면 풀림 비주얼에서 단락 흐름 도식으로 만져봐요.',
  circuit:
    '전기회로 처음부터요? 옴의 법칙 V=IR부터 시작해요. 직렬 회로는 전류가 같고 전압이 나뉘고, 병렬은 반대예요. ' +
    '통합과학 1단원 핵심 3공식이 옴의 법칙·직렬·병렬이에요. 풀림 비주얼로 회로 직접 만져보면 한 번에 정리돼요.',
  today_summary:
    '오늘 미적분 III장 — 도함수 활용·극값·변곡점 진행했어요. 핵심 메시지 3개:\n' +
    '① 부호 변화 없으면 극값 없음\n② f"(x) 부호 변화는 변곡점\n③ 극값 vs 극점 — y값/x값 구분 명확히\n\n' +
    '내일은 함수의 그래프 개형 종합으로 가요.',
  exam_prep:
    '4월 학평까지 D-6이에요. 오답정복 큐를 보니 미분 부호 변화 패턴이 5번째 막혔던데, 정복 세트 1개 + 비주얼 시뮬레이션 5분이면 잡힐 거 같아요. ' +
    '플래너에 자동 추가해드릴까요?',
  reassurance:
    '서연, 솔직히 말하면요 — 영어 빈칸 추론 14p 올린 건 우리 반에서 서연 학생 혼자예요. 17일 연속도 대단해요. ' +
    '미분 한 가지만 더 잡으면 다음 모의 1등급권이에요. 페이스 유지해요.',
};

/** cb_003 과학 쌤 — 스파르타 톤 (단호한 반말) */
const repliesSpartan: Record<ReplyKey, string> = {
  extremum:
    '직접 풀어. 도함수 f\'(x)부터 구한다. f\'(x) = 0인 x를 찾고 부호 변화 표를 그려라. ' +
    '+ → −면 극대, − → +면 극소. 부호 변화 없으면 극값 없다. 풀림 비주얼 슬라이더로 직접 확인해라.',
  blank_inference:
    '빈칸 추론. 글 흐름 먼저 잡아라. 빈칸 앞뒤 문장의 논리 관계(역접/인과/예시) 표시하고 그에 맞는 단어 골라라. ' +
    '풀림 비주얼 도식으로 직접 확인해라.',
  circuit:
    '전기회로. 옴의 법칙 V=IR부터 외워라. 직렬 회로는 전류 같고 전압 나뉜다. 병렬은 전압 같고 전류 나뉜다. ' +
    '통합과학 1단원 핵심 3공식. 풀림 비주얼로 회로 직접 그려서 확인해라.',
  today_summary:
    '오늘 미적분 III장 — 도함수 활용·극값·변곡점 진행했다. 외울 것:\n' +
    '① 부호 변화 없으면 극값 없음\n② f"(x) 부호 변화는 변곡점\n③ 극값과 극점 구분 명확히\n\n' +
    '내일은 함수의 그래프 개형 종합. 예습해라.',
  exam_prep:
    '학평 D-6. 오답정복 큐에 미분 부호 변화 패턴이 5번 막혔다. 정복 세트 1개 + 비주얼 5분, 그게 답이다. ' +
    '플래너에 자동 추가해두겠다.',
  reassurance:
    '서연. 영어 빈칸 추론 14p 올린 건 우리 반에서 너 혼자다. 17일 연속도 잘 버텼다. ' +
    '미분 한 가지만 더 잡으면 1등급권. 페이스 유지해라.',
};

/** 봇별 기본 응답 맵 */
const repliesByTone: Record<'친근' | '정중' | '스파르타', Record<ReplyKey, string>> = {
  친근: repliesFriendly,
  정중: repliesFormal,
  스파르타: repliesSpartan,
};

/** 봇별 디폴트 응답 (자유 질문 매칭 실패 시) */
const defaultRepliesByTone: Record<'친근' | '정중' | '스파르타', string> = {
  친근:
    '음, 좀 더 구체적으로 말해줄래? 어느 단원·어느 문제에서 막혔는지 알려주면 더 정확히 도와줄 수 있어. ' +
    '아니면 "도와줘" 누르면 5단계 힌트로 같이 풀어볼 수도 있고.',
  정중:
    '음, 좀 더 구체적으로 말해줘요. 어느 단원·어느 문제에서 막혔는지 알려주면 더 정확히 도와줄 수 있어요. ' +
    '아니면 "도와줘" 누르면 5단계 힌트로 같이 풀어볼 수도 있어요.',
  스파르타:
    '구체적으로 말해라. 어느 단원·어느 문제에서 막혔는지 알려야 도와준다. ' +
    '"도와줘" 누르면 5단계 힌트로 함께 풀어본다.',
};

type BotTone = '친근' | '정중' | '스파르타';

/**
 * 질문 → 봇 톤별 reply. quickPrompt 클릭 시 forcedKey가 들어오면 그걸 우선,
 * 자유 질문이면 키워드 매칭. 매칭 실패 시 defaultRepliesByTone fallback.
 */
export function pickClassbotReply(question: string, botTone: BotTone = '친근', forcedKey?: ReplyKey): string {
  const replies = repliesByTone[botTone];
  if (forcedKey) return replies[forcedKey];
  const lower = question.toLowerCase();
  if (lower.match(/극값|극대|극소|미분|도함수/)) return replies.extremum;
  if (lower.match(/빈칸|추론/))                     return replies.blank_inference;
  if (lower.match(/회로|전기|옴의?\s*법칙/))         return replies.circuit;
  if (lower.match(/오늘.*수업|요약|정리/))           return replies.today_summary;
  if (lower.match(/시험|학평|모의|모평|준비/))      return replies.exam_prep;
  if (lower.match(/잘하|힘들|괜찮|어떡|어떻게/))    return replies.reassurance;
  return defaultRepliesByTone[botTone];
}
