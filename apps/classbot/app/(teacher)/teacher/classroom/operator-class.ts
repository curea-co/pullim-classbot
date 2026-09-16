import type { BotCardDto, BotDetailDto } from '@/lib/api/classbot-dto';

/**
 * 교사가 보는 반 한 칸 — 정본 카드(`GET /classbot/bots?role=teacher` · `GET /bots/:id`)를 화면 모양으로.
 *
 * bot == class(ADR-063)라 카드 `id` 가 반 id 이자 봇 id 고, `name` 은 반 이름이다. **봇 이름은 따로 오지 않는다** —
 * 봇 성격(`profile`)에는 과목·학년·아바타·말투가 있지만 이름 칸이 없어, 지금 봇의 표시 이름은 반 이름과 같다.
 * `bots` 표가 서는 날(pullim-api PR 1 · 완성 설계 § 4) 이 어댑터의 `botName` 이 먼저 갈린다 — 화면은 이 칸만 읽는다.
 *
 * 카드에 **없는 것**도 여기서 못박는다: 참여 코드(낼 때만 돌아온다 · `useIssueJoinCode`) · 참여 인원의 명단
 * (`GET /classes/:id/members` 는 PR 2) · 소속(organization). 같은 오리진 `TeacherClassroomItem` 이 들고 있던
 * 게시(마켓) 상태도 없다 — 마켓 계열은 범위 밖이다(결정 ①).
 */
export interface OperatorClass {
  id: string;
  /** 반 이름. */
  name: string;
  subject: string | null;
  grade: string | null;
  /** 봇 이름 — `profile` 이 있으면 반 이름과 같다(머리주석). 봇 프로필이 아직 없으면 null. */
  botName: string | null;
  botAvatar: string | null;
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
    botName: profile ? card.name : null,
    botAvatar: profile?.avatarEmoji ? profile.avatarEmoji : null,
    isActive: card.isActive,
  };
}
