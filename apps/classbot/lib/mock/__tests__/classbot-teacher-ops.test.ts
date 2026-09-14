import { classBots } from '../classbot';
import {
  getTeacherBotRows, getTeacherBotSummary, teacherBotOps,
} from '../classbot-teacher-ops';

describe('teacherBotOps — 운영 기록이 봇 카탈로그와 어긋나면 실패', () => {
  it('운영 기록의 botId 는 전부 카탈로그에 있다', () => {
    const catalog = new Set(classBots.map(b => b.id));
    for (const ops of teacherBotOps) {
      expect(catalog.has(ops.botId)).toBe(true);
    }
  });

  it('botId 가 겹치지 않는다', () => {
    expect(new Set(teacherBotOps.map(o => o.botId)).size).toBe(teacherBotOps.length);
  });

  it('학급 id 가 겹치지 않는다', () => {
    const ids = teacherBotOps.flatMap(o => o.classrooms.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('학급별 인원 합 = 카탈로그의 등록 인원', () => {
    for (const ops of teacherBotOps) {
      const bot = classBots.find(b => b.id === ops.botId)!;
      const sum = ops.classrooms.reduce((n, c) => n + c.studentCount, 0);
      expect(sum).toBe(bot.enrolledCount);
    }
  });

  it('멈춘 봇은 이유를 갖는다', () => {
    for (const ops of teacherBotOps.filter(o => o.runState === 'paused')) {
      expect(ops.pauseReason).toBeTruthy();
    }
  });
});

describe('getTeacherBotRows — 카탈로그 + 운영 기록 조인', () => {
  it('카탈로그의 모든 봇을 카탈로그 순서로 돌려준다', () => {
    const rows = getTeacherBotRows();
    expect(rows.map(r => r.bot.id)).toEqual(classBots.map(b => b.id));
  });

  it('운영 기록이 없는 봇은 멈춤 · 붙은 학급 없음', () => {
    const known = new Set(teacherBotOps.map(o => o.botId));
    for (const row of getTeacherBotRows().filter(r => !known.has(r.bot.id))) {
      expect(row.ops.runState).toBe('paused');
      expect(row.ops.classrooms).toHaveLength(0);
      expect(row.studentCount).toBe(0);
    }
  });

  it('학생 수는 학급 인원 합', () => {
    for (const row of getTeacherBotRows()) {
      expect(row.studentCount).toBe(row.ops.classrooms.reduce((n, c) => n + c.studentCount, 0));
    }
  });
});

describe('getTeacherBotSummary — 상단 요약은 봇 줄에서 계산된다', () => {
  const rows = getTeacherBotRows();
  const summary = getTeacherBotSummary(rows);

  it('봇 수 = 카탈로그 수', () => {
    expect(summary.botCount).toBe(classBots.length);
  });

  it('운영 중 수 ≤ 봇 수', () => {
    expect(summary.runningCount).toBeLessThanOrEqual(summary.botCount);
    expect(summary.runningCount).toBe(rows.filter(r => r.ops.runState === 'running').length);
  });

  it('학급 수·학생 수는 봇 줄의 합', () => {
    expect(summary.classroomCount).toBe(rows.reduce((n, r) => n + r.ops.classrooms.length, 0));
    expect(summary.studentCount).toBe(rows.reduce((n, r) => n + r.studentCount, 0));
  });
});
