/**
 * 봇을 만들고 붙이고 떼고 고치다 실패했을 때 교사가 읽는 한 줄 — **네 화면이 같은 표를 읽는다.**
 *
 * 반 상세 「봇」 탭(`app/(teacher)/teacher/classroom/[id]/class-bot-tab.tsx`) · 봇 관리 상세
 * (`app/(teacher)/teacher/bots/[botId]/*`) · 빌더의 만들기와 수정(`app/(teacher)/teacher/builder/*`)이
 * **같은 문 넷**(`POST /bots` · `PUT /classes/:classId/bot` · `PATCH /bots/:id`)을 두드린다. 문구가 화면마다
 * 갈리면 같은 실패를 교사가 두 말로 듣는다 — 그래서 표를 여기 한 벌만 둔다(계획 PR 5d 가 「봇」 탭에서 옮겼다).
 *
 * 서버가 가른 뜻을 뭉개지 않는 것이 이 표의 일이다(`authz.md § 1.5 (A′)`): 남의 반은 **403**, 남의 봇은 **404**
 * 이고 교사가 다음에 할 일이 다르다. 상태 코드를 하나로 합쳐 「실패했어요」로 적지 마라.
 */

import { BotAttachError } from '@/hooks/api/bot';
import { statusOf } from '@/lib/api/classbot-client';

/** 봇을 둘러싼 문 넷 — 실패 문구가 갈린다. */
export type BotAction = 'create' | 'attach' | 'detach' | 'update';

/**
 * 실패 → 교사가 읽는 한 줄.
 *  - 「만들어 붙이기」가 **붙이는 쪽에서** 실패하면(`BotAttachError`) 봇은 이미 내 것으로 생겼다 — 그 사실을 말한다.
 *    그 말을 빼면 교사가 폼을 다시 보내 같은 봇을 하나 더 만든다.
 * @param error - 훅이 던진 오류
 * @param action - 어느 문이었나
 * @returns 폼 아래·토스트 한 줄
 */
export function botFailureMessage(error: unknown, action: BotAction): string {
  if (error instanceof BotAttachError) {
    return `「${error.bot.name}」 봇은 만들어졌는데 이 반에 붙이지 못했어요 — ${botFailureMessage(error.cause, 'attach')}`;
  }
  switch (statusOf(error)) {
    case 400:
      return '입력을 다시 확인해 주세요. 이름은 100자까지, 등급은 1~5예요.';
    case 401:
      return '로그인이 필요해요.';
    case 403:
      return action === 'create' || action === 'update'
        ? '선생님 계정만 봇을 만들거나 고칠 수 있어요.'
        : '이 반의 운영 교사만 봇을 붙이거나 뗄 수 있어요.';
    case 404:
      return action === 'update'
        ? '고치려던 봇을 찾을 수 없어요. 내 봇이어야 해요.'
        : action === 'attach'
          ? '붙이려던 봇을 찾을 수 없어요. 내 봇이어야 해요.'
          : '반을 찾을 수 없어요.';
    default:
      return action === 'detach'
        ? '봇을 떼지 못했어요. 잠시 후 다시 시도해 주세요.'
        : action === 'update'
          ? '봇을 고치지 못했어요. 잠시 후 다시 시도해 주세요.'
          : action === 'attach'
            ? '봇을 붙이지 못했어요. 잠시 후 다시 시도해 주세요.'
            : '봇을 만들지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
