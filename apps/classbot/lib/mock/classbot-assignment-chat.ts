/**
 * 과제 대화 mock — `/classbot/assignment/[id]/chat` (SCR-C-37 · FR-C-39).
 *
 * 이 화면의 대화는 **과제에 매여 있다**. 그래서 여는 인사부터 되돌림 문구까지 전부
 * 과제 맥락(제목 · 문항 수 · 마감 · 발송한 선생님)을 받아서 만든다 — 봇 대화(`/classbot/chat`)의
 * 수업 오프너와 섞이지 않는다.
 *
 * 지금 답은 **정해진 문구**다(껍데기 단계). 실제 봇 응답이 붙을 자리는
 * `lib/store/assignment-chat.ts` 의 `append` 주변에 적어 뒀다.
 */

/** 대화를 만들 때 필요한 과제 맥락 — 화면이 실제 과제 행에서 뽑아 넘긴다. */
export interface AssignmentChatContext {
  assignmentId: string;
  /** 과제 제목 */
  title: string;
  /** 단원 한 줄 — 되돌림 문구가 "이 안에서만 돕는다"고 말할 때 쓴다. */
  scope: string;
  questionCount: number;
  /** "오늘 22:00" */
  dueLabel: string;
  botName: string;
  /** 발송한 선생님 — "김수학 선생님" */
  assignedBy: string;
  /** 학생 이름 */
  studentName: string;
}

/** 봇 말풍선에 붙는 작은 꼬리표. */
export type AssignmentChatTag = '되묻기' | '확인' | '수업 밖';

export interface AssignmentChatReply {
  text: string;
  tag?: AssignmentChatTag;
  /** 수업 범위 밖 질문을 되돌린 답인지 — 화면이 안내 줄을 덧붙인다. */
  redirected?: boolean;
}

/** 수업 범위 밖으로 보는 낱말 — 봇이 되돌리는 기준(더미). */
const OFF_TOPIC_WORDS = [
  '급식', '점심', '저녁', '게임', '아이돌', '연예인', '축구', '야구',
  '유튜브', '웹툰', '드라마', '방학', '여행', '콘서트',
];

/** 첫 화면에 이미 있는 대화 — 봇이 과제를 열어 준다. */
export function buildAssignmentChatSeed(ctx: AssignmentChatContext): AssignmentChatReply[] {
  return [
    {
      text: `${ctx.studentName}, 「${ctx.title}」 같이 풀어 보자. ${ctx.questionCount}문항이고 ${ctx.dueLabel}까지야.`,
    },
    {
      text: `여기서 나눈 이야기는 과제에 그대로 남아. ${ctx.assignedBy}이 네 풀이 과정을 볼 수 있어. 막히면 답을 달라고 하지 말고 어디서 막혔는지부터 말해 줘.`,
      tag: '확인',
    },
  ];
}

/** 정해진 답 — 학생 말에 들어 있는 낱말로 고른다. */
const CANNED: { keys: string[]; reply: AssignmentChatReply }[] = [
  {
    keys: ['힌트', '모르겠', '어려'],
    reply: {
      text: '힌트는 줄게. 답은 아직 안 줘. 지금 문항에서 네가 아는 것부터 한 줄로 적어 볼래? 거기서부터 같이 가자.',
      tag: '되묻기',
    },
  },
  {
    keys: ['남은', '몇 개', '얼마나', '진행'],
    reply: {
      text: '곁에 있는 진행 칸을 보면 지금 어디까지 왔는지 한눈에 보여. 낸 답도 거기 그대로 있어.',
      tag: '확인',
    },
  },
  {
    keys: ['답', '정답', '알려줘'],
    reply: {
      text: '답을 그냥 알려주면 네 풀이 과정이 안 남아. 대신 한 발 앞 질문을 줄게 — 지금 문항에서 구해야 하는 게 정확히 뭐야?',
      tag: '되묻기',
    },
  },
];

const FALLBACK: AssignmentChatReply = {
  text: '지금 적은 걸 과제에 남겨 둘게. 다음 문항으로 갈까, 아니면 방금 것 한 번 더 볼까?',
  tag: '확인',
};

/**
 * 학생 말 → 봇 답 한 줄.
 *
 * 범위 밖 낱말이 있으면 과제 단원으로 되돌린다(핸드오프 Scope Guard 의 표시 규약).
 * @param text - 학생이 보낸 말
 * @param ctx - 과제 맥락
 */
export function pickAssignmentChatReply(text: string, ctx: AssignmentChatContext): AssignmentChatReply {
  if (OFF_TOPIC_WORDS.some(w => text.includes(w))) {
    return {
      text: `그건 내가 답할 수 있는 범위가 아니야. 나는 ${ctx.assignedBy}이 이 과제용으로 만든 봇이라 「${ctx.scope}」 안에서만 도와줄 수 있어. 우리 하던 문항으로 돌아갈까?`,
      tag: '수업 밖',
      redirected: true,
    };
  }
  for (const c of CANNED) {
    if (c.keys.some(k => text.includes(k))) return c.reply;
  }
  return FALLBACK;
}
