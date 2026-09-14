import {
  MINUTES_TODAY, STALE_AFTER_MIN, buildReteachConcepts, isDepthShort, isOfflineToday,
  lastSeenText, monitoredRoster, monitoringSummary, reachBadge, relativeSeenLabel,
  reteachConcepts, shortcutTries, stuckConceptLabel, type ReachBadge,
} from '../classbot-monitoring';

describe('monitoredRoster', () => {
  it('학생 20명 · 전원 중1', () => {
    expect(monitoredRoster).toHaveLength(20);
    expect(monitoredRoster.every(s => s.grade === '중1')).toBe(true);
  });

  it('id 가 겹치지 않는다', () => {
    expect(new Set(monitoredRoster.map(s => s.id)).size).toBe(monitoredRoster.length);
  });

  it('닿은 수준은 요구한 수준을 넘지 않는다', () => {
    expect(monitoredRoster.every(s => s.actualDepth <= s.targetDepth)).toBe(true);
  });

  it('오늘 미접속 학생은 마지막 활동이 오늘 자정보다 앞선다', () => {
    for (const s of monitoredRoster.filter(isOfflineToday)) {
      expect(s.lastSeenMin).toBeGreaterThan(MINUTES_TODAY);
    }
    for (const s of monitoredRoster.filter(s => !isOfflineToday(s))) {
      expect(s.lastSeenMin).toBeLessThanOrEqual(MINUTES_TODAY);
    }
  });

  it('마지막 활동 문구는 줄마다 모양이 같다 — 분·시간·일 셋 중 하나', () => {
    for (const s of monitoredRoster) {
      expect(lastSeenText(s)).toMatch(/^(방금|오래됨|\d+(분|시간|일) 전)$/);
    }
  });
});

describe('monitoringSummary — 학생별 합과 상단 요약이 어긋나면 실패', () => {
  it('지름길 시도 합계 = 학생별 (정답 요구 + 붙여넣기성 입력) 합', () => {
    const perStudent = monitoredRoster.reduce((a, s) => a + shortcutTries(s), 0);
    expect(monitoringSummary.shortcutTries).toBe(perStudent);
    expect(monitoringSummary.shortcutTries).toBe(
      monitoringSummary.answerAsks + monitoringSummary.pasteLikes,
    );
  });

  it('도달 3값 합 = 전체 인원', () => {
    const { reached, partial, notReached, total } = monitoringSummary;
    expect(reached + partial + notReached).toBe(total);
    expect(total).toBe(monitoredRoster.length);
  });

  it('목표 수준 미달 = 미도달이 아닌데 닿은 수준이 모자란 학생', () => {
    const expected = monitoredRoster.filter(
      s => s.reach !== 'not-reached' && s.actualDepth < s.targetDepth,
    ).length;
    expect(monitoringSummary.depthShort).toBe(expected);
    expect(monitoredRoster.filter(isDepthShort)).toHaveLength(expected);
  });

  it('오늘 미접속 = 마지막 활동이 오늘 자정보다 앞선 학생', () => {
    expect(monitoringSummary.offlineToday).toBe(
      monitoredRoster.filter(isOfflineToday).length,
    );
  });
});

describe('relativeSeenLabel — 최근 접속 배지 문구', () => {
  it('분 → 시간 → 일 순으로 단위가 올라간다', () => {
    expect(relativeSeenLabel(0)).toBe('방금');
    expect(relativeSeenLabel(1)).toBe('1분 전');
    expect(relativeSeenLabel(59)).toBe('59분 전');
    expect(relativeSeenLabel(60)).toBe('1시간 전');
    expect(relativeSeenLabel(24 * 60 - 1)).toBe('23시간 전');
    expect(relativeSeenLabel(24 * 60)).toBe('1일 전');
    expect(relativeSeenLabel(3 * 24 * 60)).toBe('3일 전');
  });

  it('30일이 지나면 날짜를 세지 않고 「오래됨」', () => {
    expect(relativeSeenLabel(STALE_AFTER_MIN - 1)).toBe('29일 전');
    expect(relativeSeenLabel(STALE_AFTER_MIN)).toBe('오래됨');
    expect(relativeSeenLabel(STALE_AFTER_MIN * 4)).toBe('오래됨');
  });
});

describe('reachBadge — 도달 배지 3값은 서로 배타다', () => {
  it('학생 한 명은 정확히 한 값을 받는다', () => {
    const buckets: Record<ReachBadge, number> = { reached: 0, 'depth-short': 0, 'not-reached': 0 };
    for (const s of monitoredRoster) buckets[reachBadge(s)] += 1;
    expect(buckets.reached + buckets['depth-short'] + buckets['not-reached'])
      .toBe(monitoredRoster.length);
  });

  it('배지 수 = 교사 홈 상단 카드 숫자 — 셋이 어긋나면 실패', () => {
    const count = (v: ReachBadge) => monitoredRoster.filter(s => reachBadge(s) === v).length;
    expect(count('reached')).toBe(monitoringSummary.reached);
    expect(count('depth-short')).toBe(monitoringSummary.depthShort);
    expect(count('not-reached')).toBe(monitoringSummary.notReached);
    expect(monitoringSummary.reached + monitoringSummary.depthShort + monitoringSummary.notReached)
      .toBe(monitoringSummary.total);
  });

  it('미달 = isDepthShort · 미도달 = 못 닿은 학생', () => {
    for (const s of monitoredRoster) {
      expect(reachBadge(s) === 'depth-short').toBe(isDepthShort(s));
      expect(reachBadge(s) === 'not-reached').toBe(s.reach === 'not-reached');
    }
  });
});

describe('stuckConceptLabel — 줄에서 배지 대신 말해줄 것', () => {
  it('막힌 개념이 있으면 첫 개념 이름을 준다', () => {
    for (const s of monitoredRoster.filter(s => s.stuckConcepts.length > 0)) {
      expect(stuckConceptLabel(s)).toBeTruthy();
    }
  });

  it('막힌 개념이 없으면 빈 문자열', () => {
    for (const s of monitoredRoster.filter(s => s.stuckConcepts.length === 0)) {
      expect(stuckConceptLabel(s)).toBe('');
    }
  });
});

describe('reteachConcepts', () => {
  it('3개 · 빈도 내림차순', () => {
    expect(reteachConcepts).toHaveLength(3);
    const counts = reteachConcepts.map(c => c.studentCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('개념별 인원 = 그 개념에서 막힌 학생 수 · 이름 목록과 일치', () => {
    for (const c of reteachConcepts) {
      const names = monitoredRoster.filter(s => s.stuckConcepts.includes(c.id)).map(s => s.name);
      expect(c.studentCount).toBe(names.length);
      expect(c.studentNames).toEqual(names);
      expect(c.nextStep).toBeTruthy();
    }
  });

  it('아무도 안 막힌 개념은 나오지 않는다', () => {
    expect(buildReteachConcepts(monitoredRoster, 99).every(c => c.studentCount > 0)).toBe(true);
  });

  it('막힌 학생이 없으면 빈 목록', () => {
    const clean = monitoredRoster.map(s => ({ ...s, stuckConcepts: [] }));
    expect(buildReteachConcepts(clean)).toEqual([]);
  });
});
