import { monitoredRoster, shortcutTries } from '../classbot-monitoring';
import {
  buildProcessEvaluation, buildScopeExitLog, buildStudentReport, buildTopicMix, buildTranscript,
  conceptLabel, findStudent, reportOrder, scopeExitTotal, scopeExits, siblingStudents,
} from '../classbot-student-report';

describe('범위 이탈 — 관제소와 학생 리포트가 같은 값을 본다', () => {
  it('대화 기록에 심긴 이탈 턴 수 = scopeExits()', () => {
    for (const s of monitoredRoster) {
      const offTopicTurns = buildTranscript(s).filter(t => t.offTopic);
      expect(offTopicTurns).toHaveLength(scopeExits(s));
    }
  });

  it('이탈 이력 길이 = scopeExits()', () => {
    for (const s of monitoredRoster) {
      expect(buildScopeExitLog(s)).toHaveLength(scopeExits(s));
    }
  });

  it('리포트가 들고 있는 이탈·지름길 수치 = 명단이 읽는 값', () => {
    for (const s of monitoredRoster) {
      const report = buildStudentReport(s);
      expect(report.scopeExitCount).toBe(scopeExits(s));
      expect(report.shortcutCount).toBe(shortcutTries(s));
    }
  });

  it('학급 합계 = 학생별 합', () => {
    expect(scopeExitTotal).toBe(monitoredRoster.reduce((a, s) => a + scopeExits(s), 0));
  });

  it('이탈 턴은 학생 발화에만 붙는다', () => {
    for (const s of monitoredRoster) {
      expect(buildTranscript(s).every(t => !t.offTopic || t.speaker === 'student')).toBe(true);
    }
  });
});

describe('대화 기록', () => {
  it('같은 학생이면 언제 불러도 같은 결과 (난수 없음)', () => {
    const s = monitoredRoster[3];
    expect(buildTranscript(s)).toEqual(buildTranscript(s));
  });

  it('턴 id 가 겹치지 않는다', () => {
    for (const s of monitoredRoster) {
      const ids = buildTranscript(s).map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('지름길 턴 수(학생 발화) = shortcutTries()', () => {
    for (const s of monitoredRoster) {
      const said = buildTranscript(s).filter(t => t.speaker === 'student' && t.kind === 'shortcut');
      expect(said).toHaveLength(shortcutTries(s));
    }
  });

  it('모든 stuckConcepts id 가 이름표를 갖는다', () => {
    for (const s of monitoredRoster) {
      for (const cid of s.stuckConcepts) {
        expect(conceptLabel(cid)).not.toBe(cid);
      }
    }
  });
});

describe('대화 주제 분포', () => {
  it('턴 합 = 학생 발화 수, 비율 합은 100 근처', () => {
    for (const s of monitoredRoster) {
      const said = buildTranscript(s).filter(t => t.speaker === 'student');
      const mix = buildTopicMix(s);
      expect(mix.reduce((a, m) => a + m.count, 0)).toBe(said.length);
      expect(Math.abs(mix.reduce((a, m) => a + m.pct, 0) - 100)).toBeLessThanOrEqual(2);
    }
  });
});

describe('과정 평가', () => {
  it('제안 점수는 0 이상 배점 이하', () => {
    for (const s of monitoredRoster) {
      for (const c of buildProcessEvaluation(s)) {
        expect(c.suggested).toBeGreaterThanOrEqual(0);
        expect(c.suggested).toBeLessThanOrEqual(c.weight);
      }
    }
  });

  it('배점 합은 100', () => {
    for (const s of monitoredRoster) {
      expect(buildProcessEvaluation(s).reduce((a, c) => a + c.weight, 0)).toBe(100);
    }
  });
});

describe('이전/다음 학생 이동', () => {
  it('명단 순서는 이름순 · 인원은 그대로', () => {
    expect(reportOrder).toHaveLength(monitoredRoster.length);
    const names = reportOrder.map(s => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'ko')));
  });

  it('첫 학생은 이전이 없고 마지막 학생은 다음이 없다', () => {
    expect(siblingStudents(reportOrder[0].id).prev).toBeUndefined();
    expect(siblingStudents(reportOrder[reportOrder.length - 1].id).next).toBeUndefined();
  });

  it('가운데 학생은 앞뒤로 이어진다', () => {
    const mid = reportOrder[5];
    const { prev, next, index, total } = siblingStudents(mid.id);
    expect(index).toBe(5);
    expect(total).toBe(reportOrder.length);
    expect(prev?.id).toBe(reportOrder[4].id);
    expect(next?.id).toBe(reportOrder[6].id);
  });

  it('없는 학생은 찾지 못한다', () => {
    expect(findStudent('nope')).toBeUndefined();
  });
});
