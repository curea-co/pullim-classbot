/**
 * 마감 라벨·D-day — **규칙이 하나여야 한다.**
 *
 * 종전에는 두 벌이었다: 클라이언트가 경과 시간(`ceil(diff/24h)`), 서버가 날짜 경계.
 * 한 컬럼(`d_day`)에 두 규칙이 앉으니 같은 과제가 교사 화면과 학생 화면에서 다르게 읽혔다.
 * 사람이 마감을 세는 방식은 날짜 경계다 — 「오늘까지」·「내일까지」.
 */
import { computeDDay, computeDDayNumber, formatDueLabel, remainingDDay } from '../assignment-due';

/** 2026-09-16 10:00 (로컬) */
const NOW = new Date(2026, 8, 16, 10, 0).getTime();
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString();

describe('remainingDDay — 낼 때 굳힌 정수를 지금 기준으로 다시 센다', () => {
  it('낸 날에 보면 굳힌 값 그대로다', () => {
    expect(remainingDDay(3, at(16, 8), NOW)).toBe(3);
  });

  it('미래 — 이틀 전에 D-3 으로 낸 과제는 오늘 D-1 이다', () => {
    expect(remainingDDay(3, at(14, 8), NOW)).toBe(1);
  });

  it('오늘 — 사흘 전에 D-3 으로 낸 과제는 오늘 마감(0)이다', () => {
    expect(remainingDDay(3, at(13, 22), NOW)).toBe(0);
  });

  it('과거 — 닷새 전에 D-3 으로 낸 과제는 지난 마감(-2)이다. 굳힌 값으로는 영영 오지 않던 「마감」이다', () => {
    expect(remainingDDay(3, at(11, 8), NOW)).toBe(-2);
  });

  it('날짜 경계로 자른다 — 낸 시각의 시·분은 안 본다', () => {
    expect(remainingDDay(1, at(15, 23, 59), NOW)).toBe(0);
    expect(remainingDDay(1, at(15, 0, 1), NOW)).toBe(0);
  });

  it('낸 시각을 모르면(배포 전·깨진 값) 굳힌 값을 그대로 돌려준다', () => {
    expect(remainingDDay(3, null, NOW)).toBe(3);
    expect(remainingDDay(3, 'not-a-date', NOW)).toBe(3);
  });

  it('보내는 쪽 정수(computeDDayNumber)와 같은 자름이다 — 낸 날 되읽으면 같은 수', () => {
    const due = at(19, 22);
    const sent = computeDDayNumber(due, NOW);
    expect(remainingDDay(sent, at(16, 9), NOW)).toBe(sent);
  });
});

describe('computeDDay — 날짜 경계로 자른다', () => {
  it('오늘 안에 끝나면 시·분과 무관하게 「오늘」이다', () => {
    // 경과 시간으로 세면 오늘 22시가 12시간 뒤라 `D-1` 이 된다 — 그게 종전 버그다.
    expect(computeDDay(at(16, 22), NOW)).toBe('오늘');
    expect(computeDDay(at(16, 11), NOW)).toBe('오늘');
  });

  it('내일이면 D-1, 모레면 D-2', () => {
    expect(computeDDay(at(17, 1), NOW)).toBe('D-1');
    expect(computeDDay(at(18, 23), NOW)).toBe('D-2');
  });

  it('지났으면 「오늘」로 접는다 — 모를 때 더 급한 쪽', () => {
    expect(computeDDay(at(15, 22), NOW)).toBe('오늘');
  });

  it('못 읽는 값의 폴백은 라벨 쪽과 **같은 날**을 말한다', () => {
    /*
      `formatDueLabel('')` 은 `'내일 22:00'` 이다. 여기서 `'오늘'` 을 돌려주면 마감을 비운 폼이
      「내일 22:00 (오늘)」을 나란히 찍는다 — 이 PR 이 없애려는 바로 그 어긋남이다.
    */
    expect(computeDDay('', NOW)).toBe('D-1');
    expect(computeDDay('어제', NOW)).toBe('D-1');
    expect(formatDueLabel('', NOW)).toBe('내일 22:00');
  });
});

describe('formatDueLabel — D-day 와 같은 날을 말한다', () => {
  it('오늘 밤 마감은 라벨도 「오늘」이다', () => {
    // 라벨과 D-day 는 같은 화면에 나란히 찍힌다 — 둘이 다른 날을 말하면 그 자리에서 보인다.
    expect(formatDueLabel(at(16, 22), NOW)).toBe('오늘 22:00');
    expect(computeDDay(at(16, 22), NOW)).toBe('오늘');
  });

  it('내일 마감은 「내일」', () => {
    expect(formatDueLabel(at(17, 22), NOW)).toBe('내일 22:00');
  });

  it('그 뒤는 날짜로', () => {
    expect(formatDueLabel(at(20, 9, 5), NOW)).toBe('9/20 09:05');
  });
});
