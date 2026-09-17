/**
 * 빌더 드래프트 ↔ 정본 `bots` 행 — 두 모양 사이의 유일한 통로(`../bot-contract.ts` · api.md § 3.5b).
 *
 * 못박는 것:
 *  - 학교 교과 이름(「통합과학」)도 빌더의 다섯 중 하나로 읽히고, 못 읽으면 **지어내지 않고 null** 이다
 *  - 옛 말투 다섯과 빌더의 셋이 같은 표를 지난다 — 모르는 말은 기본값으로 **열리기만** 한다
 *  - 만들 때 이름을 비우면 **과목 기본 이름**이 대신 간다(정본 `name` 은 필수다)
 *  - 고칠 때는 **바뀐 칸만** 실린다 — 안 건드린 말투가 다시 실리면 교사가 다른 화면에서 적은 말이 깎인다
 *  - 반 배정은 봇의 칸이 아니라 **달라진 반마다 한 번씩** 두드리는 일이다(`classDelta`)
 */

import {
  classDelta, createBodyFromDraft, customTone, draftFromBot, patchFromDraft, toSubject, toTone,
} from '../bot-contract';
import { emptyDraft, subjectMeta, toneMeta, type BotDraft } from '../builder-types';
import type { BotDto } from '@/lib/api/classbot-dto';

/** 정본 한 행 — 필요한 칸만 갈아 끼워 쓴다. */
function bot(overrides: Partial<BotDto> = {}): BotDto {
  return {
    id: 'bot_1',
    operatorId: 't1',
    name: '과학봇',
    subject: '과학',
    grade: '중2',
    tone: '또박또박',
    greeting: '안녕! 오늘은 뭘 볼까?',
    scope: 4,
    avatarEmoji: '🔬',
    quickPrompts: ['오늘 배운 것 정리해 줘'],
    isPublished: false,
    publishedAt: null,
    classIds: ['cls_1', 'cls_2'],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

/** 드래프트 — 빈 것에서 필요한 칸만 갈아 끼운다. */
function draft(overrides: Partial<BotDraft> = {}): BotDraft {
  return { ...emptyDraft, ...overrides };
}

describe('과목 좁히기', () => {
  it('이름이 그대로 겹치면 그것이다', () => {
    expect(toSubject('과학')).toBe('science');
    expect(toSubject('수학')).toBe('math');
    expect(toSubject('영어')).toBe('english');
    expect(toSubject('국어')).toBe('korean');
    expect(toSubject('사회')).toBe('social');
  });

  it('학교 교과 이름은 품고 있는 것으로 읽는다 — 「통합과학」은 과학이다', () => {
    expect(toSubject('통합과학')).toBe('science');
    expect(toSubject('중등 수학 2')).toBe('math');
  });

  it('모르는 과목은 지어내지 않고 null 이다 — 수정 화면이 「과목을 골라야 해요」로 막는다', () => {
    expect(toSubject('음악')).toBeNull();
    expect(toSubject('')).toBeNull();
    expect(toSubject(null)).toBeNull();
  });
});

describe('말투 좁히기', () => {
  it('빌더가 적는 말 셋을 그대로 읽는다', () => {
    expect(toTone(toneMeta.polite.label)).toBe('polite');
    expect(toTone(toneMeta.friendly.label)).toBe('friendly');
    expect(toTone(toneMeta.firm.label)).toBe('firm');
  });

  it('반 상세·옛 카탈로그가 쓰던 다섯도 셋으로 접힌다', () => {
    expect(toTone('정중')).toBe('polite');
    expect(toTone('차분')).toBe('polite');
    expect(toTone('친근')).toBe('friendly');
    expect(toTone('열정')).toBe('friendly');
    expect(toTone('스파르타')).toBe('firm');
  });

  it('모르는 말은 기본값으로 연다 — 그리고 그 값은 저장되지 않는다(아래 「바뀐 칸만」)', () => {
    expect(toTone('차분하고 다정하게')).toBe(emptyDraft.tone);
    expect(toTone(null)).toBe(emptyDraft.tone);
  });

  it('셋 밖의 말은 원문을 따로 꺼낸다 — 화면이 「이게 지금 말투다」라고 말할 수 있게', () => {
    expect(customTone('차분하고 다정하게')).toBe('차분하고 다정하게');
  });

  it('셋 안의 말이면 꺼낼 원문이 없다 — 마당의 칩이 이미 그 말이다', () => {
    expect(customTone(toneMeta.polite.label)).toBeNull();
    expect(customTone('스파르타')).toBeNull();
    expect(customTone(null)).toBeNull();
    expect(customTone('')).toBeNull();
  });

  it('객체가 기본으로 들고 있는 이름을 말투로 착각하지 않는다', () => {
    // `tone in TONE_OF` 로 쓰면 'toString' 이 「아는 말」로 통과해 원문이 사라진다
    expect(customTone('toString')).toBe('toString');
    expect(customTone('constructor')).toBe('constructor');
  });
});

describe('정본 한 행 → 첫 값', () => {
  it('정본이 든 것은 그대로 실린다 — 반은 `classIds` 가 준다', () => {
    const d = draftFromBot(bot());

    expect(d.subject).toBe('science');
    expect(d.grade).toBe('중2');
    expect(d.name).toBe('과학봇');
    expect(d.tone).toBe('polite');
    expect(d.scope).toBe(4);
    expect(d.classes).toEqual(['cls_1', 'cls_2']);
  });

  it('정본에 칸이 없는 셋은 기본값 그대로 — 없는 값을 지어내지 않는다', () => {
    const d = draftFromBot(bot());

    expect(d.files).toEqual([]);
    expect(d.style).toBe(emptyDraft.style);
    expect(d.wrong).toBe(emptyDraft.wrong);
  });

  it('고를 수 없는 학년·범위 밖 등급은 기본값으로 연다 — 아무것도 안 눌린 채로 열리지 않게', () => {
    const d = draftFromBot(bot({ grade: '대1', scope: 9 }));

    expect(d.grade).toBe(emptyDraft.grade);
    expect(d.scope).toBe(emptyDraft.scope);
  });

  it('반이 하나도 없는 봇도 유효하다 — 어느 반에도 안 붙은 봇은 정상이다', () => {
    expect(draftFromBot(bot({ classIds: [] })).classes).toEqual([]);
  });
});

describe('만들기 본문', () => {
  it('이름을 비우면 과목 기본 이름이 대신 간다 — 정본 `name` 은 필수다', () => {
    const body = createBodyFromDraft(draft({ subject: 'math', name: '' }));

    expect(body.name).toBe(subjectMeta.math.botName);
    expect(body.subject).toBe('수학');
  });

  it('적은 이름은 그대로 간다', () => {
    expect(createBodyFromDraft(draft({ subject: 'math', name: '별별봇' })).name).toBe('별별봇');
  });

  it('말투는 빌더가 적는 말로, 답 범위는 고른 숫자 그대로 간다', () => {
    const body = createBodyFromDraft(draft({ subject: 'korean', tone: 'firm', scope: 5 }));

    expect(body.tone).toBe(toneMeta.firm.label);
    expect(body.scope).toBe(5);
  });

  it('비어 있는 칸은 아예 싣지 않는다 — 빌더가 묻지 않는 칸도 마찬가지다', () => {
    const body = createBodyFromDraft(draft({ subject: null, grade: '' }));

    expect('subject' in body).toBe(false);
    expect('grade' in body).toBe(false);
    // 인사말·아바타·빠른 프롬프트는 빌더가 묻지 않는다 — 서버가 null 로 둔다
    expect('greeting' in body).toBe(false);
    expect('avatarEmoji' in body).toBe(false);
    expect('quickPrompts' in body).toBe(false);
  });

  it('화면에만 사는 셋은 본문에 없다 — 정본에 칸이 없다', () => {
    const body = createBodyFromDraft(draft({ subject: 'science', style: 'ask', wrong: 'tell' }));

    expect(Object.keys(body).sort()).toEqual(['grade', 'name', 'scope', 'subject', 'tone']);
  });
});

describe('바뀐 칸만 — 부분 수정 본문', () => {
  const initial = draftFromBot(bot());

  it('아무것도 안 건드리면 빈 본문이다 — 화면이 이걸 보고 서버를 두드리지 않는다', () => {
    expect(patchFromDraft(initial, { ...initial })).toEqual({});
  });

  it('바꾼 칸 하나만 실린다 — 안 건드린 말투는 실리지 않는다', () => {
    const patch = patchFromDraft(initial, { ...initial, grade: '고1' });

    expect(patch).toEqual({ grade: '고1' });
    expect('tone' in patch).toBe(false);
  });

  it('말투를 실제로 바꾸면 그때 실린다', () => {
    expect(patchFromDraft(initial, { ...initial, tone: 'firm' })).toEqual({ tone: toneMeta.firm.label });
  });

  it('과목을 비우면 `null` 로 간다 — 「그대로」(`undefined`)와 「비움」(`null`)은 다른 뜻이다', () => {
    expect(patchFromDraft(initial, { ...initial, subject: null })).toEqual({ subject: null });
  });

  it('이름은 화면이 보여주던 이름으로 견준다 — 비운 칸에 기본 이름을 적어도 바뀐 것이 아니다', () => {
    const blank = draftFromBot(bot({ name: subjectMeta.science.botName }));

    expect(patchFromDraft(blank, { ...blank, name: '' })).toEqual({});
    expect(patchFromDraft(blank, { ...blank, name: '별별봇' })).toEqual({ name: '별별봇' });
  });

  it('화면에만 사는 셋을 바꿔도 보낼 것이 없다 — 정본에 칸이 없다', () => {
    const next = { ...initial, style: 'ask' as const, wrong: 'tell' as const, files: [{ name: 'a.pdf', size: '1MB' }] };

    expect(patchFromDraft(initial, next)).toEqual({});
  });

  it('여러 칸을 바꾸면 그것들만 함께 실린다', () => {
    const patch = patchFromDraft(initial, { ...initial, name: '별별봇', scope: 2 });

    expect(patch).toEqual({ name: '별별봇', scope: 2 });
  });
});

describe('반 배정이 달라진 만큼만', () => {
  it('붙일 반과 뗄 반을 가른다 — 문이 반마다 따로라 그만큼 두드린다', () => {
    expect(classDelta(['a', 'b'], ['b', 'c'])).toEqual({ attach: ['c'], detach: ['a'] });
  });

  it('그대로면 두드릴 것이 없다', () => {
    expect(classDelta(['a', 'b'], ['a', 'b'])).toEqual({ attach: [], detach: [] });
  });

  it('처음 붙이는 것과 전부 떼는 것도 같은 표로 읽는다', () => {
    expect(classDelta([], ['a'])).toEqual({ attach: ['a'], detach: [] });
    expect(classDelta(['a'], [])).toEqual({ attach: [], detach: ['a'] });
  });
});
