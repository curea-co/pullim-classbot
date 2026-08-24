/**
 * 학생별 대화기록 리포트 · 과정 평가 mock — 관제소(`/teacher/monitor`)와 **같은 학생 명단**을 본다.
 *
 * 이 파일의 존재 이유는 하나다: 관제소에 뜨는 학생별 수치와 학생 리포트에 뜨는 수치가
 * 서로 다른 곳에서 계산되면 반드시 어긋난다. 그래서 두 화면이 읽는 원천을 여기 하나로 모은다.
 *
 *  - 학생 명단·도달 상태·깊이·지름길·마지막 활동  → `classbot-monitoring.ts` (그대로 읽는다)
 *  - 범위 이탈 건수                                → 이 파일의 `scopeExitTable` **하나뿐**
 *
 * 범위 이탈(scope exit) = 봇이 정해진 수업 범위 밖 요청을 받아 되돌린 턴.
 * 대화 기록(`buildTranscript`)에 심는 이탈 턴 수 · 이탈 이력(`buildScopeExitLog`) 길이 ·
 * 관제소 명단의 「이탈 N회」가 전부 `scopeExits()` 한 함수를 통과한다.
 * 어긋나면 `__tests__/classbot-student-report.test.ts` 가 깨진다.
 *
 * 담지 않는 것: 감정·집중도·체류시간. 관제소와 같은 이유 — 지표 타당도가 약하고
 * 학생 수용도 조사에서 선을 넘는다.
 */

import {
  monitoredClass, monitoredRoster, shortcutTries,
  type MonitoredStudent,
} from './classbot-monitoring';

/* ============================================================
 * 1. 범위 이탈 — 두 화면이 함께 읽는 유일한 원천
 * ========================================================== */

/**
 * 학생별 범위 이탈 건수. 이 표가 유일한 원천이다.
 * 다른 곳에서 다시 세지 말고 `scopeExits()` 로만 읽는다.
 */
const scopeExitTable: Record<string, number> = {
  m01: 0, m02: 0, m03: 1, m04: 3, m05: 0,
  m06: 0, m07: 2, m08: 3, m09: 1, m10: 0,
  m11: 0, m12: 2, m13: 0, m14: 1, m15: 1,
  m16: 0, m17: 2, m18: 1, m19: 0, m20: 1,
};

/** 범위 이탈 건수 — 관제소·학생 리포트가 함께 읽는다. */
export function scopeExits(s: MonitoredStudent): number {
  return scopeExitTable[s.id] ?? 0;
}

/** 학급 전체 이탈 합계 */
export const scopeExitTotal = monitoredRoster.reduce((a, s) => a + scopeExits(s), 0);

/* ============================================================
 * 2. 개념 이름표 — roster 의 stuckConcepts id 를 사람이 읽는 말로
 * ========================================================== */

/**
 * `classbot-monitoring.ts` 의 개념 카탈로그는 module-private 라 여기서 이름표를 다시 둔다.
 * id 가 어긋나면 테스트(`모든 stuckConcepts id 가 이름표를 갖는다`)가 깨진다.
 */
const conceptLabels: Record<string, string> = {
  'heat-latent': '숨은열 (녹는열·끓는열)',
  'graph-plateau': '상태 변화 그래프의 평평한 구간',
  'temp-vs-heat': '온도와 열의 구분',
  'particle-motion': '입자의 운동과 배열',
  'boil-vs-evap': '끓음과 증발의 차이',
  'mass-conserve': '상태가 변해도 질량은 그대로',
};

export function conceptLabel(id: string): string {
  return conceptLabels[id] ?? id;
}

/** 개념별 학생 질문 한 줄 — 대화 기록을 그럴듯하게 만드는 재료 */
const conceptAsk: Record<string, string> = {
  'heat-latent': '얼음이 녹는 동안 열을 주는데 왜 온도가 안 올라가요?',
  'graph-plateau': '그래프에서 평평한 구간은 왜 생겨요?',
  'temp-vs-heat': '온도랑 열이 같은 거 아니에요?',
  'particle-motion': '고체일 때 입자는 아예 안 움직이는 거예요?',
  'boil-vs-evap': '끓는 거랑 증발하는 거랑 뭐가 달라요?',
  'mass-conserve': '물이 수증기가 되면 가벼워지는 거 아니에요?',
};

/** 개념별 봇 되묻기 — 답을 주지 않고 되묻는 톤을 지킨다 */
const conceptProbe: Record<string, string> = {
  'heat-latent': '좋은 질문이야. 그 시간 동안 준 열은 어디에 쓰이고 있을까? 입자 사이 거리로 생각해보자.',
  'graph-plateau': '평평하다는 건 무엇이 안 변한다는 뜻일까? 세로축이 무엇인지부터 짚어볼래?',
  'temp-vs-heat': '냄비 물 한 컵과 욕조 물을 같은 온도로 맞추려면 어느 쪽에 열이 더 들까?',
  'particle-motion': '고체 얼음도 온도가 있지. 온도가 있다는 건 입자가 어떤 상태라는 뜻일까?',
  'boil-vs-evap': '빨래가 마르는 것과 물이 끓는 것, 표면에서만 일어나는 건 어느 쪽일까?',
  'mass-conserve': '수증기가 눈에 안 보인다고 사라진 걸까? 뚜껑을 덮고 저울에 올리면 어떻게 될까?',
};

/* ============================================================
 * 3. 대화 기록 (턴 단위)
 * ========================================================== */

export type TurnKind =
  /** 이번 과제 범위 안의 개념 질문·설명 */
  | 'concept'
  /** 답만 달라거나 통째로 붙여넣은 턴 */
  | 'shortcut'
  /** 수업 범위 밖 요청 — 봇이 되돌린 턴 */
  | 'off-topic';

export type TranscriptTurn = {
  id: string;
  /** "14:06" */
  at: string;
  speaker: 'student' | 'bot';
  text: string;
  kind: TurnKind;
  /** 학생 발화가 범위를 벗어난 턴인지 — 이탈 건수는 이 플래그만 센다 */
  offTopic?: boolean;
  /** 이 턴이 다룬 개념 id */
  conceptId?: string;
};

/** 범위 밖 요청 예시 — 처벌 문구가 아니라 「무엇을 요청했는지」만 적는다 */
const offTopicAsks = [
  '이거 말고 어제 축구 경기 얘기해요',
  '국어 수행평가도 좀 도와주면 안 돼요?',
  '오늘 급식 뭔지 알려줘요',
  '그냥 아무 얘기나 하자',
];

/** 봇이 되돌린 말 — 차단이 아니라 되돌리기 톤 */
const offTopicRedirects = [
  '그 얘기는 수업 끝나고 하자. 지금은 상태 변화 그래프 먼저 볼게.',
  '지금은 이번 과제 범위만 도와줄 수 있어. 다시 3번 문제로 돌아가볼까?',
  '그건 이 봇이 다루는 범위 밖이야. 대신 아까 막힌 부분부터 다시 볼래?',
];

const shortcutAsks = [
  '그냥 답만 알려주면 안 돼요?',
  '정답 뭐예요? 시간 없어요',
  '(문제 전체를 붙여넣음) 이거 풀어줘요',
  '(교과서 문장을 통째로 붙여넣음) 이거 그냥 정리해줘요',
];

const shortcutReplies = [
  '답을 바로 주면 다음 문제에서 또 막혀. 대신 첫 줄만 같이 세워보자.',
  '지금 어디까지 생각했는지 한 줄만 적어줄래? 거기서부터 이어가자.',
  '통째로 푸는 대신, 문제에서 묻는 게 무엇인지부터 골라보자.',
];

function clockAt(startMin: number, step: number): string {
  const total = startMin + step * 3;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * 학생 한 명의 대화 기록. 같은 학생이면 언제 불러도 같은 결과가 나온다(난수 없음).
 *
 * 심는 것:
 *  - 이번 단원 기본 질문 1쌍
 *  - 막힌 개념(stuckConcepts) 마다 1쌍
 *  - 지름길 시도 = `shortcutTries(s)` 회
 *  - 범위 이탈 = `scopeExits(s)` 회 (학생 발화에만 offTopic 플래그)
 */
export function buildTranscript(s: MonitoredStudent): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  const startMin = 14 * 60 + 2; // 14:02
  let step = 0;

  const push = (t: Omit<TranscriptTurn, 'id' | 'at'>) => {
    turns.push({ ...t, id: `${s.id}-t${turns.length + 1}`, at: clockAt(startMin, step) });
    step += 1;
  };

  // 이번 단원 기본 질문 — 모든 학생 공통 시작점
  push({
    speaker: 'student',
    kind: 'concept',
    text: `${monitoredClass.unit} 과제 3번 어떻게 시작해요?`,
  });
  push({
    speaker: 'bot',
    kind: 'concept',
    text: '문제에서 온도가 변하는 구간과 안 변하는 구간을 먼저 나눠볼까? 나눈 다음에 이유를 붙여보자.',
  });

  // 막힌 개념
  for (const cid of s.stuckConcepts) {
    push({
      speaker: 'student',
      kind: 'concept',
      conceptId: cid,
      text: conceptAsk[cid] ?? `${conceptLabel(cid)} 부분이 잘 모르겠어요`,
    });
    push({
      speaker: 'bot',
      kind: 'concept',
      conceptId: cid,
      text: conceptProbe[cid] ?? '어디까지 이해했는지 한 줄로 적어줄래? 거기서부터 같이 보자.',
    });
  }

  // 지름길 시도
  for (let i = 0; i < shortcutTries(s); i += 1) {
    push({ speaker: 'student', kind: 'shortcut', text: shortcutAsks[i % shortcutAsks.length] });
    push({ speaker: 'bot', kind: 'shortcut', text: shortcutReplies[i % shortcutReplies.length] });
  }

  // 범위 이탈 — offTopic 플래그는 학생 발화에만 붙는다(이탈 건수의 정의)
  for (let i = 0; i < scopeExits(s); i += 1) {
    push({ speaker: 'student', kind: 'off-topic', offTopic: true, text: offTopicAsks[i % offTopicAsks.length] });
    push({ speaker: 'bot', kind: 'off-topic', text: offTopicRedirects[i % offTopicRedirects.length] });
  }

  push({
    speaker: 'bot',
    kind: 'concept',
    text: '오늘 여기까지. 평평한 구간 이유를 네 말로 한 줄 적어두면 다음 시간에 바로 이어갈 수 있어.',
  });

  return turns;
}

/* ============================================================
 * 4. 이탈 이력 · 주제 분포
 * ========================================================== */

export type ScopeExitEntry = {
  id: string;
  at: string;
  /** 학생이 요청한 것 */
  ask: string;
  /** 봇이 되돌린 방식 */
  handled: string;
};

/** 이탈 이력 — 길이는 항상 `scopeExits(s)` 와 같다(대화 기록에서 그대로 뽑는다). */
export function buildScopeExitLog(s: MonitoredStudent): ScopeExitEntry[] {
  const turns = buildTranscript(s);
  return turns
    .filter(t => t.offTopic)
    .map((t, i) => ({
      id: t.id,
      at: t.at,
      ask: t.text,
      handled: offTopicRedirects[i % offTopicRedirects.length],
    }));
}

export type TopicSlice = {
  kind: TurnKind;
  label: string;
  /** 학생 발화 턴 수 */
  count: number;
  /** 학생 발화 중 비율 (0~100, 반올림) */
  pct: number;
  /** 이 분포를 보고 무엇을 할지 */
  soWhat: string;
};

const topicMeta: Record<TurnKind, { label: string; soWhat: string }> = {
  concept: {
    label: '과제 범위 안 질문',
    soWhat: '이 비중이 낮으면 과제 문항이 너무 어렵거나 너무 쉬운지 본다',
  },
  shortcut: {
    label: '지름길 시도',
    soWhat: '학생을 나무랄 자리가 아니라 문항·프롬프트를 손볼 자리',
  },
  'off-topic': {
    label: '범위 밖 요청',
    soWhat: '반복되면 봇 설정의 이탈 대응 강도를 올린다',
  },
};

/** 대화 주제 분포 — 학생 발화만 센다(봇 답은 학생 행동이 아니다). */
export function buildTopicMix(s: MonitoredStudent): TopicSlice[] {
  const said = buildTranscript(s).filter(t => t.speaker === 'student');
  const kinds: TurnKind[] = ['concept', 'shortcut', 'off-topic'];
  return kinds.map(kind => {
    const count = said.filter(t => t.kind === kind).length;
    return {
      kind,
      label: topicMeta[kind].label,
      count,
      pct: said.length === 0 ? 0 : Math.round((count / said.length) * 100),
      soWhat: topicMeta[kind].soWhat,
    };
  });
}

/* ============================================================
 * 4-b. 막힌 지점 — 「어디서 걸렸나」
 * ========================================================== */

export type StuckPoint = {
  conceptId: string;
  /** 개념 이름 */
  label: string;
  /** 그 개념에서 학생이 실제로 한 질문 */
  ask: string;
  /** 봇이 되짚은 말 — 답을 주지 않고 되묻는 톤 */
  probe: string;
  /** 대화 기록의 그 자리 (시각) */
  at: string;
};

/**
 * 이 학생이 막힌 개념과, 그 개념을 다룬 대화 턴.
 *
 * 원천은 `MonitoredStudent.stuckConcepts` 하나뿐이다 — 학급 「다시 가르칠 개념」이 읽는 값과 같다.
 * 질문·되묻기 문구는 **새로 지어내지 않고** 대화 기록(`buildTranscript`)에서 그대로 뽑는다.
 * 그래서 여기 뜬 말은 대화 기록 뷰어를 열면 같은 시각에 그대로 있다.
 */
export function buildStuckPoints(s: MonitoredStudent): StuckPoint[] {
  const turns = buildTranscript(s);
  return s.stuckConcepts.map(cid => {
    const ask = turns.find(t => t.conceptId === cid && t.speaker === 'student');
    const probe = turns.find(t => t.conceptId === cid && t.speaker === 'bot');
    return {
      conceptId: cid,
      label: conceptLabel(cid),
      ask: ask?.text ?? '',
      probe: probe?.text ?? '',
      at: ask?.at ?? '',
    };
  });
}

/* ============================================================
 * 5. 과정 평가 — 결과물이 아니라 과정을 본다
 * ========================================================== */

export type ProcessCriterion = {
  id: string;
  label: string;
  /** 배점 */
  weight: number;
  /** AI 가 제안한 점수 — 교사가 고치는 출발점 */
  suggested: number;
  /** 왜 이 점수인지 */
  reason: string;
};

/**
 * 과정 평가 항목. 점수는 학생의 깊이·지름길 수치에서 **계산**한다 —
 * 관제소 수치와 따로 노는 숫자를 만들지 않기 위해서다.
 */
export function buildProcessEvaluation(s: MonitoredStudent): ProcessCriterion[] {
  const depthRatio = s.actualDepth / s.targetDepth;
  const tries = shortcutTries(s);
  const scale = (weight: number, ratio: number) =>
    Math.max(0, Math.min(weight, Math.round(weight * ratio)));

  return [
    {
      id: 'ask-quality',
      label: '질문의 구체성',
      weight: 30,
      suggested: scale(30, depthRatio),
      reason: `막힌 지점을 짚어 물은 턴이 ${s.stuckConcepts.length + 1}개예요.`,
    },
    {
      id: 'own-attempt',
      label: '스스로 시도한 흔적',
      weight: 30,
      suggested: scale(30, tries === 0 ? 1 : Math.max(0.4, 1 - tries * 0.12)),
      reason: tries === 0
        ? '답을 바로 요구한 턴이 없어요.'
        : `답을 바로 요구하거나 붙여넣은 턴이 ${tries}회 있어요. 문항 난이도도 함께 보세요.`,
    },
    {
      id: 'revise',
      label: '되짚어 고친 과정',
      weight: 20,
      suggested: scale(20, depthRatio),
      reason: `요구한 수준 ${s.targetDepth}단계 중 ${s.actualDepth}단계까지 닿았어요.`,
    },
    {
      id: 'evidence',
      label: '근거를 들어 설명',
      weight: 20,
      suggested: scale(20, s.reach === 'reached' ? 1 : s.reach === 'partial' ? 0.6 : 0.35),
      reason: `성취기준 도달 상태가 ${s.reach === 'reached' ? '도달' : s.reach === 'partial' ? '부분' : '미도달'}이에요.`,
    },
  ];
}

/* ============================================================
 * 6. 리포트 한 덩어리 · 학생 찾기
 * ========================================================== */

/** 기간 고르기 — 지금은 표시만, 데이터는 같은 스냅샷을 본다 */
export const reportPeriods = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '최근 7일' },
  { value: 'unit', label: '이번 단원' },
] as const;

export type ReportPeriod = (typeof reportPeriods)[number]['value'];

export function isReportPeriod(v: string | undefined): v is ReportPeriod {
  return reportPeriods.some(p => p.value === v);
}

/** 이름순 명단 — 이전/다음 학생 이동의 기준 순서 */
export const reportOrder: MonitoredStudent[] = [...monitoredRoster].sort(
  (a, b) => a.name.localeCompare(b.name, 'ko'),
);

export function findStudent(id: string): MonitoredStudent | undefined {
  return monitoredRoster.find(s => s.id === id);
}

/** 이전/다음 학생 — 끝에서는 undefined */
export function siblingStudents(id: string): {
  prev?: MonitoredStudent;
  next?: MonitoredStudent;
  index: number;
  total: number;
} {
  const index = reportOrder.findIndex(s => s.id === id);
  return {
    prev: index > 0 ? reportOrder[index - 1] : undefined,
    next: index >= 0 && index < reportOrder.length - 1 ? reportOrder[index + 1] : undefined,
    index,
    total: reportOrder.length,
  };
}

export type StudentReport = {
  student: MonitoredStudent;
  classroomLabel: string;
  botName: string;
  unit: string;
  transcript: TranscriptTurn[];
  scopeExitLog: ScopeExitEntry[];
  topicMix: TopicSlice[];
  /** 막힌 개념 + 그 개념을 다룬 대화 턴 */
  stuckPoints: StuckPoint[];
  evaluation: ProcessCriterion[];
  /** 관제소와 같은 값 — 두 화면이 같은 함수를 통과한다 */
  scopeExitCount: number;
  shortcutCount: number;
};

export function buildStudentReport(s: MonitoredStudent): StudentReport {
  return {
    student: s,
    classroomLabel: monitoredClass.classroomLabel,
    botName: monitoredClass.botName,
    unit: monitoredClass.unit,
    transcript: buildTranscript(s),
    scopeExitLog: buildScopeExitLog(s),
    topicMix: buildTopicMix(s),
    stuckPoints: buildStuckPoints(s),
    evaluation: buildProcessEvaluation(s),
    scopeExitCount: scopeExits(s),
    shortcutCount: shortcutTries(s),
  };
}
