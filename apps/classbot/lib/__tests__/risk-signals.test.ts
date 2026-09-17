/**
 * 위험 신호 어댑터 — 정본 DTO(`signals[]`·`summary[]`·교사 열람 메시지)가 화면 모양으로 어떻게 옮겨지는지 못박는다.
 * 판정은 서버 몫이라 여기서는 **읽는 말·순서·파생값**만 본다: 우리말 라벨 · 세기 4 선 · 학습 문맥 강등 표시 ·
 * 종류 순서 고정 · 명단 ∪ 집계 줄과 그 순서 · 확인의 낙관적 갱신이 멱등한 것.
 */

import type { ClassMemberDto, ClassSignalsDto, MemberMessageDto, RiskSignalDto } from '@/lib/api/classbot-dto';
import {
  ackSignalInView,
  buildMonitorRows,
  crisisCategoryLabel,
  groupMarksByMessage,
  memberLabel,
  relativeTimeLabel,
  riskKindLabel,
  toSignalBadge,
  toSignalMark,
  toTranscriptRow,
} from '../risk-signals';

function signal(over: Partial<RiskSignalDto> = {}): RiskSignalDto {
  return {
    id: 'sig_1', studentId: 's_1', kind: 'answer_seeking', severity: 2, messageId: 'msg_1',
    detail: { rule: 'answer_seeking', pattern: 0 }, createdAt: '2026-09-17T01:00:00.000Z', ackedBy: null, ackedAt: null,
    ...over,
  };
}

function member(over: Partial<ClassMemberDto> = {}): ClassMemberDto {
  return {
    membershipId: 'mem_1', memberId: 's_1', displayName: '김학생', enrolledAt: '2026-09-01T00:00:00.000Z',
    isActive: true, lastActiveAt: '2026-09-17T00:50:00.000Z', ...over,
  };
}

describe('종류 라벨 — 우리말, 모르는 값은 그대로', () => {
  it.each([
    ['answer_seeking', '답 구하기'],
    ['inappropriate', '부적절한 말'],
    ['crisis_keyword', '위기 신호'],
    ['repeat_bypass', '반복 시도'],
    ['nonsense', '무의미 입력'],
    ['idle', '오래 조용함'],
  ])('%s → %s', (kind, label) => {
    expect(riskKindLabel(kind)).toBe(label);
  });

  it('서버가 종류를 늘리면 값을 숨기지 않고 그대로 보인다', () => {
    expect(riskKindLabel('off_topic')).toBe('off_topic');
  });
});

describe('toSignalBadge — summary 한 행', () => {
  it('종류 순서를 고정하고 0건은 빼며 세기 4 이상만 high 다', () => {
    const badge = toSignalBadge({
      studentId: 's_1',
      counts: { nonsense: 3, crisis_keyword: 1, answer_seeking: 2, repeat_bypass: 0, zzz_unknown: 1 },
      maxSeverity: 4, lastAt: '2026-09-17T01:00:00.000Z', unacked: 2,
    });
    expect(badge.kinds.map((k) => k.kind)).toEqual(['answer_seeking', 'crisis_keyword', 'nonsense', 'zzz_unknown']);
    expect(badge.kinds.map((k) => k.label)).toEqual(['답 구하기', '위기 신호', '무의미 입력', 'zzz_unknown']);
    expect(badge.total).toBe(7);
    expect(badge.high).toBe(true);
    expect(badge.unacked).toBe(2);
  });

  it('세기 3 은 high 가 아니다 — 빨강은 4 부터', () => {
    expect(toSignalBadge({ studentId: 's', counts: { inappropriate: 1 }, maxSeverity: 3, lastAt: '2026-09-17T00:00:00.000Z', unacked: 1 }).high).toBe(false);
  });
});

describe('toSignalMark — signals 한 건', () => {
  it('라벨·세기·확인 여부를 옮기고 학습 문맥 강등과 위기 갈래·단계를 읽는다', () => {
    const mark = toSignalMark(signal({
      kind: 'crisis_keyword', severity: 2,
      detail: { rule: 'crisis_keyword', category: 'suicide_self_harm', tier: 3, context: 'academic', downgradedFrom: 4 },
    }));
    expect(mark.label).toBe('위기 신호');
    expect(mark.high).toBe(false);
    expect(mark.academic).toBe(true);
    expect(mark.downgradedFrom).toBe(4);
    expect(mark.category).toBe('suicide_self_harm');
    expect(mark.categoryLabel).toBe('자살·자해');
    expect(mark.tier).toBe(3);
    expect(mark.acked).toBe(false);
  });

  it.each([
    ['depression', '우울·무기력'],
    ['school_violence', '학교폭력'],
    ['something_new', 'something_new'],
  ])('위기 갈래 %s → %s (모르는 값은 그대로)', (category, label) => {
    expect(crisisCategoryLabel(category)).toBe(label);
    expect(toSignalMark(signal({ kind: 'crisis_keyword', severity: 3, detail: { rule: 'crisis_keyword', category, tier: 1 } })).categoryLabel).toBe(label);
  });

  it('확인된 신호는 acked, 세기 5 는 high · 위기가 아니면 갈래·단계는 null', () => {
    const mark = toSignalMark(signal({ severity: 5, ackedBy: 't_1', ackedAt: '2026-09-17T02:00:00.000Z' }));
    expect(mark.acked).toBe(true);
    expect(mark.high).toBe(true);
    expect(mark.academic).toBe(false);
    expect(mark.downgradedFrom).toBeNull();
    expect(mark.category).toBeNull();
    expect(mark.categoryLabel).toBeNull();
    expect(mark.tier).toBeNull();
  });

  it('원문 자리로 묶는다 — messageId 없는 신호는 묶음에서 빠진다', () => {
    const marks = [
      toSignalMark(signal({ id: 'a', messageId: 'msg_1' })),
      toSignalMark(signal({ id: 'b', messageId: 'msg_1', kind: 'repeat_bypass' })),
      toSignalMark(signal({ id: 'c', messageId: null })),
    ];
    const grouped = groupMarksByMessage(marks);
    expect(grouped.get('msg_1')?.map((m) => m.id)).toEqual(['a', 'b']);
    expect(grouped.size).toBe(1);
  });
});

describe('toTranscriptRow — 교사 열람 메시지', () => {
  it('user 는 학생, 그 밖은 봇 · 카드 블록은 content null 에 cardType', () => {
    const base: MemberMessageDto = {
      id: 'msg_1', role: 'user', content: '답 알려줘', createdAt: '2026-09-17T01:00:00.000Z', botId: 'bot_1',
      cardType: null, cardPayload: null, blockIndex: null,
    };
    expect(toTranscriptRow(base)).toEqual({
      id: 'msg_1', role: 'user', content: '답 알려줘', cardType: null, botId: 'bot_1', at: Date.parse('2026-09-17T01:00:00.000Z'),
    });
    const card = toTranscriptRow({ ...base, id: 'msg_2', role: 'assistant', content: null, cardType: 'quiz', cardPayload: { q: 1 }, blockIndex: 0 });
    expect(card.role).toBe('assistant');
    expect(card.cardType).toBe('quiz');
    expect(toTranscriptRow({ ...base, role: 'system' }).role).toBe('assistant');
  });
});

describe('ackSignalInView — 확인의 낙관적 갱신', () => {
  const view: ClassSignalsDto = {
    summary: [
      { studentId: 's_1', counts: { answer_seeking: 2 }, maxSeverity: 2, lastAt: '2026-09-17T01:00:00.000Z', unacked: 2 },
      { studentId: 's_2', counts: { nonsense: 1 }, maxSeverity: 1, lastAt: '2026-09-17T00:00:00.000Z', unacked: 1 },
    ],
    signals: [signal({ id: 'sig_1' }), signal({ id: 'sig_2', ackedBy: 't_1', ackedAt: '2026-09-17T00:30:00.000Z' })],
  };

  it('신호에 확인자·시각을 채우고 그 학생의 미확인 수를 하나 내린다 — 다른 학생은 그대로', () => {
    const next = ackSignalInView(view, { signalId: 'sig_1', studentId: 's_1' }, 't_1', '2026-09-17T02:00:00.000Z');
    expect(next.signals[0]).toMatchObject({ ackedBy: 't_1', ackedAt: '2026-09-17T02:00:00.000Z' });
    expect(next.summary[0].unacked).toBe(1);
    expect(next.summary[1]).toBe(view.summary[1]);
    // 원본은 건드리지 않는다.
    expect(view.signals[0].ackedAt).toBeNull();
    expect(view.summary[0].unacked).toBe(2);
  });

  it('이미 확인된 신호는 아무것도 바꾸지 않는다(멱등) — 같은 객체를 돌려준다', () => {
    expect(ackSignalInView(view, { signalId: 'sig_2', studentId: 's_1' }, 't_1', '2026-09-17T02:00:00.000Z')).toBe(view);
  });

  it('목록 상한 밖의 신호(목록에 없음)여도 그 학생의 집계는 내린다 — 목록은 그대로', () => {
    const next = ackSignalInView(view, { signalId: 'sig_old', studentId: 's_2' }, 't_1', '2026-09-17T02:00:00.000Z');
    expect(next.signals).toBe(view.signals);
    expect(next.summary[1].unacked).toBe(0);
    expect(next.summary[0]).toBe(view.summary[0]);
  });
});

describe('buildMonitorRows — 명단 ∪ 집계', () => {
  it('명단에 없는 옛 멤버도 줄을 갖고, 미확인 많은 학생 → 세기 → 최근 → 이름 순이다', () => {
    const rows = buildMonitorRows(
      [member({ memberId: 's_a', displayName: '박하늘' }), member({ memberId: 's_b', displayName: '김바다' }), member({ memberId: 's_c', displayName: null })],
      [
        { studentId: 's_b', counts: { answer_seeking: 1 }, maxSeverity: 2, lastAt: '2026-09-17T01:00:00.000Z', unacked: 1 },
        { studentId: 's_old', counts: { crisis_keyword: 1 }, maxSeverity: 4, lastAt: '2026-09-10T01:00:00.000Z', unacked: 1 },
      ],
    );
    expect(rows.map((r) => r.studentId)).toEqual(['s_old', 's_b', 's_a', 's_c']);
    expect(rows[0]).toMatchObject({ enrolled: false, name: '학생 s_old', lastActiveAt: null });
    expect(rows[0].badge?.high).toBe(true);
    expect(rows[2].badge).toBeNull();
    // 표시명이 비면 sub 앞 8자로 부른다.
    expect(rows[3].name).toBe('학생 s_c');
  });

  it('memberLabel — 공백뿐인 표시명도 비어 있는 것으로 본다', () => {
    expect(memberLabel('  ', '3f1e6d3a-6b1c-4c2e')).toBe('학생 3f1e6d3a');
    expect(memberLabel(' 이름 ', 'x')).toBe('이름');
  });
});

describe('relativeTimeLabel — 분·시간·일 세 단위', () => {
  const now = Date.parse('2026-09-17T12:00:00.000Z');
  it.each([
    ['2026-09-17T11:59:40.000Z', '방금'],
    ['2026-09-17T11:45:00.000Z', '15분 전'],
    ['2026-09-17T09:00:00.000Z', '3시간 전'],
    ['2026-09-15T12:00:00.000Z', '2일 전'],
    ['2026-08-01T12:00:00.000Z', '오래됨'],
  ])('%s → %s', (iso, label) => {
    expect(relativeTimeLabel(iso, now)).toBe(label);
  });
});
