import type { StudentBotSource } from '@/lib/store/mode-bots';

/**
 * 칸 하나가 어느 챗 레인을 타는가.
 *
 * 일반 반과 ADR-094 자습방 모두 카드의 `classId`로 기존
 * `POST/GET /classbot/classes/:classId/chat` SSE 경로를 쓴다.
 *
 * @param source - 칸의 출처
 * @returns 레인
 */
export type ChatLane = 'sse';

export function chatLaneFor(source: StudentBotSource): ChatLane {
  void source;
  return 'sse';
}

/**
 * 반 대화 상단 고지 — 완성 설계 § 6.2 「고지 문구」. 학생 화면 카피라 한자어 없이(`07-branding.md`).
 *
 * **학생이 그 화면을 보는 시점에 이미 떠 있어야 한다** — 교사 열람 문(`GET /classes/:id/chat?student=`)은
 * pullim-api PR 3 이 열지만, 고지는 그보다 늦지 않게 이 PR 이 싣는다. 반 칸에만 붙고(담은 봇은 보는
 * 선생님이 없다) 접히지 않는다.
 */
export const CLASS_CHAT_TEACHER_VISIBLE_NOTICE = '선생님이 이 대화를 볼 수 있어요';
