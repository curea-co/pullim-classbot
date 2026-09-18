import { classBots } from '../classbot';
import { teacherBotOps } from '../classbot-teacher-ops';

/*
  `getTeacherBotRows`·`getTeacherBotSummary` 를 재던 describe 둘은 2026-09-18 에 함께 지웠다 —
  운영 메인이 봇 목록·요약을 정본(`GET /classbot/me/bots`)으로 옮기며 그 두 함수가 없어졌다.
  남은 것은 `teacherBotOps` 자체의 정합성이고, 그걸 읽는 곳은 봇 관리 mock 과 빌더 테스트다.
*/

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
