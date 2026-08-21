/**
 * 학습 기록 · 성취기준 달성도 mock — `/classbot/me/progress` (SCR-C-30 · FR-C-31).
 *
 * 이 화면이 읽는 데이터는 **전부 여기 한 곳**에서 나온다. 나중에 실제 집계 API 가 생기면
 * `getProgressSnapshot()` 한 함수만 갈아끼우면 화면은 그대로 돌아간다.
 *
 * 주간 리포트(`/classbot/me/report`)와 역할이 다르다 — 그쪽은 한 주를 봇 목소리로 요약하고,
 * 여기는 **성취기준 한 줄 단위**로 파고든다(어떤 기준을 얼마나 했나 · 언제 무엇을 했나).
 * 그래서 두 화면은 같은 숫자를 두 번 보여주지 않는다.
 *
 * 봇 이름·과목은 `lib/mock/classbot.ts` 의 봇 카탈로그를 id 로 참조한다(이름을 다시 적지 않는다).
 */

import { classBots } from './classbot';

/* ─── 기간 ─── */

export type ProgressPeriod = 'week' | 'month' | 'all';

export const PROGRESS_PERIOD_OPTIONS: readonly { value: ProgressPeriod; label: string }[] = [
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'all', label: '전체' },
] as const;

/* ─── 성취기준 달성도 ─── */

/** 성취기준 한 줄에 매기는 세 단계. 학생이 읽는 말로 둔다(도달/미도달 같은 행정 용어 X). */
export type AttainmentLevel = 'good' | 'fair' | 'needs-work';

export const attainmentLabel: Record<AttainmentLevel, string> = {
  good: '잘함',
  fair: '보통',
  'needs-work': '노력 필요',
};

/** 배지 색 — 색 규약(blue/slate + warn) 준수. 초록 신설 없음. */
export const attainmentChipClass: Record<AttainmentLevel, string> = {
  good: 'bg-pullim-blue-100 text-pullim-blue-700',
  fair: 'bg-pullim-slate-100 text-pullim-slate-600',
  'needs-work': 'bg-pullim-warn-bg text-pullim-warn',
};

export interface AchievementStandard {
  id: string;
  /** 「~를 설명하기」 형태 한 줄 — 학생이 그대로 읽는 문장. */
  statement: string;
  botId: string;
  /** 이 기준이 붙은 단원 — `botCurriculum` 의 fullPath 와 같은 결. */
  unitLabel: string;
  level: AttainmentLevel;
  /** 0~100 — 막대 길이. */
  percent: number;
  /** 왜 이 단계인지 한 줄. */
  evidence: string;
}

/* ─── 봇과의 학습 이력 ─── */

export interface LearningTimelineItem {
  id: string;
  botId: string;
  title: string;
  summary: string;
  /** "32분" */
  durationLabel: string;
  /** "오후 4:10" */
  timeLabel: string;
}

export interface LearningTimelineDay {
  /** "8월 14일 (금) · 오늘" */
  dayLabel: string;
  items: LearningTimelineItem[];
}

/* ─── 과제 제출 이력 ─── */

export type SubmissionStatus = 'on-time' | 'late' | 'missing';

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  'on-time': '냈어요',
  late: '늦게 냈어요',
  missing: '안 냈어요',
};

export const submissionStatusChipClass: Record<SubmissionStatus, string> = {
  'on-time': 'bg-pullim-blue-100 text-pullim-blue-700',
  late: 'bg-pullim-warn-bg text-pullim-warn',
  missing: 'bg-pullim-danger-bg text-pullim-danger',
};

export interface SubmissionHistoryRow {
  id: string;
  title: string;
  botId: string;
  /** "고1 공통수학 A반" */
  classroomLabel: string;
  /** "8월 14일" */
  dateLabel: string;
  status: SubmissionStatus;
  /** 선생님이 본 뒤 남긴 것 — 없으면 "기다리는 중". */
  feedbackLabel: string;
}

/* ─── 성장 추이 ─── */

export interface TrendPoint {
  /** "월" / "1주" */
  label: string;
  /** 평균 성취도 0~100 */
  value: number;
}

/* ─── 스냅샷 ─── */

export interface ProgressSnapshot {
  /** "8월 10일 ~ 8월 14일 · 이번 주" */
  rangeLabel: string;
  /** 상단 숫자 4개 */
  summary: {
    studyTimeLabel: string;
    doneCountLabel: string;
    botTurnLabel: string;
    avgAttainmentLabel: string;
  };
  standards: AchievementStandard[];
  timeline: LearningTimelineDay[];
  /** "이번 주 6번 학습했어요" */
  timelineMeta: string;
  submissions: SubmissionHistoryRow[];
  /** "이번 주 4건" */
  submissionsMeta: string;
  trend: {
    points: TrendPoint[];
    /** "최근 7일 평균 성취도예요." */
    caption: string;
    /** "+11%p" */
    deltaLabel: string;
  };
}

/** 봇 id → 표시 이름·과목 (카탈로그 단일 출처). 미상 봇도 화면이 깨지지 않게 폴백. */
export function progressBotFace(botId: string): { name: string; subject: string; avatarEmoji: string } {
  const bot = classBots.find(b => b.id === botId);
  return {
    name: bot?.name ?? '봇',
    subject: bot?.subject ?? '',
    avatarEmoji: bot?.avatarEmoji ?? '🤖',
  };
}

/* ============================================================
 * 기간별 더미 3세트 — 숫자는 기간이 넓어질수록 커지도록 맞춰 뒀다.
 * ========================================================== */

const WEEK: ProgressSnapshot = {
  rangeLabel: '8월 10일 ~ 8월 14일 · 이번 주',
  summary: {
    studyTimeLabel: '4시간 20분',
    doneCountLabel: '7건',
    botTurnLabel: '38번',
    avgAttainmentLabel: '71%',
  },
  standards: [
    {
      id: 'std_sci_state',
      statement: '물질의 상태 변화를 설명하기',
      botId: 'cb_003',
      unitLabel: '통합과학 · 에너지',
      level: 'good',
      percent: 84,
      evidence: '숨은열로 온도가 그대로인 까닭을 스스로 설명했어요.',
    },
    {
      id: 'std_sci_graph',
      statement: '실험 결과를 표와 그래프로 나타내기',
      botId: 'cb_003',
      unitLabel: '통합과학 · 힘과 운동',
      level: 'fair',
      percent: 62,
      evidence: '표까지는 잘 만들고, 그래프 축 이름을 자주 빠뜨려요.',
    },
    {
      id: 'std_math_extremum',
      statement: '이차함수의 최댓값·최솟값을 찾고 까닭 대기',
      botId: 'cb_001',
      unitLabel: '공통수학1 · 이차함수 · 최댓값과 최솟값',
      level: 'good',
      percent: 81,
      evidence: '꼭짓점 좌표를 세 문항 연속으로 맞게 구했어요.',
    },
    {
      id: 'std_math_inflection',
      statement: '함수의 증가와 감소를 그래프로 보이기',
      botId: 'cb_001',
      unitLabel: '공통수학2 · 함수와 그래프 · 증가와 감소',
      level: 'needs-work',
      percent: 41,
      evidence: '꼭짓점 좌표를 구하는 단계에서 자주 막혀요. 같은 패턴 5문항이 처방돼 있어요.',
    },
    {
      id: 'std_kor_summary',
      statement: '중심 내용을 한 문장으로 요약하기',
      botId: 'cb_004',
      unitLabel: '비문학 · 주제 추론',
      level: 'fair',
      percent: 66,
      evidence: '문단 요약은 되는데 글 전체를 한 문장으로 줄일 때 길어져요.',
    },
  ],
  timelineMeta: '이번 주 6번 학습했어요',
  timeline: [
    {
      dayLabel: '8월 14일 (금) · 오늘',
      items: [
        {
          id: 'tl_w1', botId: 'cb_003',
          title: '상태 변화와 열에너지 정리',
          summary: '얼음이 녹을 때 온도가 그대로인 까닭을 예시로 설명했어요.',
          durationLabel: '32분', timeLabel: '오후 4:10',
        },
        {
          id: 'tl_w2', botId: 'cb_001',
          title: '최댓값·최솟값 판정 연습',
          summary: '꼭짓점을 찾아 최댓값·최솟값을 가려냈어요.',
          durationLabel: '18분', timeLabel: '오후 7:25',
        },
      ],
    },
    {
      dayLabel: '8월 13일 (목)',
      items: [
        {
          id: 'tl_w3', botId: 'cb_003',
          title: '끓는점과 압력',
          summary: '높은 산에서 밥이 설익는 까닭을 스스로 찾았어요.',
          durationLabel: '41분', timeLabel: '오후 5:02',
        },
        {
          id: 'tl_w4', botId: 'cb_004',
          title: '설명하는 글 요약',
          summary: '문단마다 중심 문장을 골라 한 줄로 줄였어요.',
          durationLabel: '34분', timeLabel: '오후 8:15',
        },
      ],
    },
    {
      dayLabel: '8월 11일 (화)',
      items: [
        {
          id: 'tl_w5', botId: 'cb_001',
          title: '증가·감소 구간 찾기',
          summary: '그래프가 꺾이는 지점을 두 번 놓쳤어요.',
          durationLabel: '45분', timeLabel: '오후 5:30',
        },
        {
          id: 'tl_w6', botId: 'cb_002',
          title: '빈칸 추론 7유형',
          summary: '연결어 단서로 답을 좁히는 순서를 익혔어요.',
          durationLabel: '15분', timeLabel: '오후 9:05',
        },
      ],
    },
  ],
  submissionsMeta: '이번 주 4건',
  submissions: [
    { id: 'sh_w1', title: '상태 변화와 열에너지 정리하기', botId: 'cb_003', classroomLabel: '고1 통합과학', dateLabel: '8월 14일', status: 'on-time', feedbackLabel: '확인함 · “설명이 또렷해요”' },
    { id: 'sh_w2', title: '빈칸 추론 7유형 훈련', botId: 'cb_002', classroomLabel: '고1 영어 B반', dateLabel: '8월 13일', status: 'on-time', feedbackLabel: '확인함' },
    { id: 'sh_w3', title: '설명하는 글 요약해 보기', botId: 'cb_004', classroomLabel: '고1 국어 A반', dateLabel: '8월 12일', status: 'late', feedbackLabel: '기다리는 중' },
    { id: 'sh_w4', title: '이차함수 최적화 20문항', botId: 'cb_001', classroomLabel: '고1 공통수학 A반', dateLabel: '8월 11일', status: 'on-time', feedbackLabel: '확인함 · “풀이 과정 좋아요”' },
  ],
  trend: {
    points: [
      { label: '월', value: 62 }, { label: '화', value: 65 }, { label: '수', value: 64 },
      { label: '목', value: 69 }, { label: '금', value: 71 }, { label: '토', value: 70 },
      { label: '일', value: 73 },
    ],
    caption: '최근 7일 평균 성취도예요.',
    deltaLabel: '+11%p',
  },
};

const MONTH: ProgressSnapshot = {
  rangeLabel: '8월 1일 ~ 8월 14일 · 이번 달',
  summary: {
    studyTimeLabel: '18시간 10분',
    doneCountLabel: '26건',
    botTurnLabel: '152번',
    avgAttainmentLabel: '74%',
  },
  standards: [
    { id: 'std_sci_state', statement: '물질의 상태 변화를 설명하기', botId: 'cb_003', unitLabel: '통합과학 · 에너지', level: 'good', percent: 79, evidence: '두 주 연속으로 까닭까지 적어 냈어요.' },
    { id: 'std_sci_graph', statement: '실험 결과를 표와 그래프로 나타내기', botId: 'cb_003', unitLabel: '통합과학 · 힘과 운동', level: 'fair', percent: 65, evidence: '축 이름 빠뜨리는 실수가 4번에서 2번으로 줄었어요.' },
    { id: 'std_math_extremum', statement: '이차함수의 최댓값·최솟값을 찾고 까닭 대기', botId: 'cb_001', unitLabel: '공통수학1 · 이차함수 · 최댓값과 최솟값', level: 'good', percent: 77, evidence: '이번 달 최댓값 문항 정답률이 가장 높아요.' },
    { id: 'std_math_inflection', statement: '함수의 증가와 감소를 그래프로 보이기', botId: 'cb_001', unitLabel: '공통수학2 · 함수와 그래프 · 증가와 감소', level: 'needs-work', percent: 48, evidence: '아직 그래프 개형 단계에서 멈춰요.' },
    { id: 'std_kor_summary', statement: '중심 내용을 한 문장으로 요약하기', botId: 'cb_004', unitLabel: '비문학 · 주제 추론', level: 'fair', percent: 70, evidence: '요약 길이가 점점 짧아지고 있어요.' },
    { id: 'std_eng_blank', statement: '연결어 단서로 빈칸 채우기', botId: 'cb_002', unitLabel: '수능 영어 · 빈칸 추론 7유형', level: 'fair', percent: 64, evidence: '역접 단서는 잘 잡고, 예시 단서에서 흔들려요.' },
  ],
  timelineMeta: '이번 달 24번 학습했어요 · 최근 5건',
  timeline: [
    {
      dayLabel: '8월 14일 (금) · 오늘',
      items: [
        { id: 'tl_m1', botId: 'cb_003', title: '상태 변화와 열에너지 정리', summary: '얼음이 녹을 때 온도가 그대로인 까닭을 예시로 설명했어요.', durationLabel: '32분', timeLabel: '오후 4:10' },
        { id: 'tl_m2', botId: 'cb_001', title: '최댓값·최솟값 판정 연습', summary: '꼭짓점을 찾아 최댓값·최솟값을 가려냈어요.', durationLabel: '18분', timeLabel: '오후 7:25' },
      ],
    },
    {
      dayLabel: '8월 8일 (금)',
      items: [
        { id: 'tl_m3', botId: 'cb_004', title: '근거 따져 읽기', summary: '주장과 근거를 나눠 표로 정리했어요.', durationLabel: '38분', timeLabel: '오후 6:20' },
        { id: 'tl_m4', botId: 'cb_005', title: '자료로 의견 말하기', summary: '그래프에서 읽은 사실과 내 의견을 나눠 적었어요.', durationLabel: '26분', timeLabel: '오후 8:40' },
      ],
    },
    {
      dayLabel: '8월 5일 (화)',
      items: [
        { id: 'tl_m5', botId: 'cb_003', title: '녹는점으로 물질 구분', summary: '표를 보고 미지 물질 세 개를 골라냈어요.', durationLabel: '44분', timeLabel: '오후 5:10' },
      ],
    },
  ],
  submissionsMeta: '이번 달 6건 · 최근 순',
  submissions: [
    { id: 'sh_m1', title: '상태 변화와 열에너지 정리하기', botId: 'cb_003', classroomLabel: '고1 통합과학', dateLabel: '8월 14일', status: 'on-time', feedbackLabel: '확인함 · “설명이 또렷해요”' },
    { id: 'sh_m2', title: '빈칸 추론 7유형 훈련', botId: 'cb_002', classroomLabel: '고1 영어 B반', dateLabel: '8월 13일', status: 'on-time', feedbackLabel: '확인함' },
    { id: 'sh_m3', title: '설명하는 글 요약해 보기', botId: 'cb_004', classroomLabel: '고1 국어 A반', dateLabel: '8월 12일', status: 'late', feedbackLabel: '기다리는 중' },
    { id: 'sh_m4', title: '이차함수 최적화 20문항', botId: 'cb_001', classroomLabel: '고1 공통수학 A반', dateLabel: '8월 11일', status: 'on-time', feedbackLabel: '확인함 · “풀이 과정 좋아요”' },
    { id: 'sh_m5', title: '현대사회의 쟁점 자료 정리', botId: 'cb_005', classroomLabel: '고1 통합사회 A반', dateLabel: '8월 7일', status: 'on-time', feedbackLabel: '확인함' },
    { id: 'sh_m6', title: '녹는점 실험 결과 정리', botId: 'cb_003', classroomLabel: '고1 통합과학', dateLabel: '8월 5일', status: 'on-time', feedbackLabel: '확인함 · “표가 깔끔해요”' },
  ],
  trend: {
    points: [
      { label: '1주', value: 63 }, { label: '2주', value: 67 },
      { label: '3주', value: 70 }, { label: '4주', value: 74 },
    ],
    caption: '이번 달 주차별 평균 성취도예요.',
    deltaLabel: '+11%p',
  },
};

const ALL: ProgressSnapshot = {
  rangeLabel: '3월 4일 ~ 8월 14일 · 전체',
  summary: {
    studyTimeLabel: '62시간 40분',
    doneCountLabel: '88건',
    botTurnLabel: '517번',
    avgAttainmentLabel: '76%',
  },
  standards: [
    { id: 'std_sci_state', statement: '물질의 상태 변화를 설명하기', botId: 'cb_003', unitLabel: '통합과학 · 에너지', level: 'good', percent: 88, evidence: '처음 만났을 때보다 30%p 올랐어요.' },
    { id: 'std_sci_graph', statement: '실험 결과를 표와 그래프로 나타내기', botId: 'cb_003', unitLabel: '통합과학 · 힘과 운동', level: 'good', percent: 76, evidence: '봄에는 노력 필요였는데 이제 안정적이에요.' },
    { id: 'std_math_extremum', statement: '이차함수의 최댓값·최솟값을 찾고 까닭 대기', botId: 'cb_001', unitLabel: '공통수학1 · 이차함수 · 최댓값과 최솟값', level: 'good', percent: 82, evidence: '가장 오래 붙잡고 있던 기준이고, 지금은 가장 잘해요.' },
    { id: 'std_math_inflection', statement: '함수의 증가와 감소를 그래프로 보이기', botId: 'cb_001', unitLabel: '공통수학2 · 함수와 그래프 · 증가와 감소', level: 'fair', percent: 58, evidence: '5월 이후로 조금씩 올라오고 있어요.' },
    { id: 'std_kor_summary', statement: '중심 내용을 한 문장으로 요약하기', botId: 'cb_004', unitLabel: '비문학 · 주제 추론', level: 'good', percent: 78, evidence: '요약이 길어지는 버릇을 고쳤어요.' },
    { id: 'std_eng_blank', statement: '연결어 단서로 빈칸 채우기', botId: 'cb_002', unitLabel: '수능 영어 · 빈칸 추론 7유형', level: 'fair', percent: 69, evidence: '유형별로 편차가 있어요.' },
    { id: 'std_social_evidence', statement: '자료를 근거로 내 의견 말하기', botId: 'cb_005', unitLabel: '사회 · 현대사회의 쟁점', level: 'needs-work', percent: 45, evidence: '사실과 의견을 나누는 연습이 더 필요해요.' },
  ],
  timelineMeta: '지금까지 137번 학습했어요 · 기억에 남는 5건',
  timeline: [
    {
      dayLabel: '8월 14일 (금) · 오늘',
      items: [
        { id: 'tl_a1', botId: 'cb_003', title: '상태 변화와 열에너지 정리', summary: '얼음이 녹을 때 온도가 그대로인 까닭을 예시로 설명했어요.', durationLabel: '32분', timeLabel: '오후 4:10' },
      ],
    },
    {
      dayLabel: '7월 18일 (토)',
      items: [
        { id: 'tl_a2', botId: 'cb_001', title: '이차함수 단원 마무리', summary: '부호 실수를 세 번 고치고 다 맞혔어요.', durationLabel: '52분', timeLabel: '오전 10:30' },
        { id: 'tl_a3', botId: 'cb_004', title: '독서 감상문 쓰기', summary: '첫 문단을 세 번 고쳐 쓰며 도입을 다듬었어요.', durationLabel: '47분', timeLabel: '오후 3:20' },
      ],
    },
    {
      dayLabel: '3월 4일 (수)',
      items: [
        { id: 'tl_a4', botId: 'cb_003', title: '첫 학습 — 물질의 성질', summary: '풀림 클래스봇에서 처음 나눈 대화예요.', durationLabel: '21분', timeLabel: '오후 4:45' },
        { id: 'tl_a5', botId: 'cb_005', title: '지도 읽기 첫걸음', summary: '축척과 방위를 익혔어요.', durationLabel: '19분', timeLabel: '오후 7:10' },
      ],
    },
  ],
  submissionsMeta: '전체 88건 · 최근 6건',
  submissions: [
    { id: 'sh_a1', title: '상태 변화와 열에너지 정리하기', botId: 'cb_003', classroomLabel: '고1 통합과학', dateLabel: '8월 14일', status: 'on-time', feedbackLabel: '확인함 · “설명이 또렷해요”' },
    { id: 'sh_a2', title: '빈칸 추론 7유형 훈련', botId: 'cb_002', classroomLabel: '고1 영어 B반', dateLabel: '8월 13일', status: 'on-time', feedbackLabel: '확인함' },
    { id: 'sh_a3', title: '설명하는 글 요약해 보기', botId: 'cb_004', classroomLabel: '고1 국어 A반', dateLabel: '8월 12일', status: 'late', feedbackLabel: '기다리는 중' },
    { id: 'sh_a4', title: '이차함수 최적화 20문항', botId: 'cb_001', classroomLabel: '고1 공통수학 A반', dateLabel: '8월 11일', status: 'on-time', feedbackLabel: '확인함 · “풀이 과정 좋아요”' },
    { id: 'sh_a5', title: '현대사회의 쟁점 자료 정리', botId: 'cb_005', classroomLabel: '고1 통합사회 A반', dateLabel: '7월 21일', status: 'missing', feedbackLabel: '기한 지남' },
    { id: 'sh_a6', title: '이차함수 단원 마무리', botId: 'cb_001', classroomLabel: '고1 공통수학 A반', dateLabel: '7월 18일', status: 'on-time', feedbackLabel: '확인함 · “많이 늘었어요”' },
  ],
  trend: {
    points: [
      { label: '1주', value: 51 }, { label: '2주', value: 55 }, { label: '3주', value: 58 },
      { label: '4주', value: 57 }, { label: '5주', value: 62 }, { label: '6주', value: 66 },
      { label: '7주', value: 70 }, { label: '8주', value: 76 },
    ],
    caption: '최근 8주 평균 성취도예요.',
    deltaLabel: '+25%p',
  },
};

const BY_PERIOD: Record<ProgressPeriod, ProgressSnapshot> = {
  week: WEEK,
  month: MONTH,
  all: ALL,
};

/**
 * 기간 하나의 학습 기록 전부.
 *
 * **화면은 이 함수 하나만 부른다** — 실 집계 API(`GET /api/me/progress?period=…`)가 생기면
 * 여기 반환값 모양만 맞춰 갈아끼우면 된다.
 * @param period - 이번 주 / 이번 달 / 전체
 */
export function getProgressSnapshot(period: ProgressPeriod): ProgressSnapshot {
  return BY_PERIOD[period];
}
