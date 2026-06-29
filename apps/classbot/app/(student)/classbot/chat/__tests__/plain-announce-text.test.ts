import { plainAnnounceText } from '../page';

/** plainAnnounceText 는 Turn 을 받지만 테스트는 announce 에 필요한 kind/text 만 채워 검증한다. */
type PartialTurn = Parameters<typeof plainAnnounceText>[0];
const turn = (t: Partial<PartialTurn>): PartialTurn =>
  ({ id: 'x', role: 'bot', at: 0, ...t }) as PartialTurn;

describe('plainAnnounceText — 카드류는 종류만', () => {
  it.each([
    ['quiz', '퀴즈가 도착했어요'],
    ['concept', '개념 설명이 도착했어요'],
    ['concept-detail', '개념 설명이 도착했어요'],
    ['example', '예제가 도착했어요'],
    ['summary', '오늘 정리가 도착했어요'],
    ['problem-card', '문제 카드가 도착했어요'],
  ] as const)('%s → %s', (kind, expected) => {
    expect(plainAnnounceText(turn({ kind, text: '본문 전체 텍스트는 무시된다' }))).toBe(expected);
  });
});

describe('plainAnnounceText — 텍스트 turn 은 1줄 요약(전문 금지)', () => {
  it('마크다운 마커를 strip 한다', () => {
    expect(plainAnnounceText(turn({ kind: 'text', text: '**굵게** 그리고 `코드`' }))).toBe(
      '새 메시지: 굵게 그리고 코드',
    );
  });

  it('여러 줄이면 첫 줄만 (전문 아님)', () => {
    const out = plainAnnounceText(turn({ kind: 'text', text: '첫 줄 요약.\n둘째 줄은 제외.' }));
    expect(out).toBe('새 메시지: 첫 줄 요약.');
    expect(out).not.toContain('둘째 줄');
  });

  it('60자 초과는 truncate(말줄임)', () => {
    const long = 'ㄱ'.repeat(80);
    const out = plainAnnounceText(turn({ kind: 'text', text: long }));
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThan(long.length);
  });

  it('빈 텍스트면 기본 문구', () => {
    expect(plainAnnounceText(turn({ kind: 'text', text: '' }))).toBe('새 메시지가 도착했어요');
  });
});
