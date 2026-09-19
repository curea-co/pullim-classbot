import { classNameOf, type BotCardDto, type BotDetailDto } from '@/lib/api/classbot-dto';

/**
 * 교사가 보는 반 한 칸 — 정본 카드(`GET /classbot/bots?role=teacher` · `GET /bots/:id`)를 화면 모양으로.
 *
 * 두 문의 **탐색 키는 아직 반**이라 카드 `id` 가 반 id 다(ADR-092 open ①). 다만 **이름은 두 칸으로 갈렸다**
 * (pullim-api #679) — `name` 이 봇 이름이고 반 이름은 `className` 이다. 이 화면이 부르는 것은 **반**이므로
 * 아래 `name` 칸은 `classNameOf(card)` 로 채운다. `profile` 의 과목·학년도 이제 그 반에 붙은 봇(`bots`)에서
 * 온다(붙은 봇이 없으면 null).
 *
 * **봇은 여기서 옮기지 않는다** — `profile` 유무로 「봇 없음」을 단정하지 않는다는 원래 이유는 그대로고,
 * 봇 칩이 그리는 것은 id 가 아니라 이름·아바타라 반 상세 문이 주는 `ClassDto`(`useClassDetail`)를
 * `known-bot-chip.tsx` 가 읽는다. 여기서 옮기는 것은 과목·학년(profile 에서 — 반 자체의 `subject`·`grade` 를
 * 읽는 문이 열리면 그쪽으로)과 활성 여부뿐이다.
 *
 * 카드에 **없는 것**도 여기서 못박는다: 참여 코드(낼 때만 돌아온다 · `useIssueJoinCode`) · 명단(반 상세 「명단」 탭) ·
 * 소속(organization) · 게시(마켓) 상태(범위 밖 · 결정 ①).
 */
export interface OperatorClass {
  id: string;
  /** **반** 이름(`className`) — 봇 이름이 아니다. 목록 제목·반 상세 제목이 이 값을 부른다. */
  name: string;
  subject: string | null;
  grade: string | null;
  isActive: boolean;
}

/**
 * 정본 카드 → 화면 칸. 빈 문자열은 null 로 접는다 — 칩을 그릴지 말지를 화면이 한 조건으로 판단하게.
 * @param card - 카드 한 장(목록) 또는 상세
 * @returns 화면이 그대로 그리는 칸
 */
export function toOperatorClass(card: BotCardDto | BotDetailDto): OperatorClass {
  const profile = card.profile;
  return {
    id: card.id,
    // **`card.name` 이 아니다** — 그건 봇 이름이고, 같은 봇을 건 두 반은 그 값이 똑같다(#679).
    name: classNameOf(card),
    subject: profile?.subject ? profile.subject : null,
    grade: profile?.grade ? profile.grade : null,
    isActive: card.isActive,
  };
}
