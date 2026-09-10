import type { ParentSelfStudyChild } from '@/hooks/api/types';
import {
  NOTHING_SHARED,
  SHARE_CAN_STOP,
  formatStudyDay,
  hasSomethingToShow,
  homeTeaserLine,
  sharedByChildSentence,
  visibleChildren,
} from '../self-study-visibility';

/**
 * 여기서 지키는 것은 표시 규칙이 아니라 **계약 §3 의 한 줄**이다 —
 * 부모가 「동의 안 함」과 「동의했지만 활동 없음」을 구별할 수 있으면 안 된다.
 *
 * 그래서 아래 첫 블록은 편의 함수의 단위 테스트가 아니라 **회귀 잠금**이다.
 * 「동의는 했으니 이름이라도 보여주자」는 변경이 들어오면 여기서 빨개진다.
 */

const THIS_YEAR = new Date().getFullYear();

/*
  ⚠️ `scopeLabel`·`expiresAt` 이 **없다.** 그 둘은 학부모 응답에서 걷혔다 — 미동의 자녀에게
  `null` 이 되어 「동의 안 함」의 오라클이 되기 때문이다(05 § 11.4 규칙 2). 타입에도 없으므로
  여기 되살리면 typecheck 가 먼저 막는다.
*/
const child = (over: Partial<ParentSelfStudyChild> = {}): ParentSelfStudyChild => ({
  id: 'student_001',
  name: '서연',
  relation: 'mother',
  bots: [],
  streak: { count: 0, lastStudyDate: null, thisWeekDays: 0 },
  ...over,
});

const bot = {
  botId: 'cb_001',
  name: '수학봇',
  subject: '수학',
  // 아이가 보는 얼굴을 부모도 본다 — 응답에 실리는 값이라 픽스처도 갖춘다.
  avatarEmoji: '🧑‍🏫',
  addedAt: '2026-09-01T00:00:00.000Z',
};

describe('미동의와 무활동은 같은 자리로 접힌다', () => {
  it('동의했지만 봇도 공부한 날도 없는 자녀는 화면에서 빠진다 — 응답에 없는 자녀와 같아진다', () => {
    expect(hasSomethingToShow(child())).toBe(false);
    // 미동의 자녀는 애초에 배열에 없다(서버 INNER JOIN). 무활동 자녀도 여기서 걸러져
    // 두 경우 모두 `visibleChildren` 의 결과가 빈 배열이 된다 — 그게 요점이다.
    expect(visibleChildren([child()])).toEqual([]);
    expect(visibleChildren([])).toEqual([]);
  });

  it('셋 중 하나라도 있으면 보여준다', () => {
    expect(hasSomethingToShow(child({ bots: [bot] }))).toBe(true);
    expect(
      hasSomethingToShow(
        child({ streak: { count: 0, lastStudyDate: null, thisWeekDays: 2 } }),
      ),
    ).toBe(true);
    // 연속일수만 남은 자리 — 지난주까지 이어 오다 이번 주에 아직 안 한 아이
    expect(
      hasSomethingToShow(
        child({ streak: { count: 5, lastStudyDate: '2026-08-30', thisWeekDays: 0 } }),
      ),
    ).toBe(true);
  });

  it('보여줄 자녀와 접힌 자녀가 섞여 있으면 보여줄 쪽만 남는다', () => {
    const 서연 = child({ id: 'student_001', bots: [bot] });
    const 민준 = child({ id: 'student_002', name: '민준' });
    expect(visibleChildren([서연, 민준])).toEqual([서연]);
  });

  it('볼 것 없음 문구는 어느 쪽이 비었는지 말하지 않는다', () => {
    // 「공유하지 않았어요」류로 되돌리면 동의 안 한 아이를 지목하는 문장이 된다.
    expect(NOTHING_SHARED.title).not.toMatch(/공유하지 않|동의/);
    expect(NOTHING_SHARED.description).not.toMatch(/공유하지 않|동의/);
    // 두 조건을 **둘 다** 적어야 같은 글자가 두 상황에서 다 참이 된다.
    expect(NOTHING_SHARED.description).toContain('보여주기로');
    expect(NOTHING_SHARED.description).toContain('공부한 날');
  });
});

describe('출처 문장', () => {
  it('받침 있는 이름에는 「이가」, 없는 이름에는 「가」', () => {
    expect(sharedByChildSentence('서연')).toBe('서연이가 보여주기로 한 기록이에요');
    expect(sharedByChildSentence('지수')).toBe('지수가 보여주기로 한 기록이에요');
  });

  /**
   * **문장이 값을 읽지 않는다** — 이름 말고는 자녀마다 같아야 한다.
   *
   * 종전 판은 범위 라벨(「이번 주만」)과 기한(「3월 8일까지」)을 실었는데, 그 둘이
   * 미동의 자녀에게 `null` 이 되어 오라클이 됐다. 이제 상수라 값에서 읽어 낼 것이 없다.
   */
  it('범위·기한을 담지 않는다 — 상수 문장이다', () => {
    const a = sharedByChildSentence('서연');
    const b = sharedByChildSentence('서연');
    expect(a).toBe(b);
    for (const forbidden of ['이번 주만', '이번 달만', '계속', '까지', '월', '일']) {
      expect(a).not.toContain(forbidden);
    }
    // 꼬리도 상수다 — 기한이 아니다.
    expect(SHARE_CAN_STOP).toBe('언제든 멈출 수 있어요');
    expect(SHARE_CAN_STOP).not.toMatch(/\d/);
  });
});

describe('날짜 표기', () => {
  it('공부한 날은 글자 그대로 쪼갠다 — 표준시로 하루가 밀리지 않게', () => {
    // `new Date('YYYY-MM-DD')` 는 UTC 자정으로 읽혀 표준시가 음수인 곳에서 하루 앞이 된다.
    // 이 표기는 그 경로를 아예 안 타므로 CI 지역이 어디든 같은 글자가 나온다.
    expect(formatStudyDay(`${THIS_YEAR}-01-01`)).toBe('1월 1일');
    expect(formatStudyDay(`${THIS_YEAR - 1}-12-31`)).toBe(`${THIS_YEAR - 1}년 12월 31일`);
    expect(formatStudyDay(null)).toBeNull();
    expect(formatStudyDay('2026-9-1')).toBeNull();
  });
});

describe('학부모 홈 한 줄', () => {
  it('있는 것만 적는다', () => {
    expect(
      homeTeaserLine(
        child({ bots: [bot], streak: { count: 3, lastStudyDate: '2026-09-02', thisWeekDays: 3 } }),
      ),
    ).toBe('혼자 고른 봇 1개 · 이번 주 3일 공부했어요');
    expect(homeTeaserLine(child({ bots: [bot] }))).toBe('혼자 고른 봇 1개를 담아 뒀어요');
    expect(
      homeTeaserLine(child({ streak: { count: 1, lastStudyDate: '2026-09-02', thisWeekDays: 1 } })),
    ).toBe('이번 주 1일 공부했어요');
  });

  it('「0일」·「0개」를 적지 않는다 — 없는 것을 세어 보여줄 자리가 아니다', () => {
    const line = homeTeaserLine(
      child({ streak: { count: 5, lastStudyDate: '2026-08-30', thisWeekDays: 0 } }),
    );
    expect(line).toBe('이어서 5일 공부했어요');
    expect(line).not.toContain('0');
  });
});
