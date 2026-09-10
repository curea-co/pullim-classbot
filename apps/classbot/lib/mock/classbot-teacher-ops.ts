/**
 * 교사 운영 메인(SCR-C-17) — 봇 운영 사실 mock.
 *
 * 봇 카탈로그(이름·과목·학년·톤·안전 등급·등록 인원)의 권위는 lib/mock/classbot.ts 의 `classBots` 다.
 * 이 파일은 그 위에 카탈로그가 담지 않는 「운영 사실」만 얹는다.
 *   ① 지금 학생에게 열려 있는지(운영 중) 멈춰 있는지
 *   ② 어느 학급에 붙어 있고 학급마다 몇 명인지
 *
 * 학급 이름은 참여 코드 맵(lib/mock/class-codes.ts `CODE_MAP`)과 같은 이름을 쓴다 —
 * 학생이 코드로 들어간 반과 교사가 보는 반이 어긋나면 안 된다.
 *
 * 담지 않는 것:
 *  - 라이브 수업 상태(`ClassBot.isLive`) — 라이브는 기획 보류(SCR-C-19)라 운영 화면이 읽지 않는다.
 *  - 학생 도달·활동 지표 — 그건 학급 관제소(lib/mock/classbot-monitoring.ts)가 갖는다.
 */

import { classBots, type ClassBot } from './classbot';

/** 봇이 지금 학생에게 열려 있는지 */
export type BotRunState = 'running' | 'paused';

export const runStateLabels: Record<BotRunState, string> = {
  running: '운영 중',
  paused: '멈춤',
};

/** 봇이 붙어 있는 학급 한 반 */
export type BotClassroom = {
  id: string;
  /** 학생·교사가 같이 보는 반 이름 */
  label: string;
  studentCount: number;
};

export type BotOps = {
  botId: string;
  runState: BotRunState;
  /** 멈춘 이유 — 멈춤일 때만 */
  pauseReason?: string;
  classrooms: BotClassroom[];
};

/**
 * 봇별 운영 기록.
 * 학급별 인원의 합은 카탈로그의 `enrolledCount` 와 맞춘다 (lib/mock/__tests__ 에서 검증).
 */
export const teacherBotOps: BotOps[] = [
  {
    botId: 'cb_001',
    runState: 'running',
    classrooms: [{ id: 'cr_math_a', label: '중2 수학 A반', studentCount: 18 }],
  },
  {
    botId: 'cb_002',
    runState: 'running',
    classrooms: [{ id: 'cr_eng_a', label: '중3 영어 읽기반', studentCount: 12 }],
  },
  {
    botId: 'cb_003',
    runState: 'paused',
    pauseReason: '학교 진도가 끝나 잠시 멈췄어요',
    classrooms: [{ id: 'cr_sci_a', label: '통합과학 심화반', studentCount: 17 }],
  },
  {
    botId: 'cb_004',
    runState: 'running',
    classrooms: [
      { id: 'cr_kor_a', label: '중3 국어 A반', studentCount: 9 },
      { id: 'cr_kor_b', label: '중3 국어 B반', studentCount: 7 },
    ],
  },
  {
    botId: 'cb_005',
    runState: 'paused',
    pauseReason: '다음 학기 수업을 준비하는 중이에요',
    classrooms: [{ id: 'cr_soc_a', label: '고1 사회 탐구반', studentCount: 14 }],
  },
];

/** 카탈로그 한 줄 + 그 봇의 운영 사실 */
export type TeacherBotRow = {
  bot: ClassBot;
  ops: BotOps;
  /** 학급 인원 합 — 화면에 쓰는 학생 수의 권위 */
  studentCount: number;
};

/**
 * 카탈로그 + 운영 기록 조인. 카탈로그 순서를 그대로 따른다.
 * 운영 기록이 없는 봇은 「멈춤 · 붙은 학급 없음」으로 본다 — 만들어 두고 아직 안 붙인 봇.
 */
export function getTeacherBotRows(): TeacherBotRow[] {
  return classBots.map(bot => {
    const ops: BotOps = teacherBotOps.find(o => o.botId === bot.id) ?? {
      botId: bot.id,
      runState: 'paused',
      pauseReason: '아직 학급에 붙이지 않았어요',
      classrooms: [],
    };
    return {
      bot,
      ops,
      studentCount: ops.classrooms.reduce((n, c) => n + c.studentCount, 0),
    };
  });
}

export type TeacherBotSummary = {
  botCount: number;
  runningCount: number;
  classroomCount: number;
  studentCount: number;
};

/** 상단 요약 — 전부 위 조인에서 계산한다. 직접 쓴 숫자가 아니라 봇 줄을 고치면 같이 움직인다. */
export function getTeacherBotSummary(rows: TeacherBotRow[] = getTeacherBotRows()): TeacherBotSummary {
  return {
    botCount: rows.length,
    runningCount: rows.filter(r => r.ops.runState === 'running').length,
    classroomCount: rows.reduce((n, r) => n + r.ops.classrooms.length, 0),
    studentCount: rows.reduce((n, r) => n + r.studentCount, 0),
  };
}
