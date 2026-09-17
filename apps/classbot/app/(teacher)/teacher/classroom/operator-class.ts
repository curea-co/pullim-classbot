import type { BotCardDto, BotDetailDto } from '@/lib/api/classbot-dto';

/**
 * 교사가 보는 반 한 칸 — 정본 카드(`GET /classbot/bots?role=teacher` · `GET /bots/:id`)를 화면 모양으로.
 *
 * 이 두 문은 아직 bot == class(ADR-063)다 — 카드 `id` 가 반 id 고 `name` 은 반 이름, `profile` 은 옛 `class_bot_profiles`
 * (과목·학년·아바타·말투 · 생성 전 null)다. **봇은 여기서 옮기지 않는다** — 반이 지금 가리키는 봇(`classes.bot_id`)은
 * 이 문에 실리지 않고, `profile` 유무로 「봇 없음」을 단정하면 `POST /classes` 로 만든 반(profile 행이 영영 없다)이 봇을
 * 붙인 뒤에도 늘 「봇 없음」이 된다. 봇 칩은 반 상세 문이 주는 `ClassDto`(`useClassDetail`)로 `known-bot-chip.tsx` 가
 * 그린다. 여기서 옮기는 것은 과목·학년(profile 에서 — 반 자체의 `subject`·`grade` 를 읽는 문이 열리면 그쪽으로)과
 * 활성 여부뿐이다.
 *
 * 카드에 **없는 것**도 여기서 못박는다: 참여 코드(낼 때만 돌아온다 · `useIssueJoinCode`) · 명단(반 상세 「명단」 탭) ·
 * 소속(organization) · 게시(마켓) 상태(범위 밖 · 결정 ①).
 */
export interface OperatorClass {
  id: string;
  /** 반 이름. */
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
    name: card.name,
    subject: profile?.subject ? profile.subject : null,
    grade: profile?.grade ? profile.grade : null,
    isActive: card.isActive,
  };
}
