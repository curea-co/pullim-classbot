/**
 * 정본 카드 → 화면 칸(`operator-class.ts`). 못박는 것은 둘 — 봇 이름은 프로필이 있을 때 반 이름과 같고(bot == class),
 * 빈 문자열은 null 로 접혀 화면이 한 조건으로 칩을 결정한다.
 */
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { toOperatorClass } from '../operator-class';

const base: BotCardDto = { id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher', profile: null };

it('프로필이 없으면 봇도 과목도 모른다 — 전부 null', () => {
  expect(toOperatorClass(base)).toEqual({
    id: 'cls_1', name: '고2 미적분 A반', subject: null, grade: null, botName: null, botAvatar: null, isActive: true,
  });
});

it('프로필이 있으면 과목·학년·아바타를 옮기고 봇 이름은 반 이름이다', () => {
  const card: BotCardDto = {
    ...base,
    profile: {
      subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '📐',
      quickPrompts: [], enrolledCount: 0, isLive: false, currentLesson: null,
    },
  };
  expect(toOperatorClass(card)).toMatchObject({ subject: '수학Ⅱ', grade: '고2', botName: '고2 미적분 A반', botAvatar: '📐' });
});

it('빈 문자열은 null 로 접는다 — 빈 칩을 그리지 않게', () => {
  const card: BotCardDto = {
    ...base,
    isActive: false,
    profile: {
      subject: '', grade: '', tone: '', greeting: '', scope: 3, avatarEmoji: '',
      quickPrompts: [], enrolledCount: 0, isLive: false, currentLesson: null,
    },
  };
  expect(toOperatorClass(card)).toMatchObject({ subject: null, grade: null, botAvatar: null, botName: '고2 미적분 A반', isActive: false });
});
