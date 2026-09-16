import type { StudentBotSource } from '@/lib/store/mode-bots';

/**
 * 봇 하나가 어느 챗 레인을 타는가.
 *
 * - `sse`    — 선생님 반의 봇. `bot.id` 가 pullim-api 반 id 라 `POST/GET /classbot/classes/:classId/chat` 이 선다.
 * - `locked` — 담은 봇(`source='self'`). `bot.id` 가 같은 오리진 `class_bots.id`(`lib/store/mode-bots.ts` 의
 *   `row.botId`)라 정본 서버가 멤버십을 못 찾고 매 메시지에 403 을 준다. 종전에는 목 레인(`pickClassbotReply`)이
 *   이 봇들의 유일한 응답 경로였고, 2026-09-16 계획 PR 4 가 그 레인을 걷었다. 챗 단위를 봇에서 반으로 바꾸는
 *   것은 PR 5 몫이고(계획 §10 해소 3), 담은 봇·마켓 계열은 이번 범위 밖이다(결정 ①). 그때까지 이 봇은
 *   선택기에 그대로 보이되 **기록도 전송도 부르지 않고** composer 를 잠근다 — 403 안내가 대화처럼 보이는 것보다
 *   「준비 중」이 사실이다.
 *
 * @param source - 슬롯의 출처
 * @returns 레인
 */
export type ChatLane = 'sse' | 'locked';

export function chatLaneFor(source: StudentBotSource): ChatLane {
  return source === 'self' ? 'locked' : 'sse';
}

/** 잠긴 레인의 안내 한 줄 — 학생이 읽는 카피라 우리말로. */
export const SELF_BOT_CHAT_LOCKED_NOTICE =
  '담은 봇과의 대화는 아직 준비 중이에요. 선생님 반의 봇과 먼저 이야기해 봐요.';

/** 잠긴 레인의 입력칸 자리 글자. */
export const SELF_BOT_CHAT_LOCKED_PLACEHOLDER = '지금은 이 봇과 이야기할 수 없어요';
