import { isDepthShort, isOfflineToday, monitoredRoster, monitoringSummary } from '../classbot-monitoring';
import {
  attentionReason, countAttentionStudents, pickAttentionStudents,
} from '../classbot-teacher-home';

describe('attentionReason — 왜 먼저 봐야 하는지', () => {
  it('오늘 안 들어온 학생이 가장 먼저다', () => {
    for (const s of monitoredRoster.filter(isOfflineToday)) {
      expect(attentionReason(s)).toBe('offline');
    }
  });

  it('미도달은 오늘 들어온 학생에게만 붙는다', () => {
    for (const s of monitoredRoster) {
      if (attentionReason(s) === 'not-reached') {
        expect(s.reach).toBe('not-reached');
        expect(isOfflineToday(s)).toBe(false);
      }
    }
  });

  it('목표 수준 미달은 관제소와 같은 규칙(isDepthShort)을 쓴다', () => {
    for (const s of monitoredRoster) {
      if (attentionReason(s) === 'depth-short') {
        expect(isDepthShort(s)).toBe(true);
      }
    }
  });

  it('셋 중 아무 데도 안 걸리면 홈에 올리지 않는다', () => {
    const fine = monitoredRoster.find(s => attentionReason(s) === null);
    expect(fine).toBeDefined();
    expect(fine!.reach).not.toBe('not-reached');
    expect(isOfflineToday(fine!)).toBe(false);
    expect(isDepthShort(fine!)).toBe(false);
  });

  it('이유는 셋 중 하나뿐이다 — 줄에는 문장으로 적지 않고 고르는 순서로만 쓴다', () => {
    for (const s of monitoredRoster) {
      const reason = attentionReason(s);
      if (!reason) continue;
      expect(['offline', 'not-reached', 'depth-short']).toContain(reason);
    }
  });
});

describe('pickAttentionStudents — 홈이 보여줄 몇 명', () => {
  it('limit 만큼만 고른다', () => {
    expect(pickAttentionStudents(monitoredRoster, 5)).toHaveLength(5);
    expect(pickAttentionStudents(monitoredRoster, 2)).toHaveLength(2);
  });

  it('오늘 안 들어온 학생이 앞에 온다', () => {
    const picked = pickAttentionStudents(monitoredRoster, 5);
    const offlineCount = monitoringSummary.offlineToday;
    expect(picked.slice(0, offlineCount).every(p => p.reason === 'offline')).toBe(true);
    expect(picked.slice(offlineCount).every(p => p.reason !== 'offline')).toBe(true);
  });

  it('걸린 학생만 고른다', () => {
    for (const { student, reason } of pickAttentionStudents(monitoredRoster, 20)) {
      expect(attentionReason(student)).toBe(reason);
    }
  });

  it('전체 인원은 골라낸 수와 따로 센다 (「N명 중 5명」)', () => {
    const total = countAttentionStudents(monitoredRoster);
    expect(total).toBe(monitoredRoster.filter(s => attentionReason(s) !== null).length);
    expect(total).toBeGreaterThan(pickAttentionStudents(monitoredRoster, 5).length);
  });

  it('아무도 안 걸리면 빈 목록 — 홈은 빈 상태를 보여준다', () => {
    const allFine = monitoredRoster.filter(s => attentionReason(s) === null);
    expect(pickAttentionStudents(allFine, 5)).toEqual([]);
    expect(countAttentionStudents(allFine)).toBe(0);
  });
});
