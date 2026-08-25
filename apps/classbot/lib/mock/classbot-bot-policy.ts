/**
 * 봇 관리(`/teacher/bots` 목록 → `/teacher/bots/[botId]` 봇별 설정) mock — 봇 운영 규칙.
 *
 * 지금은 껍데기 화면이라 **실제로 보이는 것은 두 가지**만 담는다.
 *  ① 안전 등급(L1~L5) 시간대 스케줄 — 수업 중과 밤에 봇이 답하는 범위가 달라야 한다
 *  ② 이탈 대응 강도 — 범위 밖 요청을 봇이 어떻게 되돌릴지
 * 나머지 탭은 자리만 잡고 「준비 중」으로 둔다.
 *
 * 안전 등급 단계 이름은 `./tutor` 의 `scopeMeta` 를 그대로 쓴다 — 등급 이름을 두 곳에 두지 않는다.
 */

import { classBots, type ClassBot } from './classbot';
import { teacherBotOps } from './classbot-teacher-ops';
import type { ScopeLevel } from './tutor';

/** 설정 탭 — ready=false 는 껍데기(준비 중) */
export type BotPolicyTab = {
  value: string;
  label: string;
  ready: boolean;
  /** 준비 중 탭에 적을 한 줄 — 나중에 무엇이 들어올 자리인지 */
  placeholder?: string;
};

export const botPolicyTabs: BotPolicyTab[] = [
  { value: 'safety', label: '안전 등급', ready: true },
  { value: 'drift', label: '이탈 대응', ready: true },
  {
    value: 'identity',
    label: '봇 이름·말투',
    ready: false,
    placeholder: '봇 이름과 말투, 첫 인사말을 고치는 자리예요.',
  },
  {
    value: 'material',
    label: '수업 자료',
    ready: false,
    placeholder: '봇이 참고할 수업 자료를 올리고 단원에 묶는 자리예요.',
  },
  {
    value: 'evaluation',
    label: '평가 규칙',
    ready: false,
    placeholder: '과정 평가 항목과 배점을 정하는 자리예요.',
  },
  {
    value: 'notify',
    label: '알림',
    ready: false,
    placeholder: '무엇이 생겼을 때 선생님께 알릴지 정하는 자리예요.',
  },
];

export function isBotPolicyTab(v: string | undefined): boolean {
  return botPolicyTabs.some(t => t.value === v);
}

/* ── ① 안전 등급 시간대 스케줄 ─────────────────────────────── */

export type SafetySlot = {
  id: string;
  /** "08:00" */
  from: string;
  to: string;
  scope: ScopeLevel;
  /** 이 시간대를 이렇게 둔 이유 */
  why: string;
};

/**
 * 시간대별 안전 등급. 수업 중에는 좁게, 밤에는 넓게 두는 것이 기본 모양이다.
 * (밤에 좁게 두면 학생이 봇 대신 다른 데로 나간다는 것이 운영 쪽 판단.)
 *
 * ⚠ 봇마다 다른 스케줄이 아직 없다 — **데모 기본값 한 벌을 모든 봇이 같이 본다.**
 * 아래 이탈 대응 강도도 마찬가지다. 봇별로 갈라지는 것은 BE 가 붙을 때이고,
 * 그전에 봇 수만큼 값을 지어내면 화면이 사실이 아닌 것을 말하게 된다.
 */
export const safetySchedule: SafetySlot[] = [
  { id: 'slot-class',   from: '08:00', to: '15:00', scope: 1, why: '수업 시간 — 올린 자료와 이번 단원 안에서만' },
  { id: 'slot-after',   from: '15:00', to: '19:00', scope: 3, why: '방과 후 — 과목 전체 범위로 풀어 둠' },
  { id: 'slot-evening', from: '19:00', to: '22:00', scope: 3, why: '저녁 자습 — 방과 후와 같게' },
  { id: 'slot-night',   from: '22:00', to: '08:00', scope: 5, why: '밤 — 넓게 두되 유해 내용 거르기는 항상 켜짐' },
];

/** 시험 기간에 통째로 덮어쓰는 등급 */
export const examOverride = {
  enabled: false,
  scope: 1 as ScopeLevel,
  note: '시험 기간에는 시간대 설정을 무시하고 L1 로 고정돼요.',
};

/* ── ② 이탈 대응 강도 ──────────────────────────────────────── */

export type DriftLevel = {
  value: 'soft' | 'firm' | 'block';
  label: string;
  description: string;
  /** 봇이 실제로 하는 말 */
  example: string;
};

export const driftLevels: DriftLevel[] = [
  {
    value: 'soft',
    label: '부드럽게 되돌리기',
    description: '한 번은 받아주고 바로 과제로 되돌려요.',
    example: '그 얘기는 수업 끝나고 하자. 지금은 3번 문제 먼저 볼게.',
  },
  {
    value: 'firm',
    label: '알린 뒤 되돌리기',
    description: '범위 밖이라고 알려주고 되돌려요. 반복되면 선생님께 표시돼요.',
    example: '지금은 이번 과제 범위만 도와줄 수 있어. 아까 막힌 부분부터 다시 볼래?',
  },
  {
    value: 'block',
    label: '바로 끊기',
    description: '범위 밖 요청에는 답하지 않아요. 시험 기간에 쓰는 강도예요.',
    example: '이 요청에는 답할 수 없어. 과제 문항으로 돌아가자.',
  },
];

export const currentDriftLevel: DriftLevel['value'] = 'firm';

/** 이탈이 이만큼 쌓이면 선생님께 표시 */
export const driftAlertThreshold = 3;

/* ── 봇 관리 목록·상세가 읽는 봇 한 줄 ──────────────── */

/**
 * 봇 관리 화면이 봇 하나를 가리킬 때 읽는 것.
 *
 * 값은 전부 카탈로그(`./classbot` 의 `classBots`)와 운영 기록
 * (`./classbot-teacher-ops` 의 `teacherBotOps`)이 이미 아는 것만 옮겨 담는다 —
 * **없는 값을 지어내지 않는다.**
 *
 * 담지 않는 것:
 *  - 운영 중·멈춤·등록 인원·낸 과제 — 「지금 잘 돌고 있나」는 운영 화면(`/teacher/classbot`) 몫이다.
 *    봇 관리는 「이 봇을 어떻게 굴릴까」만 본다.
 *  - 마지막 변경 시각·사람 — 봇마다 다른 값이 없다. 한 개를 모든 봇에 돌려 쓰면 거짓말이 된다.
 */
export type ManagedBot = {
  botId: string;
  botName: string;
  avatarEmoji: string;
  subject: string;
  grade: string;
  tone: ClassBot['tone'];
  /** 지금 안전 등급 — 카탈로그가 권위 */
  scope: ScopeLevel;
  teacherName: string;
  /** 붙어 있는 학급 이름 — 아직 안 붙였으면 빈 배열. 상세 헤더에서 「어느 반의 규칙인가」를 읽힌다 */
  classroomLabels: string[];
};

function toManagedBot(bot: ClassBot): ManagedBot {
  const ops = teacherBotOps.find(o => o.botId === bot.id);
  return {
    botId: bot.id,
    botName: bot.name,
    avatarEmoji: bot.avatarEmoji,
    subject: bot.subject,
    grade: bot.grade,
    tone: bot.tone,
    scope: bot.scope,
    teacherName: bot.teacherName,
    classroomLabels: ops?.classrooms.map(c => c.label) ?? [],
  };
}

/** 봇 관리 목록 — 카탈로그 순서 그대로. 운영 화면의 봇 줄과 같은 순서다 */
export function getManagedBots(): ManagedBot[] {
  return classBots.map(toManagedBot);
}

/** 봇 하나 — 카탈로그에 없는 id 면 undefined (상세 페이지가 404 로 보낸다) */
export function getManagedBot(botId: string): ManagedBot | undefined {
  const bot = classBots.find(b => b.id === botId);
  return bot && toManagedBot(bot);
}
