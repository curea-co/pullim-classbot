/**
 * 빌더 드래프트 ↔ 정본 `bots` 행 — 두 모양 사이의 유일한 통로(계획 PR 5d · api.md § 3.5b).
 *
 * 빌더는 아홉 칸을 묻고(`BotDraft`) 정본은 여덟 칸을 든다(`BotDto`). 겹치는 것은 **다섯**이고,
 * 나머지는 양쪽 어디에도 짝이 없다. 그 셋을 여기서 한 번에 적어 둔다 — 화면마다 다시 판단하면
 * 「보냈다고 생각했는데 안 갔다」가 생긴다.
 *
 * | 드래프트 | 정본 | 메모 |
 * |---|---|---|
 * | `subject` (`SubjectId`) | `subject` (string) | `subjectMeta[id].label` 로 적고, 읽을 땐 `toSubject` 로 좁힌다 |
 * | `grade` | `grade` | 정본은 자유 문자열, 빌더는 여섯 중 하나 — 밖의 값은 기본값으로 연다 |
 * | `name` | `name` | 비우면 과목 기본 이름(`botName`)이 대신 간다 — 정본 `name` 은 필수라 빈 채로 못 보낸다 |
 * | `tone` (셋) | `tone` (string) | **되돌릴 수 없는 좁힘** — 아래 ⚠ |
 * | `scope` | `scope` (number) | 그대로. 1~5 밖의 값은 `isScopeLevel` 이 막는다 |
 * | `files` · `style` · `wrong` | — | **정본에 칸이 없다.** 이 화면 안에서만 산다 |
 * | `classes` | — | 봇의 칸이 아니라 반의 칸(`classes.bot_id`)이다 — `PUT /classes/:classId/bot` |
 * | — | `greeting` · `avatarEmoji` · `quickPrompts` | 빌더가 묻지 않는다. **건드리지 않는다**(`undefined`) |
 *
 * ⚠ **`tone` 을 매번 보내지 않는 이유.** 정본 `tone` 은 자유 문자열이라 반 상세 「봇」 탭에서 「차분하고
 * 다정하게」 같은 말을 적을 수 있는데, 빌더는 셋 중 하나로만 묻는다. 그런 봇을 빌더로 열면 가장 가까운 셋 중
 * 하나로 보이고, 그 상태로 저장하면 교사가 적은 말이 **말없이 사라진다.** 그래서 수정은 `patchFromDraft` 가
 * **바뀐 칸만** 싣는다(`UpdateBotBody` 의 `undefined` = 그대로) — 교사가 말투를 실제로 건드리지 않으면
 * 원문이 남는다. 같은 이유로 빌더가 묻지 않는 인사말·아바타·빠른 프롬프트도 영영 `undefined` 다.
 */

import {
  emptyDraft,
  grades,
  subjectIds,
  subjectMeta,
  toneMeta,
  type BotDraft,
  type SubjectId,
  type ToneId,
} from '@/components/builder/builder-types';
import { botName } from '@/components/builder/builder-types';
import type { BotDto, CreateBotBody, UpdateBotBody } from '@/lib/api/classbot-dto';
import { isScopeLevel } from '@/lib/mock/tutor';

/**
 * 정본의 과목 이름 → 빌더 과목 id.
 *
 * 학교 교과 이름은 빌더의 다섯보다 잘다 — 과학봇의 과목이 「통합과학」인 식이다. 이름이 그대로 겹치는 것을
 * 먼저 보고, 없으면 품고 있는 것을 찾는다. 둘 다 아니면 `null` 이라 수정 화면이 「과목을 골라야 해요」로 막는다 —
 * 모르는 과목을 아무거나로 채우는 것보다 낫다.
 * @param subject - 정본 `bots.subject`(빈 값 허용)
 * @returns 좁힌 과목 id · 못 좁히면 null
 */
export function toSubject(subject: string | null): SubjectId | null {
  if (!subject) return null;
  const exact = subjectIds.find((id) => subjectMeta[id].label === subject);
  if (exact) return exact;
  return subjectIds.find((id) => subject.includes(subjectMeta[id].label)) ?? null;
}

/**
 * 정본의 말투 문자열 → 빌더의 셋.
 *
 * 빌더가 적는 말(`toneMeta[*].label`)을 먼저 보고, 그다음 반 상세 「봇」 탭·옛 카탈로그가 쓰던 다섯을 본다.
 * 어느 쪽도 아니면 기본값으로 연다 — **그리고 그 값은 저장되지 않는다**(머리주석 ⚠ · `patchFromDraft`).
 */
const TONE_OF: Record<string, ToneId> = {
  [toneMeta.polite.label]: 'polite',
  [toneMeta.friendly.label]: 'friendly',
  [toneMeta.firm.label]: 'firm',
  정중: 'polite',
  차분: 'polite',
  친근: 'friendly',
  열정: 'friendly',
  스파르타: 'firm',
};

/**
 * @param tone - 정본 `bots.tone`
 * @returns 좁힌 말투 · 모르는 말이면 기본값
 */
export function toTone(tone: string | null): ToneId {
  return (tone && TONE_OF[tone]) || emptyDraft.tone;
}

/**
 * 정본 말투가 빌더의 셋에 **없는 말**이면 그 말 그대로 — 셋 중 하나면 `null`.
 *
 * `toTone` 은 모르는 말을 기본값으로 접는다. 저장은 그래도 안전하지만(`patchFromDraft` 가 안 건드린 말투를
 * 안 싣는다) **화면은 거짓말을 한다** — 「차분하고 다정하게」로 적어 둔 봇을 빌더로 열면 「친근하게」가 눌린 채로
 * 보이고, 교사는 자기가 적은 말이 사라진 줄 안다. 그래서 접기 전의 **원문**을 따로 꺼내 화면이 말할 수 있게 한다.
 * 드래프트에는 담지 않는다 — `BotDraft.tone` 은 셋 중 하나만 담는 자리라 담을 칸이 없다.
 * @param tone - 정본 `bots.tone`
 * @returns 셋 밖의 원문 · 셋 중 하나거나 비었으면 null
 */
export function customTone(tone: string | null): string | null {
  if (!tone) return null;
  return Object.hasOwn(TONE_OF, tone) ? null : tone;
}

/** 고를 수 있는 학년 밖의 값이면 기본값으로 — 아무 칩도 안 눌린 채로 열리지 않게 한다. */
function toGrade(grade: string | null): string {
  return grade && (grades as readonly string[]).includes(grade) ? grade : emptyDraft.grade;
}

/**
 * 정본 봇 한 행 → 빌더 드래프트(수정 화면의 첫 값).
 *
 * `files`·`style`·`wrong` 은 정본에 칸이 없어 기본값으로 남는다 — 없는 값을 지어내지 않는다(머리주석 표).
 * `classes` 는 정본이 준다(`BotDto.classIds` = `classes.bot_id` 가 이 봇을 가리키는 반).
 * @param bot - `GET /classbot/me/bots` 한 행
 * @returns 빌더가 그대로 여는 드래프트
 */
export function draftFromBot(bot: BotDto): BotDraft {
  return {
    ...emptyDraft,
    subject: toSubject(bot.subject),
    grade: toGrade(bot.grade),
    name: bot.name,
    tone: toTone(bot.tone),
    scope: isScopeLevel(bot.scope) ? bot.scope : emptyDraft.scope,
    classes: [...bot.classIds],
  };
}

/**
 * 빌더 드래프트 → `POST /classbot/bots` 본문.
 *
 * `name` 은 정본에서 필수다 — 비워 뒀으면 화면이 보여 주던 과목 기본 이름(`botName`)을 그대로 보낸다.
 * 화면에 「수학봇」이라 쓰여 있는데 서버에 빈 이름이 가면 안 된다. 빌더가 묻지 않는 칸은 **싣지 않는다**
 * (서버가 null 로 둔다) — 인사말·아바타·빠른 프롬프트.
 * @param draft - 다 채운 드래프트(`firstFault` 를 통과한 것)
 * @returns 만들기 본문
 */
export function createBodyFromDraft(draft: BotDraft): CreateBotBody {
  return {
    name: botName(draft),
    scope: draft.scope,
    tone: toneMeta[draft.tone].label,
    ...(draft.subject ? { subject: subjectMeta[draft.subject].label } : {}),
    ...(draft.grade ? { grade: draft.grade } : {}),
  };
}

/**
 * 첫 값과 지금 값을 견줘 **바뀐 칸만** 싣는다 — `PATCH /classbot/bots/:id`(`undefined` = 그대로).
 *
 * 왜 전부 안 보내나: 머리주석 ⚠. 정본이 든 말투·인사말·아바타·빠른 프롬프트 중 빌더가 표현하지 못하는 것이
 * 있고, 안 건드린 칸을 매번 다시 적으면 그것들이 빌더가 아는 모양으로 깎인다.
 * @param initial - 화면을 열 때의 드래프트(`draftFromBot` 결과)
 * @param next - 지금 화면의 드래프트
 * @returns 보낼 칸만 담은 부분 수정 본문(빈 객체면 바뀐 것이 없다)
 */
export function patchFromDraft(initial: BotDraft, next: BotDraft): UpdateBotBody {
  const patch: UpdateBotBody = {};
  if (botName(initial) !== botName(next)) patch.name = botName(next);
  if (initial.subject !== next.subject) {
    patch.subject = next.subject ? subjectMeta[next.subject].label : null;
  }
  if (initial.grade !== next.grade) patch.grade = next.grade;
  if (initial.tone !== next.tone) patch.tone = toneMeta[next.tone].label;
  if (initial.scope !== next.scope) patch.scope = next.scope;
  return patch;
}

/**
 * 반 배정이 어떻게 달라졌나 — 붙일 반과 뗄 반.
 *
 * 봇 쪽에는 반 목록을 통째로 바꾸는 문이 없다. 있는 것은 **반 하나에 봇 하나를 놓는 문**
 * (`PUT /classes/:classId/bot`)뿐이라, 달라진 반마다 한 번씩 두드린다. 뗄 때 보내는 것은 `{ botId: null }` 이다 —
 * 그 반이 봇을 잃는 것이지 이 봇이 지워지는 것이 아니다.
 * @param before - 열 때 붙어 있던 반 id 들
 * @param after - 교사가 고른 반 id 들
 * @returns `{ attach, detach }` — 각각 반 id 목록
 */
export function classDelta(
  before: readonly string[],
  after: readonly string[],
): { attach: string[]; detach: string[] } {
  return {
    attach: after.filter((id) => !before.includes(id)),
    detach: before.filter((id) => !after.includes(id)),
  };
}
