/**
 * 교사 운영 화면의 「봇 운영 사실」 mock — **화면이 더는 읽지 않는다.**
 *
 * 2026-09-18 에 운영 메인(`/teacher/classbot`)이 봇 목록·요약을 정본으로 옮기며
 * (`GET /classbot/me/bots` · `hooks/api/bot.ts` `useMyBots`) 이 파일의 화면 쪽 소비처가 사라졌다.
 * 그때 함께 걷은 것 넷: `getTeacherBotRows()` · `getTeacherBotSummary()` · `TeacherBotSummary` ·
 * `runStateLabels`. 운영 중/멈춤을 말하는 칸이 정본(`BotDto`)에 없어서, 그 값을 화면에 그대로
 * 되살릴 자리도 없다.
 *
 * **남은 것은 `teacherBotOps` 하나다.** 지우지 않는 까닭은 다른 소비처가 있어서다 —
 * 봇 관리 mock(`./classbot-bot-policy.ts` 의 `toManagedBot`)이 「이 봇이 어느 학급에 붙어 있나」를
 * 여기서 읽고, 빌더 테스트(`components/builder/__tests__/builder.test.tsx`)가 학급 표와
 * 어긋나지 않는지를 여기에 건다.
 *
 * 봇 카탈로그(이름·과목·학년·톤·안전 등급·등록 인원)의 권위는 lib/mock/classbot.ts 의 `classBots` 다.
 * 이 파일은 카탈로그가 담지 않는 「운영 사실」만 `botId` 로 가리켜 둔다 — **조인은 여기서 하지 않는다**
 * (종전의 `getTeacherBotRows()` 가 그 자리였고, 지금 남은 조인은 `./classbot-bot-policy.ts` 쪽 하나다).
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

/** 봇이 지금 학생에게 열려 있는지 */
export type BotRunState = 'running' | 'paused';

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
