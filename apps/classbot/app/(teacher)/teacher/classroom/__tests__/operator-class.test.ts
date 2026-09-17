/**
 * 정본 카드 → 화면 칸(`operator-class.ts`). 못박는 것은 둘 — 과목·학년은 옛 profile 에서 오고 빈 문자열은 null 로 접혀
 * 화면이 한 조건으로 칩을 결정한다 · **봇은 여기서 옮기지 않는다**(profile 유무로 「봇 없음」을 단정하면 `POST /classes`
 * 로 만든 반이 봇을 붙인 뒤에도 늘 「봇 없음」이다 — 봇 칩은 `known-bot-chip.tsx`).
 */
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { toOperatorClass } from '../operator-class';

const base: BotCardDto = { id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher', profile: null };

it('프로필이 없으면 과목·학년을 모른다 — 둘 다 null · 봇 칸은 아예 없다', () => {
  expect(toOperatorClass(base)).toEqual({
    id: 'cls_1', name: '고2 미적분 A반', subject: null, grade: null, isActive: true,
  });
});

it('프로필이 있으면 과목·학년을 옮긴다 — 봇 이름·아바타는 옮기지 않는다', () => {
  const card: BotCardDto = {
    ...base,
    profile: {
      subject: '수학Ⅱ', grade: '고2', tone: '친근', greeting: '', scope: 3, avatarEmoji: '📐',
      quickPrompts: [], enrolledCount: 0, isLive: false, currentLesson: null,
    },
  };
  expect(toOperatorClass(card)).toEqual({ id: 'cls_1', name: '고2 미적분 A반', subject: '수학Ⅱ', grade: '고2', isActive: true });
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
  expect(toOperatorClass(card)).toMatchObject({ subject: null, grade: null, isActive: false });
});
