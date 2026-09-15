/**
 * 코드 수명 라벨 (`proc/spec/03 § 4.3`).
 *
 * 이 함수가 지키는 계약은 둘이다:
 *  1) **모르면 열어 둔다** — null·못 읽는 값을 「닫힘」으로 읽으면 멀쩡한 코드가 화면에서 죽는다
 *  2) 남은 시간을 분으로 세지 않는다 — 교사의 결정은 「지금 불러 줘도 되나」 하나뿐이다
 */
import { joinCodeLife } from '../join-code-format';

// 2026-09-15 18:00 (로컬)
const NOW = new Date(2026, 8, 15, 18, 0).getTime();
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m, d, h, min).toISOString();

describe('joinCodeLife', () => {
  it('닫힐 시각이 없으면 안 닫힌 코드다', () => {
    // 만료 컬럼이 생기기 전에 발급된 행 — 소급해서 닫으면 이미 나눠 준 코드가 한꺼번에 죽는다.
    expect(joinCodeLife(null, NOW)).toEqual({ state: 'open-forever' });
  });

  it('못 읽는 값도 닫지 않는다', () => {
    expect(joinCodeLife('어제', NOW)).toEqual({ state: 'open-forever' });
  });

  it('지난 시각은 닫힘이다', () => {
    expect(joinCodeLife(at(2026, 8, 15, 17, 59), NOW)).toEqual({ state: 'closed' });
  });

  it('같은 시각은 닫힘이다 — 경계는 닫는 쪽이다', () => {
    // 참여 라우트의 판정(`expiresAt <= now`)과 같은 경계여야 화면과 서버가 안 갈린다.
    expect(joinCodeLife(at(2026, 8, 15, 18, 0), NOW)).toEqual({ state: 'closed' });
  });

  it('오늘·내일·그 뒤를 갈라 말한다', () => {
    expect(joinCodeLife(at(2026, 8, 15, 21, 30), NOW)).toEqual({ state: 'open', label: '오늘 21:30까지' });
    expect(joinCodeLife(at(2026, 8, 16, 16, 0), NOW)).toEqual({ state: 'open', label: '내일 16:00까지' });
    expect(joinCodeLife(at(2026, 8, 20, 9, 5), NOW)).toEqual({ state: 'open', label: '9/20 09:05까지' });
  });
});
