import type { StudentBotSource } from '@/lib/store/mode-bots';

/**
 * 칸 하나가 어느 챗 레인을 타는가.
 *
 * - `sse`    — 선생님 반의 칸(`source='class'` · `ClassBotSlot`). **단위는 반이다**(완성 설계 § 6.2 · 해소 3 ·
 *   계획 PR 5a) — `slot.classId` 가 pullim-api 반 id 라 `POST/GET /classbot/classes/:classId/chat` 이 선다.
 *   같은 봇이 두 반에 걸려 있으면 칸도 둘, 기록도 둘이다.
 * - `locked` — 담은 봇(`source='self'`). 반이 없어 정본 서버에 두드릴 문이 없다(`bot.id` 는 같은 오리진
 *   `class_bots.id` 라 멤버십을 못 찾고 매 메시지에 403). 종전에는 목 레인(`pickClassbotReply`)이 이 봇들의
 *   유일한 응답 경로였고, 2026-09-16 계획 PR 4 가 그 레인을 걷었다. 담은 봇·마켓 계열은 이번 범위 밖이다
 *   (결정 ①). 그때까지 이 봇은 선택기에 그대로 보이되 **기록도 전송도 부르지 않고** composer 를 잠근다 —
 *   403 안내가 대화처럼 보이는 것보다 「준비 중」이 사실이다.
 *
 * @param source - 칸의 출처
 * @returns 레인
 */
export type ChatLane = 'sse' | 'locked';

export function chatLaneFor(source: StudentBotSource): ChatLane {
  return source === 'self' ? 'locked' : 'sse';
}

/**
 * 반 대화 상단 고지 — 완성 설계 § 6.2 「고지 문구」. 학생 화면 카피라 한자어 없이(`07-branding.md`).
 *
 * **학생이 그 화면을 보는 시점에 이미 떠 있어야 한다** — 교사 열람 문(`GET /classes/:id/chat?student=`)은
 * pullim-api PR 3 이 열지만, 고지는 그보다 늦지 않게 이 PR 이 싣는다. 반 칸에만 붙고(담은 봇은 보는
 * 선생님이 없다) 접히지 않는다.
 */
export const CLASS_CHAT_TEACHER_VISIBLE_NOTICE = '선생님이 이 대화를 볼 수 있어요';

/** 잠긴 레인의 안내 한 줄 — 학생이 읽는 카피라 우리말로. */
export const SELF_BOT_CHAT_LOCKED_NOTICE =
  '담은 봇과의 대화는 아직 준비 중이에요. 선생님 반의 봇과 먼저 이야기해 봐요.';

/** 잠긴 레인의 입력칸 자리 글자. */
export const SELF_BOT_CHAT_LOCKED_PLACEHOLDER = '지금은 이 봇과 이야기할 수 없어요';
