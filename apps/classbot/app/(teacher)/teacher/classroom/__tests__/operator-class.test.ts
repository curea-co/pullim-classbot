/**
 * 정본 카드 → 화면 칸(`operator-class.ts`). 못박는 것은 셋 —
 * **`name` 칸은 반 이름(`className`)이다**(pullim-api #679 로 카드의 `name` 이 봇 이름이 됐다) ·
 * 과목·학년은 profile 에서 오고 빈 문자열은 null 로 접혀 화면이 한 조건으로 칩을 결정한다 ·
 * **봇은 여기서 옮기지 않는다**(profile 유무로 「봇 없음」을 단정하면 `POST /classes` 로 만든 반이 봇을
 * 붙인 뒤에도 늘 「봇 없음」이다 — 봇 칩은 `known-bot-chip.tsx`).
 */
import type { BotCardDto } from '@/lib/api/classbot-dto';
import { toOperatorClass } from '../operator-class';

/** `name`(봇 이름)과 `className`(반 이름)에 **다른 글자** — 같으면 어느 칸을 읽든 통과한다. */
const base: BotCardDto = {
  id: 'cls_1', botId: 'bot_1', name: '미적분 도우미', className: '고2 미적분 A반',
  description: null, isActive: true, role: 'teacher', profile: null,
};

it('프로필이 없으면 과목·학년을 모른다 — 둘 다 null · 봇 칸은 아예 없다', () => {
  expect(toOperatorClass(base)).toEqual({
    id: 'cls_1', name: '고2 미적분 A반', subject: null, grade: null, isActive: true,
  });
});

it('`name` 칸은 반 이름이다 — 봇 이름이 목록·상세 제목을 덮지 않는다', () => {
  expect(toOperatorClass(base).name).toBe('고2 미적분 A반');
  expect(toOperatorClass(base).name).not.toBe('미적분 도우미');
});

it('같은 봇을 건 두 반은 이름으로만 갈린다 — id 만 다른 카드 둘을 세워 본다', () => {
  const a = toOperatorClass({ ...base, id: 'cls_1', className: '중2 수학 A반' });
  const b = toOperatorClass({ ...base, id: 'cls_2', className: '중2 수학 B반' });
  expect(a.name).not.toBe(b.name);
});

it('`className` 이 없는 옛 응답(#679 배포 전)은 `name` 으로 떨어진다 — 제목이 비지 않는다', () => {
  const legacy: BotCardDto = { id: 'cls_9', name: '중3 국어 B반', description: null, isActive: true, role: 'teacher', profile: null };
  expect(toOperatorClass(legacy).name).toBe('중3 국어 B반');
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
