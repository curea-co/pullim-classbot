/**
 * 풀림 클래스봇 — 학생/교사 뷰 mock.
 * 07_풀림_클래스봇_핸드오프.md 기반.
 */

import type { ScopeLevel } from './tutor';
import type { ClassbotQuickPrompt } from './chat';

export type ClassBot = {
  id: string;
  name: string;          // 교사가 자유 설정 ("수학이 형")
  /** 학생 UI 아바타 — 봇 정체성 시각화 */
  avatarEmoji: string;
  teacherName: string;
  /** 학원·학교·온라인 강사 */
  organization: string;
  subject: string;
  grade: string;
  /** 캐릭터 톤 — 차분은 단계화·분석적 존댓말, 열정은 에너지·동기부여형 반말 */
  tone: '정중' | '친근' | '스파르타' | '차분' | '열정';
  /** 첫 인삿말 — 봇 voice 그대로 한 단락. tone과 일관되게 작성. */
  greeting: string;
  /** 학생 채팅 패널의 quick prompt 버튼 4개. 봇 과목/voice에 맞게 작성. */
  quickPrompts: ClassbotQuickPrompt[];
  scope: ScopeLevel;
  /** 라이브 수업 진행 여부 */
  isLive: boolean;
  /** 현재 진행 중인 수업 정보 */
  currentLesson?: {
    title: string;
    chapter: string;
    startedAt: string;       // "HH:MM"
    durationMin: number;
    studentCount: number;
  };
  enrolledCount: number;
};

/**
 * 학생 enrollment — 어떤 봇에 어떤 반으로 배정됐는지.
 * 핸드오프 Flow A 5단계 "반 선택 → 배포"의 결과.
 * 등록 주체는 항상 교사 (학생 자발 등록은 v2 공식 봇 마켓).
 */
export type StudentEnrollment = {
  botId: string;
  classroomId: string;
  classroomLabel: string;       // "고2 미적분 A반" — 학생 UI 노출
  /** 봇을 만들고 학생을 배정한 사람 */
  assignedBy: string;           // "김수학 선생님"
  assignedAt: string;           // "2026-03-04 17:20"
  /** 학생 시점 별명 — 학원 등 */
  via: string;                  // "대치프리미엄 수학학원"
};

/** 마스터 봇 카탈로그 — 서연 학생 시점에서 보이는 3봇 */
export const classBots: ClassBot[] = [
  {
    id: 'cb_001',
    name: '수학이 형',
    avatarEmoji: '🧑‍🏫',
    teacherName: '김수학 선생님',
    organization: '대치프리미엄 수학학원',
    subject: '수학Ⅱ',
    grade: '고2',
    tone: '친근',
    greeting:
      '서연 안녕! 수학이 형이야 🙌 오늘 미적분 III장 진행 중인데 궁금한 거 있으면 편하게 물어봐. ' +
      'Scope L3라서 개념 설명까지 도와줄 수 있어. 답은 직접 알려주진 않을 거지만, 길은 알려줄게.',
    quickPrompts: [
      { text: '극값 어떻게 찾아요?',         expectedReplyKey: 'extremum' },
      { text: '오늘 수업 요약해줘요',         expectedReplyKey: 'today_summary' },
      { text: '4월 학평 대비 뭐 해야 해요?', expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 거예요?',       expectedReplyKey: 'reassurance' },
    ],
    scope: 3,
    isLive: true,
    currentLesson: {
      title: '도함수의 활용 — 극값과 변곡점',
      chapter: '미적분 III장',
      startedAt: '19:00',
      durationMin: 50,
      studentCount: 14,
    },
    enrolledCount: 18,
  },
  {
    id: 'cb_002',
    name: '영어 누나',
    avatarEmoji: '👩‍🏫',
    teacherName: '박영어 선생님',
    organization: '대치프리미엄 수학학원',
    subject: '영어',
    grade: '고2',
    tone: '정중',
    greeting:
      '서연 안녕하세요. 영어 누나예요. 오늘 빈칸 추론 7유형 진행 중인데, 막힌 문장 있으면 가져와봐요. ' +
      'Scope L4라서 풀이 단계까지는 잡아줄 수 있어요.',
    quickPrompts: [
      { text: '빈칸 추론 어떻게 풀어요?', expectedReplyKey: 'blank_inference' },
      { text: '오늘 수업 요약해줘요',     expectedReplyKey: 'today_summary' },
      { text: '수능까지 뭐 해야 해요?',   expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 거예요?',   expectedReplyKey: 'reassurance' },
    ],
    scope: 4,
    isLive: true,
    currentLesson: {
      title: '빈칸 추론 — 접속사 논리 관계',
      chapter: '수능 빈칸 7유형',
      startedAt: '20:00',
      durationMin: 50,
      studentCount: 11,
    },
    enrolledCount: 12,
  },
  {
    id: 'cb_003',
    name: '과학 쌤',
    avatarEmoji: '🧑‍🔬',
    teacherName: '정과학 선생님',
    organization: '서울 모 고등학교',
    subject: '통합과학',
    grade: '고1',          // 고1 때 같이 했던 학교 봇 — 복습용 유지
    tone: '스파르타',
    greeting:
      '서연. 과학 쌤이다. 학교 1학년 때 통합과학 진도 복습용으로 남겨놨어. ' +
      'Scope L3 — 개념 설명까진 해줄게. 답은 직접 풀어.',
    quickPrompts: [
      { text: '전기회로 어디부터?',     expectedReplyKey: 'circuit' },
      { text: '오늘 수업 요약',         expectedReplyKey: 'today_summary' },
      { text: '내신 대비 뭐 해야 해?',  expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 거예요?', expectedReplyKey: 'reassurance' },
    ],
    scope: 3,
    isLive: false,
    enrolledCount: 17,
  },
  {
    id: 'cb_004',
    name: '국어 누나',
    avatarEmoji: '👩‍💼',
    teacherName: '최국어 선생님',
    organization: '대치프리미엄 수학학원',
    subject: '국어',
    grade: '고2',
    tone: '차분',
    greeting:
      '서연 학생, 안녕하세요. 국어 누나예요. 오늘 비문학 독해 — 주장과 근거 추적을 진행했어요. ' +
      '막힌 문장이 있으면 단락 번호로 알려주세요. 단계별로 같이 풀어드릴게요. Scope L4 — 풀이 단계까지는 함께 잡아드립니다.',
    quickPrompts: [
      { text: '비문학 주제 어떻게 잡아요?', expectedReplyKey: 'reading_inference' },
      { text: '오늘 수업 요약해줘요',         expectedReplyKey: 'today_summary' },
      { text: '6월 모평 대비 뭐 해야 해요?', expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 거예요?',       expectedReplyKey: 'reassurance' },
    ],
    scope: 4,
    isLive: false,
    enrolledCount: 16,
  },
  {
    id: 'cb_005',
    name: '사회 코치',
    avatarEmoji: '🧑‍🎓',
    teacherName: '강사회 선생님',
    organization: '대치프리미엄 수학학원',
    subject: '사회',
    grade: '고2',
    tone: '열정',
    greeting:
      '서연아! 사회 코치야 🔥 오늘 현대사회 쟁점 — 갈등 사례 분석 진도 나갔지? 막힌 부분 있으면 지금 바로 들고와. ' +
      'Scope L3라서 개념은 진짜 빡세게 잡아줄게. 답은 네가 풀어내는 거야. 가보자!',
    quickPrompts: [
      { text: '시사 이슈 어떻게 분석해요?', expectedReplyKey: 'social_inference' },
      { text: '오늘 수업 요약해줘요',         expectedReplyKey: 'today_summary' },
      { text: '6월 모평 대비 뭐 해야 해요?', expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 거예요?',       expectedReplyKey: 'reassurance' },
    ],
    scope: 3,
    isLive: false,
    enrolledCount: 14,
  },
];

/** 서연 학생의 enrollment — 5봇 모두 등록 (각각 다른 경로로 배정됨) */
export const studentEnrollments: StudentEnrollment[] = [
  {
    botId: 'cb_001',
    classroomId: 'cr_math_a',
    classroomLabel: '고2 미적분 A반',
    assignedBy: '김수학 선생님',
    assignedAt: '2026-03-04 17:20',
    via: '대치프리미엄 수학학원',
  },
  {
    botId: 'cb_002',
    classroomId: 'cr_eng_b',
    classroomLabel: '고2 영어독해 B반',
    assignedBy: '박영어 선생님',
    assignedAt: '2026-03-04 17:22',
    via: '대치프리미엄 수학학원',
  },
  {
    botId: 'cb_003',
    classroomId: 'cr_sci_2024',
    classroomLabel: '1학년 6반 통합과학',
    assignedBy: '정과학 선생님',
    assignedAt: '2025-03-02 09:00',
    via: '서울 모 고등학교',
  },
  {
    botId: 'cb_004',
    classroomId: 'cr_kor_a',
    classroomLabel: '고2 비문학독해 A반',
    assignedBy: '최국어 선생님',
    assignedAt: '2026-04-08 17:30',
    via: '대치프리미엄 수학학원',
  },
  {
    botId: 'cb_005',
    classroomId: 'cr_soc_a',
    classroomLabel: '고2 사회 A반',
    assignedBy: '강사회 선생님',
    assignedAt: '2026-05-12 09:00',
    via: '대치프리미엄 수학학원',
  },
];

/**
 * 봇별 단원 트리 — 과제 생성 시 단원 드롭다운 선택지.
 * spec 14 § 7.2.
 */
export type BotCurriculumUnit = {
  id: string;
  label: string;
  /** "미적분 III · 도함수의 활용 · 극값" 등 3-depth full path */
  fullPath: string;
  /** 성취 코드 */
  achievementCodes: string[];
};

export const botCurriculum: Record<string, BotCurriculumUnit[]> = {
  cb_001: [
    { id: 'math2-ch2-limit',      label: '함수의 극한',         fullPath: '미적분 II · 함수의 극한',           achievementCodes: ['수2-2-1'] },
    { id: 'math2-ch2-continuity', label: '연속성',              fullPath: '미적분 II · 함수의 연속성',         achievementCodes: ['수2-2-2'] },
    { id: 'math2-ch3-deriv',      label: '미분계수와 도함수',   fullPath: '미적분 III · 미분계수와 도함수',    achievementCodes: ['수2-3-1'] },
    { id: 'math2-ch3-extremum',   label: '극값',                fullPath: '미적분 III · 도함수의 활용 · 극값', achievementCodes: ['수2-3-2'] },
    { id: 'math2-ch3-inflection', label: '변곡점',              fullPath: '미적분 III · 도함수의 활용 · 변곡점', achievementCodes: ['수2-3-3'] },
  ],
  cb_002: [
    { id: 'eng-blank-7',  label: '빈칸 추론 7유형',  fullPath: '수능 영어 · 빈칸 추론 7유형',  achievementCodes: ['영-수능-3'] },
    { id: 'eng-summary',  label: '요약문 완성',      fullPath: '수능 영어 · 요약문',           achievementCodes: ['영-수능-4'] },
  ],
  cb_003: [
    { id: 'sci-force',  label: '힘과 운동',  fullPath: '통합과학 · 힘과 운동',  achievementCodes: ['과-통합-1'] },
    { id: 'sci-energy', label: '에너지',     fullPath: '통합과학 · 에너지',     achievementCodes: ['과-통합-2'] },
  ],
  cb_004: [
    { id: 'kor-noninfo-arg',   label: '비문학 — 주장과 근거', fullPath: '비문학 · 인문/사회 · 주장과 근거', achievementCodes: ['국-비문-1'] },
    { id: 'kor-noninfo-theme', label: '비문학 — 주제 추론',   fullPath: '비문학 · 주제 추론',               achievementCodes: ['국-비문-2'] },
  ],
  cb_005: [
    { id: 'social-issues-modern', label: '현대사회의 쟁점', fullPath: '사회 · 현대사회의 쟁점',     achievementCodes: ['사-현대-1'] },
    { id: 'social-econ-basic',    label: '경제 기초',       fullPath: '사회 · 경제 · 시장과 가격', achievementCodes: ['사-경제-1'] },
  ],
};

export function getBotCurriculum(botId: string): BotCurriculumUnit[] {
  return botCurriculum[botId] ?? [];
}

/** 학생이 보는 봇 — enrollment 순서로 정렬 */
export function getMyBots(): { bot: ClassBot; enrollment: StudentEnrollment }[] {
  return studentEnrollments
    .map(e => {
      const bot = classBots.find(b => b.id === e.botId);
      return bot ? { bot, enrollment: e } : null;
    })
    .filter((x): x is { bot: ClassBot; enrollment: StudentEnrollment } => x !== null);
}

/** 라이브 진행 중인 내 봇만 */
export function getLiveBots(): ClassBot[] {
  return getMyBots().filter(({ bot }) => bot.isLive).map(({ bot }) => bot);
}

/** 단일 봇 alias — 기존 코드 호환용 (수학이 형) */
export const myClassBot: ClassBot = classBots[0];

/** 클래스 학생 명단 + 실시간 상태 (교사 뷰) */
export type ClassroomStudent = {
  id: string;
  name: string;
  /** 활성 상태 — 5분 단위 히트맵 (지난 30분, 6칸) */
  activityHeat: (0 | 1 | 2 | 3 | 4 | 5)[];
  /** 봇과의 상호작용 횟수 (오늘) */
  botQuestions: number;
  /** 마지막 활동 시각 */
  lastActiveMin: number;     // N분 전
  /** 현재 행동 */
  status: 'active' | 'quiet' | 'inactive' | 'away';
  /** 웰빙 지수 (0~100) */
  wellbeing: number;
  /** 최근 정답률 */
  accuracy: number;
  /** 위기 신호 (감정·번아웃) */
  alert?: 'burnout' | 'emotion' | 'attendance';
};

export const classRoster: ClassroomStudent[] = [
  { id: 's1',  name: '서연', activityHeat: [4, 5, 5, 4, 5, 5], botQuestions: 7, lastActiveMin: 0, status: 'active',   wellbeing: 78, accuracy: 84 },
  { id: 's2',  name: '민준', activityHeat: [5, 5, 4, 3, 2, 1], botQuestions: 12, lastActiveMin: 1, status: 'active',  wellbeing: 62, accuracy: 71 },
  { id: 's3',  name: '지우', activityHeat: [3, 4, 4, 4, 5, 4], botQuestions: 4, lastActiveMin: 0, status: 'active',   wellbeing: 81, accuracy: 88 },
  { id: 's4',  name: '도현', activityHeat: [2, 3, 1, 0, 0, 0], botQuestions: 1, lastActiveMin: 8, status: 'quiet',    wellbeing: 48, accuracy: 54, alert: 'emotion' },
  { id: 's5',  name: '하윤', activityHeat: [5, 5, 5, 5, 4, 5], botQuestions: 9, lastActiveMin: 0, status: 'active',   wellbeing: 85, accuracy: 92 },
  { id: 's6',  name: '주원', activityHeat: [4, 4, 3, 4, 4, 3], botQuestions: 6, lastActiveMin: 2, status: 'active',   wellbeing: 72, accuracy: 76 },
  { id: 's7',  name: '예은', activityHeat: [0, 0, 0, 0, 1, 0], botQuestions: 0, lastActiveMin: 22, status: 'inactive', wellbeing: 41, accuracy: 38, alert: 'burnout' },
  { id: 's8',  name: '시우', activityHeat: [3, 4, 5, 4, 3, 4], botQuestions: 5, lastActiveMin: 0, status: 'active',   wellbeing: 70, accuracy: 79 },
  { id: 's9',  name: '나린', activityHeat: [2, 2, 3, 2, 2, 2], botQuestions: 3, lastActiveMin: 3, status: 'quiet',    wellbeing: 55, accuracy: 64 },
  { id: 's10', name: '건우', activityHeat: [5, 4, 5, 5, 5, 4], botQuestions: 8, lastActiveMin: 0, status: 'active',   wellbeing: 80, accuracy: 86 },
  { id: 's11', name: '소율', activityHeat: [3, 3, 4, 3, 3, 4], botQuestions: 2, lastActiveMin: 1, status: 'active',   wellbeing: 68, accuracy: 73 },
  { id: 's12', name: '재이', activityHeat: [0, 0, 0, 0, 0, 0], botQuestions: 0, lastActiveMin: 35, status: 'away',    wellbeing: 0,  accuracy: 0,  alert: 'attendance' },
  { id: 's13', name: '윤서', activityHeat: [4, 5, 4, 5, 5, 5], botQuestions: 6, lastActiveMin: 0, status: 'active',   wellbeing: 77, accuracy: 81 },
  { id: 's14', name: '태민', activityHeat: [3, 2, 4, 3, 4, 3], botQuestions: 4, lastActiveMin: 1, status: 'active',   wellbeing: 66, accuracy: 70 },
  { id: 's15', name: '아인', activityHeat: [4, 4, 4, 5, 4, 4], botQuestions: 7, lastActiveMin: 0, status: 'active',   wellbeing: 79, accuracy: 83 },
  { id: 's16', name: '리아', activityHeat: [3, 3, 3, 4, 3, 3], botQuestions: 5, lastActiveMin: 2, status: 'active',   wellbeing: 71, accuracy: 75 },
  { id: 's17', name: '서진', activityHeat: [4, 4, 5, 4, 5, 5], botQuestions: 8, lastActiveMin: 0, status: 'active',   wellbeing: 75, accuracy: 80 },
  { id: 's18', name: '준호', activityHeat: [5, 4, 4, 5, 4, 4], botQuestions: 6, lastActiveMin: 0, status: 'active',   wellbeing: 73, accuracy: 78 },
];

/** 실시간 봇 질문 피드 (교사 우측 패널) */
export type BotQuestionFeed = {
  id: string;
  studentName: string;
  studentId: string;
  question: string;
  /** 봇이 응답한 모드 (Scope Guard) */
  scopeUsed: ScopeLevel;
  /** N분 전 */
  agoMin: number;
  /** 교사가 "전체 공유" 토글했는지 */
  shared: boolean;
  /** AI 답변 요약 (펼치면 전체) */
  botAnswerPreview: string;
  /** 응답에 사용된 Tier */
  tier: 'T1' | 'T2' | 'T3';
};

export const liveFeed: BotQuestionFeed[] = [
  {
    id: 'q1', studentName: '서연', studentId: 's1', agoMin: 0,
    question: '극값과 극점이 다른 거예요?',
    scopeUsed: 3,
    shared: false,
    tier: 'T2',
    botAnswerPreview: '좋은 질문! 극점은 x좌표(위치), 극값은 그때의 함수값이야. 그러니까 같은 점을 가리키지만 보는 각도가 달라.',
  },
  {
    id: 'q2', studentName: '하윤', studentId: 's5', agoMin: 1,
    question: 'f\'(x)가 0이면 무조건 극값인가요?',
    scopeUsed: 3,
    shared: true,
    tier: 'T2',
    botAnswerPreview: '아니야, 그게 함정이야. 부호가 안 바뀌면 극값이 아니야. 예: y = x³의 x = 0에서 f\'(0) = 0이지만 부호가 안 바뀌어서 변곡점일 뿐이야.',
  },
  {
    id: 'q3', studentName: '도현', studentId: 's4', agoMin: 3,
    question: '이거 너무 어려워요... 외우는 게 빠른가요?',
    scopeUsed: 3,
    shared: false,
    tier: 'T2',
    botAnswerPreview: '도현아 잠깐 호흡하고. 외우는 건 임시방편일 뿐이야. 부호 변화 표 그리는 연습 5번만 해보자.',
  },
  {
    id: 'q4', studentName: '민준', studentId: 's2', agoMin: 4,
    question: '변곡점도 시험에 나와요?',
    scopeUsed: 3,
    shared: false,
    tier: 'T1',
    botAnswerPreview: '응, 6월 모평·9월 모평에 매년 나와. 함수 그래프 개형 문제에서 핵심.',
  },
  {
    id: 'q5', studentName: '주원', studentId: 's6', agoMin: 6,
    question: 'f"(x) = 0 인 점은 다 변곡점인가요?',
    scopeUsed: 3,
    shared: false,
    tier: 'T2',
    botAnswerPreview: '아니, 부호가 바뀌어야 변곡점. 위로 볼록 ↔ 아래로 볼록의 경계를 묻는 거야.',
  },
];

/** 즉석 퀴즈 — 라이브 수업 중 */
export type LiveQuiz = {
  id: string;
  question: string;
  options: string[];
  /** 응답 분포 — 학생들이 고른 비율 (%, 합 100) */
  distribution: number[];
  answerIndex: number;
  /** 응답한 학생 수 / 전체 */
  responded: number;
  total: number;
  /** 남은 시간 (초) */
  remainingSec: number;
};

export const currentQuiz: LiveQuiz = {
  id: 'qz1',
  question: 'f(x) = x³ − 6x² + 9x + 1 의 극댓값과 극솟값의 합은?',
  options: ['1', '5', '6', '8'],
  distribution: [12, 18, 58, 12],
  answerIndex: 2,  // 6
  responded: 11,
  total: 14,
  remainingSec: 47,
};

/** 학생 뷰 — 봇과의 대화 시작 카드 */
export type StudentBotIntent = {
  /** semantic id — consumer가 lucide 아이콘 매핑 */
  id: 'review' | 'concept' | 'problem' | 'homework' | 'message';
  label: string;
  description: string;
  scopeRequired: ScopeLevel;
};

export const studentIntents: StudentBotIntent[] = [
  { id: 'review',   label: '오늘 수업 복습',     description: '오늘 진행한 내용 다시 짚어줘',  scopeRequired: 3 },
  { id: 'concept',  label: '개념 질문',          description: '미분 관련 모르는 개념을 물어봐', scopeRequired: 3 },
  { id: 'problem',  label: '문제 풀이 도움',     description: '풀다가 막힌 문제 도와달라고 해', scopeRequired: 4 },
  { id: 'homework', label: '오늘 숙제 확인',     description: '제출 마감과 진행 상황 확인',     scopeRequired: 3 },
  { id: 'message',  label: '선생님께 메시지',    description: '봇 통해서 선생님께 전달',       scopeRequired: 3 },
];

/** 교사 홈 — 다가오는 수업 */
export type UpcomingLesson = {
  id: string;
  title: string;
  chapter: string;
  botName: string;
  start: string;         // "HH:MM" 또는 "MM-DD HH:MM"
  studentCount: number;
  status: 'live' | 'upcoming' | 'ended';
  /** 수업 준비 완료도 0~1 */
  prepReady: number;
};

export const upcomingLessons: UpcomingLesson[] = [
  {
    id: 'les_now',
    title: '도함수의 활용 — 극값과 변곡점',
    chapter: '미적분 III장',
    botName: '수학이 형',
    start: '19:00',
    studentCount: 14,
    status: 'live',
    prepReady: 1,
  },
  {
    id: 'les_next',
    title: '적분의 기본 정리',
    chapter: '미적분 IV장',
    botName: '수학이 형',
    start: '내일 19:00',
    studentCount: 18,
    status: 'upcoming',
    prepReady: 0.8,
  },
  {
    id: 'les_later',
    title: '수능 기출 모의 — 미적분 15문항',
    chapter: '종합',
    botName: '수학이 형',
    start: '목 20:00',
    studentCount: 18,
    status: 'upcoming',
    prepReady: 0.4,
  },
];

/** 교사 홈 — 처리 대기 항목 */
export type PendingItem = {
  id: string;
  type: 'grading' | 'approval' | 'report';
  label: string;
  count: number;
  href: string;
};

export const pendingItems: PendingItem[] = [
  { id: 'p1', type: 'grading',  label: '서술형 채점 대기',  count: 12, href: '#grading' },
  { id: 'p2', type: 'report',   label: '학부모 리포트 승인', count: 5,  href: '#reports' },
  { id: 'p3', type: 'approval', label: '루브릭 수정 요청',   count: 2,  href: '#settings' },
];

/** 교사 프로필 */
export const currentTeacher = {
  name: '김수학',
  title: '수학과 전임강사',
  organization: '대치프리미엄 수학학원',
  yearsOfExperience: 7,
  activeBots: 3,
  totalStudents: 47,
};

/** 교사 뷰 — 클래스 KPI 요약 */
export const classKpis = {
  liveStudents: 14,
  totalStudents: 18,
  questionsLastHour: 24,
  avgAccuracy: 75,
  burnoutAlerts: 2,
  avgWellbeing: 67,
};

/* ============================================================
 * 수업 리플레이 (학생/교사 공용)
 * 핸드오프 4.6
 * ========================================================== */

export type ReplaySegment = {
  /** "MM:SS" 시작 시각 (수업 시작 0:00 기준) */
  at: string;
  /** 시작 초 (0:00 기준) — 마커 클릭 시 seek */
  atSec: number;
  /** 0~1 (durationMin 기준 비율) — 타임라인 마커 위치 */
  ratio: number;
  type: 'concept' | 'quiz' | 'student-q' | 'sharing' | 'attention';
  label: string;
  /** 학생 본인이 직접 발생시킨 세그먼트인지 — 학생은 본인 세그먼트만 재접근 가능 */
  ownedByMe?: boolean;
  /** 본인 답·질문 (있으면) */
  myAnswer?: string;
  myQuestion?: string;
  /** 정답 / 봇 답 */
  correctAnswer?: string;
  botResponse?: string;
};

/** 트랜스크립트 라인 — 플레이백 동기화용 sec 범위 포함 */
export type TranscriptLine = {
  at: string;          // "12:30"
  atSec: number;       // 750
  endSec: number;      // 다음 라인 시작점 (또는 종료)
  speaker: '교사' | '봇' | '나' | '학생';
  /** 학생 본인 발화/질문 */
  ownedByMe?: boolean;
  /** 전체 공유된 순간 (다른 학생 발화도 들을 수 있음) */
  shared?: boolean;
  text: string;
};

/** 학생이 직접 저장한 북마크 — "여기 다시 듣기" */
export type ReplayBookmark = {
  id: string;
  atSec: number;
  label: string;
  createdAt: string;   // "방금 전" / "어제 22:14"
};

/** 학생이 시점에 단 선생님께 질문 — 비공개 큐 */
export type ReplayTeacherQuestion = {
  id: string;
  atSec: number;
  text: string;
  status: 'sent' | 'replied';
  reply?: string;
};

/** 리플레이 생애 단계 — 라이브 종료 → AI 처리 → 교사 검토 → 학생 발송 */
export type ReplayStatus = 'processing' | 'review' | 'sent';

/** 학생 시청 통계 — sent 상태에서 의미 있음 */
export type ReplayViewerStats = {
  enrolledCount: number;        // 반 전체
  startedCount: number;         // 시청 시작한 학생 수
  completedCount: number;       // 끝까지 본 학생 수
  avgWatchedPct: number;        // 평균 시청률 (0~100)
  totalQuestions: number;       // 학생들이 단 시점별 질문 합계
  totalBookmarks: number;       // 학생 북마크 합계
};

export type Replay = {
  id: string;
  lessonId: string;
  /** 어떤 봇이 진행한 수업인지 — 교사가 멀티봇 운영 시 구분 */
  botId: string;
  /** 어떤 반에서 진행했는지 */
  classroom: string;
  title: string;
  chapter: string;
  botName: string;
  /** 진행 일자 — "2026-04-22" */
  date: string;
  /** 시작 시각 — "19:00" */
  startedAt: string;
  /** 라이브 종료 시각 — "19:50" 또는 "어제 19:50" */
  endedAt: string;
  durationMin: number;
  participantCount: number;
  /** 생애 단계 */
  status: ReplayStatus;
  /** AI(T3) 처리 완료 시각 — processing이면 null */
  aiProcessedAt: string | null;
  /** 교사 발송 승인 시각 — sent일 때만 */
  sentAt: string | null;
  /** 학생 본인의 정답률 (이 수업 퀴즈) */
  myAccuracy: number;
  /** 핵심 메시지 3개 — AI 자동 추출, 교사 편집 가능 */
  keyTakeaways: string[];
  /** 타임라인 세그먼트 */
  segments: ReplaySegment[];
  /** 전체 트랜스크립트 — 동기화 재생용 */
  transcript: TranscriptLine[];
  /** 1분 단위 집중도 빈 — 0~100, durationMin 길이 */
  focusBins: number[];
  /** 학생 본인의 시청 진도 — 마지막 위치(sec) + 완료 여부 */
  watchProgress: { lastSec: number; completed: boolean };
  /** 학생이 저장한 북마크 */
  bookmarks: ReplayBookmark[];
  /** 학생이 단 시점별 선생님 질문 */
  teacherQuestions: ReplayTeacherQuestion[];
  /** 학생 시청 통계 — sent에서만 의미 */
  viewerStats: ReplayViewerStats | null;
};

export const studentReplays: Replay[] = [
  {
    id: 'rp_001',
    lessonId: 'les_now',
    botId: 'cb_001',
    classroom: '고2 미적분 A반',
    title: '도함수의 활용 — 극값과 변곡점',
    chapter: '미적분 III장',
    botName: '수학이 형',
    date: '2026-04-29',
    startedAt: '19:00',
    endedAt: '오늘 19:50',
    durationMin: 50,
    participantCount: 14,
    status: 'sent',
    aiProcessedAt: '오늘 19:51',
    sentAt: '오늘 19:55',
    viewerStats: {
      enrolledCount: 18, startedCount: 12, completedCount: 4,
      avgWatchedPct: 65, totalQuestions: 6, totalBookmarks: 14,
    },
    myAccuracy: 80,
    keyTakeaways: [
      '부호 변화 없으면 극값 없음 (y = x³의 x=0 함정)',
      'f"(x) 부호 변화 = 변곡점 — 위로 볼록 ↔ 아래로 볼록 경계',
      '극값 vs 극점 구분: y값 vs x값',
    ],
    segments: [
      { at: '02:30', atSec: 150,  ratio: 0.050, type: 'concept',   label: '극값 정의 도입' },
      { at: '08:15', atSec: 495,  ratio: 0.165, type: 'student-q', label: '서연: 극값과 극점이 다른 거예요?', ownedByMe: true,
        myQuestion: '극값과 극점이 다른 거예요?',
        botResponse: '좋은 질문! 극점은 x좌표(위치), 극값은 그때의 함수값이야. 같은 점을 가리키지만 보는 각도가 달라.' },
      { at: '15:00', atSec: 900,  ratio: 0.300, type: 'concept',   label: '부호 변화 표 시연' },
      { at: '22:40', atSec: 1360, ratio: 0.453, type: 'quiz',      label: '퀴즈 1 — 극댓값+극솟값 합', ownedByMe: true,
        myAnswer: '6', correctAnswer: '6' },
      { at: '28:10', atSec: 1690, ratio: 0.563, type: 'sharing',   label: '하윤 질문 전체 공유 — f\'(x)=0이면 무조건 극값?' },
      { at: '34:50', atSec: 2090, ratio: 0.697, type: 'attention', label: '집중도 저하 감지 — 도현·예은' },
      { at: '38:25', atSec: 2305, ratio: 0.768, type: 'quiz',      label: '퀴즈 2 — 변곡점 판정', ownedByMe: true,
        myAnswer: '③', correctAnswer: '②' },
      { at: '45:00', atSec: 2700, ratio: 0.900, type: 'concept',   label: '오늘의 정리 — 핵심 3개' },
    ],
    transcript: [
      { at: '00:30', atSec: 30,   endSec: 150,  speaker: '교사',
        text: '자, 종 쳤다. 오늘은 극값하고 변곡점이야. 다 알고 있다고 생각하지만 함정이 있어.' },
      { at: '02:30', atSec: 150,  endSec: 495,  speaker: '교사',
        text: '도함수 자체보다 “부호 변화"가 핵심이라는 걸 오늘 가져가자. f\'(x) = 0이라고 다 극값 아니야.' },
      { at: '08:15', atSec: 495,  endSec: 600,  speaker: '나', ownedByMe: true,
        text: '극값과 극점이 다른 거예요?' },
      { at: '08:25', atSec: 505,  endSec: 720,  speaker: '봇', ownedByMe: true,
        text: '좋은 질문! 극점은 x좌표(위치), 극값은 그때의 함수값. 같은 점을 가리키지만 보는 각도가 달라.' },
      { at: '12:00', atSec: 720,  endSec: 900,  speaker: '교사',
        text: '서연이가 좋은 거 짚었네. 극값은 “값"이니까 y, 극점은 “점"이니까 좌표 (x, y) 쌍.' },
      { at: '15:00', atSec: 900,  endSec: 1360, speaker: '교사',
        text: 'f\'(x) = 0인 점만 찾으면 안 돼. 부호가 안 바뀌면 극값이 아니야. y = x³가 대표 예. 미분하면 3x², x=0에서 0이지만 부호 변화 없어.' },
      { at: '22:40', atSec: 1360, endSec: 1500, speaker: '교사',
        text: '자 퀴즈 쏠게. f(x) = x³ − 6x² + 9x + 1의 극댓값과 극솟값의 합. 30초.' },
      { at: '25:00', atSec: 1500, endSec: 1690, speaker: '교사',
        text: '많이들 6 골랐네. 정답 ✓. 극대 5, 극소 1, 합 6. 부호 변화 표 그렸으면 한 번에 보였을 거야.' },
      { at: '28:10', atSec: 1690, endSec: 1920, speaker: '봇', shared: true,
        text: '하윤 질문이 정말 좋아서 전체 공유할게. “f\'(x) = 0이면 무조건 극값?" — 답은 아니. 부호 변화가 없으면 변곡점일 뿐. 시험 단골이야.' },
      { at: '32:00', atSec: 1920, endSec: 2090, speaker: '교사',
        text: '이제 변곡점. f"(x) = 0이고 부호가 바뀌면 변곡점. 위로 볼록 ↔ 아래로 볼록 경계.' },
      { at: '34:50', atSec: 2090, endSec: 2305, speaker: '교사',
        text: '도현이 예은이, 잠깐 일어났다 앉아. 30초 쉬어. 변곡점 들어갈 거야 곧.' },
      { at: '38:25', atSec: 2305, endSec: 2400, speaker: '교사',
        text: '퀴즈 2. y = x³의 변곡점은? ②번이야. 잘들 봐, x=0에서 f"(x)=0이고 부호 바뀌어.' },
      { at: '40:00', atSec: 2400, endSec: 2700, speaker: '교사',
        text: '③ 고른 친구들 — x³가 극값이라고 본 거지. 함정이야. 부호 변화 없어. 변곡점만.' },
      { at: '45:00', atSec: 2700, endSec: 2880, speaker: '교사',
        text: '오늘 핵심 3개만 가져가. ① 부호 변화 없으면 극값 없음. ② f"(x) 부호 변화 = 변곡점. ③ 극값 vs 극점, y값 vs x값.' },
      { at: '48:00', atSec: 2880, endSec: 3000, speaker: '교사',
        text: '내일까지 도함수 활용 마무리 20문항 풀어와. 봇이 보내놨어. 수업 끝.' },
    ],
    focusBins: [
      78, 82, 85, 84, 86, 83, 80, 78, 82, 88,    // 0-9 도입·서연 질문 후 회복
      90, 92, 91, 89, 88, 94, 95, 93, 91, 92,    // 10-19 부호 변화 표 시연 — 피크
      90, 93, 95, 96, 94, 92, 90, 89, 90, 88,    // 20-29 퀴즈1 + 해설
      85, 82, 78, 72, 68, 63, 65, 70, 76, 80,    // 30-39 집중도 저하 → 회복
      83, 86, 88, 89, 90, 92, 91, 88, 85, 82,    // 40-49 퀴즈2 + 정리
    ],
    watchProgress: { lastSec: 0, completed: false },
    bookmarks: [
      { id: 'bm1', atSec: 900,  label: '부호 변화 표 — 다시 듣기', createdAt: '방금 전' },
      { id: 'bm2', atSec: 2305, label: '퀴즈 2 — 왜 ②인지',         createdAt: '방금 전' },
    ],
    teacherQuestions: [
      { id: 'tq1', atSec: 2400, status: 'replied',
        text: 'f"(x)=0인데 변곡점 아닌 경우도 있나요?',
        reply: '응, x⁴같은 경우. f"(x)=0이지만 부호 안 바뀌면 변곡점 X. 다음 수업에서 자세히.' },
    ],
  },
  {
    id: 'rp_002',
    lessonId: 'les_prev_1',
    botId: 'cb_001',
    classroom: '고2 미적분 A반',
    title: '도함수 — 정의와 성질',
    chapter: '미적분 III장',
    botName: '수학이 형',
    date: '2026-04-22',
    startedAt: '19:00',
    endedAt: '4/22 19:50',
    durationMin: 50,
    participantCount: 16,
    status: 'sent',
    aiProcessedAt: '4/22 19:53',
    sentAt: '4/22 19:58',
    viewerStats: {
      enrolledCount: 18, startedCount: 16, completedCount: 11,
      avgWatchedPct: 82, totalQuestions: 14, totalBookmarks: 23,
    },
    myAccuracy: 73,
    keyTakeaways: [
      '평균변화율 → 순간변화율로의 극한 이행',
      'f\'(x) 표기법 통일 (라이프니츠/뉴턴)',
      '미분 가능 ↔ 좌·우 극한 일치',
    ],
    segments: [
      { at: '03:00', atSec: 180,  ratio: 0.060, type: 'concept',   label: '미분 도입 — 평균변화율' },
      { at: '12:20', atSec: 740,  ratio: 0.247, type: 'student-q', label: '서연: 라이프니츠 표기 왜 분수처럼 생겼어요?', ownedByMe: true,
        myQuestion: '라이프니츠 표기 왜 분수처럼 생겼어요?',
        botResponse: '극한 개념의 흔적이야. dy/dx는 사실 분수가 아니지만 비율의 극한을 분수처럼 표기한 거지.' },
      { at: '20:00', atSec: 1200, ratio: 0.400, type: 'quiz',      label: '퀴즈 1 — 미분계수', ownedByMe: true,
        myAnswer: '4', correctAnswer: '4' },
      { at: '32:00', atSec: 1920, ratio: 0.640, type: 'concept',   label: '미분 가능 vs 연속' },
      { at: '40:00', atSec: 2400, ratio: 0.800, type: 'quiz',      label: '퀴즈 2 — 절댓값 함수 미분 가능?', ownedByMe: true,
        myAnswer: '예', correctAnswer: '아니오' },
    ],
    transcript: [
      { at: '03:00', atSec: 180,  endSec: 740,  speaker: '교사',
        text: '미분의 시작은 평균변화율이야. 거기서 구간을 0으로 보내면 순간변화율.' },
      { at: '12:20', atSec: 740,  endSec: 900,  speaker: '나', ownedByMe: true,
        text: '라이프니츠 표기 왜 분수처럼 생겼어요?' },
      { at: '12:30', atSec: 750,  endSec: 1200, speaker: '봇', ownedByMe: true,
        text: '극한 개념의 흔적이야. dy/dx는 사실 분수가 아니지만 비율의 극한을 분수처럼 표기한 거지.' },
      { at: '20:00', atSec: 1200, endSec: 1920, speaker: '교사',
        text: '퀴즈 1. f(x)=x²에서 x=2의 미분계수. 정답 4. 평균변화율 (f(2+h)-f(2))/h → h→0 보내면 4.' },
      { at: '32:00', atSec: 1920, endSec: 2400, speaker: '교사',
        text: '연속이라고 미분 가능한 건 아니야. 절댓값 함수처럼 꺾인 점은 좌·우 극한이 다르거든.' },
      { at: '40:00', atSec: 2400, endSec: 2700, speaker: '교사',
        text: '퀴즈 2. 절댓값 함수 미분 가능? — 아니오. x=0에서 좌극한 -1, 우극한 +1. 안 맞아.' },
      { at: '45:00', atSec: 2700, endSec: 3000, speaker: '교사',
        text: '다음 시간엔 도함수 활용으로 들어갈게. 극값·변곡점.' },
    ],
    focusBins: [
      75, 80, 84, 86, 82, 78, 76, 80, 85, 88,
      90, 92, 88, 86, 90, 92, 91, 88, 85, 87,
      90, 92, 94, 90, 88, 86, 84, 82, 80, 82,
      85, 88, 86, 84, 82, 80, 78, 80, 82, 85,
      88, 90, 88, 84, 82, 80, 78, 76, 75, 72,
    ],
    watchProgress: { lastSec: 1500, completed: false },
    bookmarks: [
      { id: 'bm3', atSec: 2400, label: '절댓값 미분 — 좌우극한', createdAt: '4/24 21:00' },
    ],
    teacherQuestions: [],
  },
  {
    id: 'rp_003',
    lessonId: 'les_prev_2',
    botId: 'cb_001',
    classroom: '고2 미적분 A반',
    title: '함수의 극한 — 좌극한·우극한',
    chapter: '미적분 II장',
    botName: '수학이 형',
    date: '2026-04-15',
    startedAt: '19:00',
    endedAt: '4/15 19:45',
    durationMin: 45,
    participantCount: 17,
    status: 'sent',
    aiProcessedAt: '4/15 19:48',
    sentAt: '4/15 19:52',
    viewerStats: {
      enrolledCount: 18, startedCount: 18, completedCount: 16,
      avgWatchedPct: 95, totalQuestions: 22, totalBookmarks: 31,
    },
    myAccuracy: 86,
    keyTakeaways: [
      '극한은 도착이 아닌 접근의 개념',
      '좌·우 극한이 같아야 극한 존재',
      '∞ 형태는 식 변형으로 부정형 해소',
    ],
    segments: [
      { at: '04:00', atSec: 240,  ratio: 0.089, type: 'concept', label: '극한 정의 — δ-ε' },
      { at: '15:00', atSec: 900,  ratio: 0.333, type: 'quiz',    label: '퀴즈 1 — 좌극한 계산', ownedByMe: true,
        myAnswer: '2', correctAnswer: '2' },
      { at: '25:00', atSec: 1500, ratio: 0.556, type: 'sharing', label: '도현 질문 전체 공유 — 부정형이 뭐예요?' },
      { at: '35:00', atSec: 2100, ratio: 0.778, type: 'quiz',    label: '퀴즈 2 — ∞/∞ 부정형', ownedByMe: true,
        myAnswer: '3', correctAnswer: '3' },
    ],
    transcript: [
      { at: '04:00', atSec: 240,  endSec: 900,  speaker: '교사',
        text: '극한은 도착하는 개념이 아니라 무한히 가까이 가는 개념이야. 도착하면 함수값 그 자체지.' },
      { at: '15:00', atSec: 900,  endSec: 1500, speaker: '교사',
        text: '퀴즈 1. lim x→2⁻ (x²-4)/(x-2) — 인수분해하면 (x+2). x=2 대입 = 4. 잘들 풀었네.' },
      { at: '25:00', atSec: 1500, endSec: 2100, speaker: '봇', shared: true,
        text: '부정형은 단정할 수 없는 형태라는 뜻. 0/0, ∞/∞ 같은 거. 식 변형이 도구야.' },
      { at: '35:00', atSec: 2100, endSec: 2700, speaker: '교사',
        text: '퀴즈 2. ∞/∞ 부정형 — 분모 분자 최고차항 비율로 보면 돼. 정답 ③.' },
    ],
    focusBins: [
      80, 82, 85, 88, 90, 88, 86, 84, 82, 80,
      82, 85, 88, 90, 92, 94, 92, 88, 85, 82,
      80, 82, 85, 88, 90, 92, 90, 88, 86, 84,
      82, 84, 86, 88, 90, 92, 90, 88, 85, 82,
      80, 78, 76, 74, 72,
    ],
    watchProgress: { lastSec: 2700, completed: true },
    bookmarks: [],
    teacherQuestions: [],
  },
  /* ── 영어 누나 봇 (cb_002)의 발송된 리플레이 ── */
  {
    id: 'rp_006',
    lessonId: 'les_eng_prev',
    botId: 'cb_002',
    classroom: '고2 영어독해 B반',
    title: '빈칸 추론 — 인과 관계 시그널',
    chapter: '수능 빈칸 5유형',
    botName: '영어 누나',
    date: '2026-04-22',
    startedAt: '20:00',
    endedAt: '4/22 20:50',
    durationMin: 50,
    participantCount: 11,
    status: 'sent',
    aiProcessedAt: '4/22 20:53',
    sentAt: '4/22 20:58',
    viewerStats: {
      enrolledCount: 12, startedCount: 10, completedCount: 7,
      avgWatchedPct: 78, totalQuestions: 8, totalBookmarks: 17,
    },
    myAccuracy: 88,
    keyTakeaways: [
      'because/therefore 같은 신호어 뒤가 결론',
      '인과 시그널이 없으면 첫 문장과 마지막 문장 간 흐름 추적',
      '오답은 보통 “부분 진실 + 본문 다른 곳" 조합',
    ],
    segments: [
      { at: '03:00', atSec: 180,  ratio: 0.060, type: 'concept', label: '인과 시그널어 정리' },
      { at: '14:00', atSec: 840,  ratio: 0.280, type: 'student-q', label: '서연: therefore 뒤가 항상 결론인가요?', ownedByMe: true,
        myQuestion: 'therefore 뒤가 항상 결론인가요?',
        botResponse: '거의 그래요. 단, 글쓴이가 “비록 ~지만"으로 받아치는 양보 구문은 예외예요.' },
      { at: '24:00', atSec: 1440, ratio: 0.480, type: 'quiz', label: '퀴즈 1 — 빈칸 추론 3제', ownedByMe: true,
        myAnswer: '③', correctAnswer: '③' },
      { at: '36:00', atSec: 2160, ratio: 0.720, type: 'concept', label: '오답 함정 패턴 4가지' },
      { at: '45:00', atSec: 2700, ratio: 0.900, type: 'concept', label: '오늘의 정리' },
    ],
    transcript: [
      { at: '03:00', atSec: 180,  endSec: 840,  speaker: '교사',
        text: 'Because, therefore, thus, hence, consequently — 다섯 개만 외워도 빈칸 정답률 30% 올라가요.' },
      { at: '14:00', atSec: 840,  endSec: 1000, speaker: '나', ownedByMe: true,
        text: 'therefore 뒤가 항상 결론인가요?' },
      { at: '14:10', atSec: 850,  endSec: 1440, speaker: '봇', ownedByMe: true,
        text: '거의 그래요. 단, 글쓴이가 “비록 ~지만"으로 받아치는 양보 구문은 예외예요.' },
      { at: '24:00', atSec: 1440, endSec: 2160, speaker: '교사',
        text: '퀴즈 잘 풀었네요. ③번 정답. 인과 시그널 잡고 가니까 한 번에 보였죠.' },
      { at: '36:00', atSec: 2160, endSec: 2700, speaker: '교사',
        text: '오답 패턴 4가지. ① 부분 진실 ② 본문 다른 위치 ③ 시제 어긋남 ④ 주체 바뀜.' },
    ],
    focusBins: [
      75, 78, 82, 85, 84, 82, 80, 82, 85, 88,
      90, 88, 86, 84, 82, 84, 86, 88, 90, 88,
      86, 84, 88, 90, 92, 94, 92, 90, 88, 86,
      84, 86, 88, 90, 88, 86, 84, 82, 80, 82,
      84, 86, 88, 86, 84, 82, 80, 78, 76, 74,
    ],
    watchProgress: { lastSec: 0, completed: false },
    bookmarks: [],
    teacherQuestions: [],
  },
  /* ── 교사 큐 전용 — 학생에게 아직 안 갔거나 처리 중 ── */
  {
    id: 'rp_004',
    lessonId: 'les_eng_now',
    botId: 'cb_002',
    classroom: '고2 영어독해 B반',
    title: '빈칸 추론 — 접속사 논리 관계',
    chapter: '수능 빈칸 7유형',
    botName: '영어 누나',
    date: '2026-04-29',
    startedAt: '20:00',
    endedAt: '오늘 20:50',
    durationMin: 50,
    participantCount: 11,
    status: 'processing',
    aiProcessedAt: null,
    sentAt: null,
    viewerStats: null,
    myAccuracy: 0,
    keyTakeaways: [],
    segments: [],
    transcript: [],
    focusBins: [],
    watchProgress: { lastSec: 0, completed: false },
    bookmarks: [],
    teacherQuestions: [],
  },
  {
    id: 'rp_005',
    lessonId: 'les_prev_3',
    botId: 'cb_001',
    classroom: '고2 미적분 A반',
    title: '평균값 정리 (MVT) — 수능 빈출',
    chapter: '미적분 III장',
    botName: '수학이 형',
    date: '2026-04-28',
    startedAt: '19:00',
    endedAt: '어제 19:50',
    durationMin: 50,
    participantCount: 15,
    status: 'review',
    aiProcessedAt: '어제 19:52',
    sentAt: null,
    viewerStats: null,
    myAccuracy: 0,
    keyTakeaways: [
      '연속 + 미분 가능 두 조건 모두 필수',
      'MVT: f\'(c) = (f(b)-f(a))/(b-a) 만족하는 c ∈ (a, b) 존재',
      '롤(Rolle) 정리 = MVT의 특수 경우 (f(a) = f(b))',
    ],
    segments: [
      { at: '03:00', atSec: 180,  ratio: 0.060, type: 'concept', label: 'MVT 정의 도입' },
      { at: '14:30', atSec: 870,  ratio: 0.290, type: 'concept', label: '기하학적 의미 — 평균기울기 = 어떤 점의 순간기울기' },
      { at: '24:00', atSec: 1440, ratio: 0.480, type: 'quiz',    label: '퀴즈 1 — c 값 찾기' },
      { at: '36:00', atSec: 2160, ratio: 0.720, type: 'concept', label: '롤 정리와의 관계' },
      { at: '44:00', atSec: 2640, ratio: 0.880, type: 'concept', label: '오늘의 정리' },
    ],
    transcript: [
      { at: '03:00', atSec: 180,  endSec: 870,  speaker: '교사',
        text: '오늘은 평균값 정리. 수능 미적분에서 거의 매년 나오는 도구야. 두 조건만 외워.' },
      { at: '14:30', atSec: 870,  endSec: 1440, speaker: '교사',
        text: '기하학적으로 보면 평균기울기와 같은 순간기울기가 구간 안 어딘가에 반드시 있다는 거야.' },
      { at: '24:00', atSec: 1440, endSec: 2160, speaker: '교사',
        text: '퀴즈 풀어보자. f(x) = x² on [1, 3]에서 c 찾기. 답은 c = 2.' },
      { at: '36:00', atSec: 2160, endSec: 2640, speaker: '교사',
        text: '롤 정리는 f(a) = f(b)인 특수 경우. f\'(c) = 0이 되지.' },
      { at: '44:00', atSec: 2640, endSec: 3000, speaker: '교사',
        text: '핵심 3개. 연속+미분, MVT 공식, 롤은 특수 경우. 다음 시간 정적분으로 넘어가.' },
    ],
    focusBins: [
      72, 75, 78, 80, 82, 84, 82, 80, 78, 80,
      82, 85, 88, 90, 92, 90, 88, 86, 84, 82,
      80, 82, 85, 88, 90, 92, 90, 88, 86, 84,
      82, 84, 86, 88, 90, 88, 86, 84, 82, 80,
      78, 80, 82, 84, 86, 84, 82, 80, 78, 76,
    ],
    watchProgress: { lastSec: 0, completed: false },
    bookmarks: [],
    teacherQuestions: [],
  },
];

/** 학생이 보는 것 — 발송 승인된 리플레이만 */
export function getSentReplays(): Replay[] {
  return studentReplays.filter(r => r.status === 'sent');
}

/** MM:SS 포맷 */
export function formatReplayTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================================================
 * 즉석 퀴즈 — 교사 (history + draft 후보)
 * ========================================================== */

export type QuizHistoryItem = {
  id: string;
  question: string;
  type: 'mcq' | 'short' | 'ox' | 'match';
  status: 'live' | 'closed' | 'draft';
  startedAt: string;        // "19:22" 또는 "어제 19:30"
  responded: number;
  total: number;
  correctRate: number;      // 0~100
  /** 단원·범위 */
  scope: string;
  /** Tier 사용 */
  tier: 'T1' | 'T2' | 'T3';
};

export const quizHistory: QuizHistoryItem[] = [
  { id: 'qh1', question: 'f(x) = x³ − 6x² + 9x + 1의 극댓값과 극솟값의 합은?',
    type: 'mcq', status: 'live', startedAt: '19:22',
    responded: 11, total: 14, correctRate: 58, scope: '미적분 III · 극값', tier: 'T2' },
  { id: 'qh2', question: 'f"(x) = 0 인 점은 항상 변곡점이다 (O/X)',
    type: 'ox', status: 'closed', startedAt: '19:08',
    responded: 14, total: 14, correctRate: 71, scope: '미적분 III · 변곡점', tier: 'T1' },
  { id: 'qh3', question: '극값과 극점의 차이를 한 줄로 설명하시오',
    type: 'short', status: 'closed', startedAt: '19:00',
    responded: 14, total: 14, correctRate: 86, scope: '미적분 III · 정의', tier: 'T2' },
  { id: 'qh4', question: '부호 변화 표를 그릴 때 가장 먼저 해야 할 일은?',
    type: 'mcq', status: 'closed', startedAt: '어제 19:32',
    responded: 18, total: 18, correctRate: 78, scope: '미적분 III · 풀이 절차', tier: 'T2' },
  { id: 'qh5', question: '오늘 배운 미분 표기 4종을 짝지으세요',
    type: 'match', status: 'draft', startedAt: '대기',
    responded: 0, total: 18, correctRate: 0, scope: '미적분 III · 표기법', tier: 'T2' },
];

export type QuizDraftSuggestion = {
  id: string;
  topic: string;
  difficulty: '하' | '중' | '상';
  estimateSec: number;
  reasonChip: string;
};

export const quizDrafts: QuizDraftSuggestion[] = [
  { id: 'qd1', topic: '극값 판정 — 부호 변화 표', difficulty: '중', estimateSec: 60, reasonChip: '오답 클러스터 1위' },
  { id: 'qd2', topic: '변곡점 vs 극값 구분', difficulty: '상', estimateSec: 90, reasonChip: '핵심 메시지 ②' },
  { id: 'qd3', topic: '미분 표기법 매칭', difficulty: '하', estimateSec: 30, reasonChip: '복습 워밍업' },
];

/* ============================================================
 * 라이브 수업 목록 (교사) — 멀티 봇 운영
 * ========================================================== */

export type LiveSessionRow = {
  id: string;
  botName: string;
  botEmoji: string;
  classroom: string;
  subject: string;
  status: 'live' | 'starting' | 'ended';
  startedAt: string;        // "19:00"
  durationMin: number;
  participantCount: number;
  totalCount: number;
  scope: ScopeLevel;
  /** 색상 누적 — 라이브 시각 표지 */
  intensity: 0 | 1 | 2 | 3;
  alertCount: number;
};

export const liveSessions: LiveSessionRow[] = [
  {
    id: 'ls_a', botName: '수학이 형', botEmoji: '🧑‍🏫',
    classroom: '고2 미적분 A반', subject: '수학Ⅱ',
    status: 'live', startedAt: '19:00', durationMin: 50,
    participantCount: 14, totalCount: 18, scope: 3, intensity: 3, alertCount: 2,
  },
  {
    id: 'ls_b', botName: '영어 누나', botEmoji: '👩‍🏫',
    classroom: '고2 영어독해 B반', subject: '영어',
    status: 'live', startedAt: '19:00', durationMin: 50,
    participantCount: 11, totalCount: 12, scope: 4, intensity: 2, alertCount: 0,
  },
  {
    id: 'ls_c', botName: '과학 쌤', botEmoji: '🧑‍🔬',
    classroom: '고1 통합과학 C반', subject: '통합과학',
    status: 'starting', startedAt: '20:00', durationMin: 60,
    participantCount: 0, totalCount: 17, scope: 3, intensity: 0, alertCount: 0,
  },
  {
    id: 'ls_d', botName: '수학이 형', botEmoji: '🧑‍🏫',
    classroom: '고2 미적분 A반', subject: '수학Ⅱ',
    status: 'ended', startedAt: '어제 19:00', durationMin: 50,
    participantCount: 16, totalCount: 18, scope: 3, intensity: 0, alertCount: 1,
  },
  {
    id: 'ls_e', botName: '수학이 형', botEmoji: '🧑‍🏫',
    classroom: '고2 미적분 A반', subject: '수학Ⅱ',
    status: 'ended', startedAt: '4/15 19:00', durationMin: 45,
    participantCount: 17, totalCount: 18, scope: 3, intensity: 0, alertCount: 0,
  },
];

/* ============================================================
 * 리포트 센터 — 6종
 * 핸드오프 4.7
 * ========================================================== */

export type ReportKind = 'realtime' | 'lesson-end' | 'student' | 'period' | 'class' | 'parent';

export type ReportSummary = {
  id: string;
  kind: ReportKind;
  title: string;
  subject: string;     // "고2 미적분 A반 — 윤서" / "주간 4/22~4/28"
  generatedAt: string; // "19:50 자동 생성"
  status: 'pending-approval' | 'approved' | 'sent' | 'draft';
  /** 8 KPI 요약 — 0~100 0번이 가장 중요 */
  kpis: { label: string; value: string; trend?: 'up' | 'down' | 'flat' }[];
  /** 1줄 요약 */
  summary: string;
  /** 주의 신호 */
  alerts?: string[];
};

export const reports: ReportSummary[] = [
  {
    id: 'rep_a', kind: 'parent',
    title: '학부모 주간 리포트 (윤서)',
    subject: '4/22 ~ 4/28 · 보호자 김OO', generatedAt: '오늘 18:00',
    status: 'pending-approval',
    kpis: [
      { label: '학습 시간', value: '11h 20m', trend: 'up' },
      { label: '정답률', value: '81%', trend: 'up' },
      { label: '봇 질문', value: '38회', trend: 'flat' },
      { label: '감정', value: '안정', trend: 'flat' },
    ],
    summary: '미분 단원에서 정답률이 73% → 81%로 상승. 봇 질문 빈도 양호. 자살·우울 키워드 없음.',
    alerts: [],
  },
  {
    id: 'rep_b', kind: 'student',
    title: '학생 개인 리포트 (도현)',
    subject: '고2 미적분 A반 · 도현', generatedAt: '오늘 19:30',
    status: 'pending-approval',
    kpis: [
      { label: '학습 시간', value: '4h 10m', trend: 'down' },
      { label: '정답률', value: '54%', trend: 'down' },
      { label: '감정 체크인', value: '3일 "힘듦"', trend: 'down' },
      { label: '웰빙', value: '48/100', trend: 'down' },
    ],
    summary: '7일 추세 하향. 감정 체크인 3일 연속 "힘듦". 1:1 상담 또는 Wee센터 연결 권장.',
    alerts: ['감정 위기 신호', '번아웃 임계 근접'],
  },
  {
    id: 'rep_c', kind: 'lesson-end',
    title: '수업 종료 리포트 — 도함수의 활용',
    subject: '4/29 19:00~19:50 · 14명 참여', generatedAt: '19:50 자동 생성',
    status: 'draft',
    kpis: [
      { label: '평균 정답률', value: '75%', trend: 'flat' },
      { label: '봇 질문 합계', value: '24회', trend: 'up' },
      { label: '주제 이탈', value: '0건', trend: 'flat' },
      { label: '집중도', value: '86%', trend: 'up' },
    ],
    summary: '핵심 메시지 3개 모두 학생 80% 이상 회상 가능. 부호 변화 표 절차 오답 패턴이 클러스터 1위.',
  },
  {
    id: 'rep_d', kind: 'class',
    title: '학급 비교 — 고2 미적분 A vs B',
    subject: '4/22 ~ 4/28', generatedAt: '오늘 09:00',
    status: 'approved',
    kpis: [
      { label: 'A반 평균', value: '78%', trend: 'up' },
      { label: 'B반 평균', value: '69%', trend: 'flat' },
      { label: '학습 시간 격차', value: '+1.2h', trend: 'up' },
      { label: '봇 활용도', value: 'A 우세', trend: 'up' },
    ],
    summary: 'A반이 B반 대비 봇 활용 빈도 1.7배. B반 학생 3명 봇 미사용 — 개입 권장.',
  },
  {
    id: 'rep_e', kind: 'period',
    title: '월간 추이 — 고2 미적분 A반',
    subject: '4월 한 달', generatedAt: '4/29 자동 생성',
    status: 'draft',
    kpis: [
      { label: '월간 학습 시간', value: '+18%', trend: 'up' },
      { label: '평균 정답률', value: '+6%p', trend: 'up' },
      { label: 'D30 리텐션', value: '83%', trend: 'up' },
      { label: '번아웃 비율', value: '11%', trend: 'down' },
    ],
    summary: '4월 한 달간 전반 상승. 번아웃 비율 14% → 11% 개선. 5월 시험 대비 페이스 적정.',
  },
  {
    id: 'rep_f', kind: 'realtime',
    title: '실시간 대시보드 스냅샷',
    subject: '4/29 19:30 시점 · 라이브 중', generatedAt: '갱신 30초 전',
    status: 'sent',
    kpis: [
      { label: '활성 학생', value: '14/18' },
      { label: '질문 (1H)', value: '24건' },
      { label: '오답 클러스터', value: '#부호변화' },
      { label: '위기 신호', value: '2명', trend: 'flat' },
    ],
    summary: '예은 22분 무응답 + 도현 감정 체크인 "힘듦" 누적. 즉시 개입 권장.',
    alerts: ['예은 — 22분 무응답', '도현 — 3일 연속 "힘듦"'],
  },
];

/* ============================================================
 * 채점 허브 — 서술형 AI 초안 + 교사 검수
 * 핸드오프 4.8
 * ========================================================== */

export type GradingItem = {
  id: string;
  studentName: string;
  studentId: string;
  assignmentTitle: string;
  submittedAt: string;        // "어제 22:14"
  type: 'short' | 'essay' | 'numeric';
  /** 출제 단원 */
  topic: string;
  /** AI 초안 점수 (만점 기준) */
  draftScore: number;
  maxScore: number;
  /** AI Tier 사용 */
  tier: 'T1' | 'T2' | 'T3';
  /** AI 자신도 */
  aiConfidence: number;       // 0~100
  /** 학생 응답 (요약) */
  responsePreview: string;
  /** AI 코멘트 초안 */
  draftComment: string;
  /** 루브릭 — 항목별 점수 */
  rubric: { criterion: string; weight: number; score: number; reason: string }[];
  /** 교사 검수 상태 */
  status: 'queue' | 'reviewing' | 'approved' | 'overridden';
  /** 교사 변경률 — 점수 차이 % (overridden일 때) */
  overrideDelta?: number;
};

export const gradingQueue: GradingItem[] = [
  {
    id: 'gr_001', studentName: '윤서', studentId: 's13',
    assignmentTitle: '극값과 변곡점 — 서술형 3제',
    submittedAt: '어제 22:14',
    type: 'essay', topic: '미적분 III · 극값',
    draftScore: 17, maxScore: 20, tier: 'T2', aiConfidence: 88,
    responsePreview: 'f\'(x) = 0인 점에서 부호 변화가 있는지 확인해야 한다. y = x³의 x = 0에서는 ...',
    draftComment: '핵심 개념(부호 변화)을 정확히 파악. 예시 활용도 적절. 일부 표기 오류 있음 (- 1점).',
    rubric: [
      { criterion: '개념 정확성', weight: 40, score: 36, reason: '정의 정확' },
      { criterion: '예시 적절성', weight: 30, score: 27, reason: 'y=x³ 함정 예시 좋음' },
      { criterion: '표기 정확성', weight: 20, score: 14, reason: 'f\'(x) → f`(x) 오타 1회' },
      { criterion: '논리 흐름',   weight: 10, score: 8,  reason: '단계 명확' },
    ],
    status: 'queue',
  },
  {
    id: 'gr_002', studentName: '서연', studentId: 's1',
    assignmentTitle: '극값과 변곡점 — 서술형 3제',
    submittedAt: '어제 21:50',
    type: 'essay', topic: '미적분 III · 극값',
    draftScore: 19, maxScore: 20, tier: 'T2', aiConfidence: 92,
    responsePreview: '극값은 부호 변화가 있는 지점, 변곡점은 이계도함수 부호 변화 지점이다. ...',
    draftComment: '거의 완벽. 변곡점 정의에서 "이계도함수" 명시까지 이끌어낸 점 우수.',
    rubric: [
      { criterion: '개념 정확성', weight: 40, score: 40, reason: '완벽' },
      { criterion: '예시 적절성', weight: 30, score: 28, reason: '예시 1개 더 있으면 만점' },
      { criterion: '표기 정확성', weight: 20, score: 20, reason: '오타 없음' },
      { criterion: '논리 흐름',   weight: 10, score: 10, reason: '명확' },
    ],
    status: 'reviewing',
  },
  {
    id: 'gr_003', studentName: '민준', studentId: 's2',
    assignmentTitle: '극값과 변곡점 — 서술형 3제',
    submittedAt: '오늘 06:30',
    type: 'essay', topic: '미적분 III · 극값',
    draftScore: 12, maxScore: 20, tier: 'T2', aiConfidence: 64,
    responsePreview: 'f\'(x) = 0이면 극값이다. 따라서 ...',
    draftComment: '핵심 함정(부호 변화 미체크)을 놓침. y=x³ 반례 인지 필요.',
    rubric: [
      { criterion: '개념 정확성', weight: 40, score: 18, reason: '부호 변화 누락' },
      { criterion: '예시 적절성', weight: 30, score: 16, reason: '반례 부재' },
      { criterion: '표기 정확성', weight: 20, score: 18, reason: '소소한 오타' },
      { criterion: '논리 흐름',   weight: 10, score: 8,  reason: '결론 도약' },
    ],
    status: 'queue',
  },
  {
    id: 'gr_004', studentName: '도현', studentId: 's4',
    assignmentTitle: '극값과 변곡점 — 서술형 3제',
    submittedAt: '오늘 07:12',
    type: 'essay', topic: '미적분 III · 극값',
    draftScore: 8, maxScore: 20, tier: 'T2', aiConfidence: 58,
    responsePreview: '잘 모르겠음. 미분이 너무 어렵다.',
    draftComment: '응답 부족. 학습 부담 신호 — 1:1 면담 필요. 점수보다 케어 우선.',
    rubric: [
      { criterion: '개념 정확성', weight: 40, score: 12, reason: '응답 부족' },
      { criterion: '예시 적절성', weight: 30, score: 10, reason: '예시 없음' },
      { criterion: '표기 정확성', weight: 20, score: 10, reason: '판단 불가' },
      { criterion: '논리 흐름',   weight: 10, score: 5,  reason: '판단 불가' },
    ],
    status: 'queue',
  },
  {
    id: 'gr_005', studentName: '하윤', studentId: 's5',
    assignmentTitle: '극값과 변곡점 — 서술형 3제',
    submittedAt: '어제 23:01',
    type: 'essay', topic: '미적분 III · 극값',
    draftScore: 18, maxScore: 20, tier: 'T2', aiConfidence: 90,
    responsePreview: '극값 판정의 핵심은 도함수 부호 변화. 이계도함수는 변곡점 판정에 사용. 두 개념 혼동 주의.',
    draftComment: '핵심 메시지 3개 중 2개 정확히 회상. 변곡점 판정에서 부호 변화 명시 부족.',
    rubric: [
      { criterion: '개념 정확성', weight: 40, score: 38, reason: '정확' },
      { criterion: '예시 적절성', weight: 30, score: 25, reason: '예시 보강 가능' },
      { criterion: '표기 정확성', weight: 20, score: 19, reason: '거의 완벽' },
      { criterion: '논리 흐름',   weight: 10, score: 8,  reason: '명확' },
    ],
    status: 'approved',
  },
  {
    id: 'gr_006', studentName: '주원', studentId: 's6',
    assignmentTitle: '미분 — 정의 단답',
    submittedAt: '어제 21:00',
    type: 'short', topic: '미적분 III · 정의',
    draftScore: 10, maxScore: 10, tier: 'T1', aiConfidence: 99,
    responsePreview: '평균변화율의 극한',
    draftComment: '정확. T1 즉시 채점.',
    rubric: [
      { criterion: '키워드 일치', weight: 100, score: 100, reason: '완벽' },
    ],
    status: 'approved',
  },
];

export const gradingStats = {
  totalQueue: gradingQueue.filter(g => g.status === 'queue').length,
  inReview: gradingQueue.filter(g => g.status === 'reviewing').length,
  approved: gradingQueue.filter(g => g.status === 'approved' || g.status === 'overridden').length,
  /** 교사 평균 변경률 — 20% 넘으면 루브릭 재학습 제안 */
  avgOverrideRate: 8,
  rubricLearningThreshold: 20,
};

/* ============================================================
 * 템플릿 마켓
 * 핸드오프 4.10
 * ========================================================== */

export type TemplateKind = 'bot' | 'lesson' | 'quiz';

export type Template = {
  id: string;
  kind: TemplateKind;
  title: string;
  authorName: string;
  authorOrganization: string;
  /** 공식 검수 마크 */
  isOfficial?: boolean;
  /** 무료/유료 */
  pricing: 'free' | { krw: number };
  subject: string;
  grade: string;
  downloads: number;
  rating: number;          // 0~5 (소수점 1자리)
  ratingCount: number;
  description: string;
  highlights: string[];
  /** 마지막 업데이트 — "3일 전" */
  updatedAt: string;
};

export const templates: Template[] = [
  {
    id: 'tpl_001', kind: 'bot', title: '대치 미적분 — 풀이 절차 강조형',
    authorName: '김수학', authorOrganization: '대치프리미엄 수학학원',
    pricing: { krw: 39000 }, subject: '수학Ⅱ', grade: '고2',
    downloads: 1240, rating: 4.7, ratingCount: 92,
    description: '극값·변곡점 단원 5회차 강의 + 부호 변화 표 시연 자동 삽입. Scope L3 기본.',
    highlights: ['오답 클러스터 자동 감지', '부호 변화 표 시연 5종', '12회 수업 분량'],
    updatedAt: '3일 전',
  },
  {
    id: 'tpl_002', kind: 'bot', title: '공식 — EBS 수능특강 영어 빈칸',
    authorName: '풀림 공식', authorOrganization: 'curea',
    isOfficial: true, pricing: 'free', subject: '영어', grade: '고3',
    downloads: 8420, rating: 4.9, ratingCount: 412,
    description: '수능특강 빈칸 추론 220문항 RAG 인덱스 + 5단계 사고 유도 모드 사전 설정.',
    highlights: ['EBS 공식 라이센스', '5단계 힌트 사전 튜닝', '주제 이탈 차단 강화'],
    updatedAt: '오늘',
  },
  {
    id: 'tpl_003', kind: 'lesson', title: '도함수의 활용 — 8차시 교안 패키지',
    authorName: '박미적분', authorOrganization: '서울 모 고등학교',
    pricing: 'free', subject: '수학Ⅱ', grade: '고2',
    downloads: 530, rating: 4.5, ratingCount: 38,
    description: '극한·미분·도함수 활용까지 8차시 슬라이드 + 워크북 + 채점 루브릭 포함.',
    highlights: ['8차시 슬라이드', '워크북 PDF', '루브릭 4종'],
    updatedAt: '1주일 전',
  },
  {
    id: 'tpl_004', kind: 'quiz', title: '중간고사 대비 — 30문항 미적분 풀세트',
    authorName: '이수학', authorOrganization: '강남 분당 라인 강사',
    pricing: { krw: 9900 }, subject: '수학Ⅱ', grade: '고2',
    downloads: 2870, rating: 4.6, ratingCount: 215,
    description: '4월 중간고사 출제 경향 분석 기반. 객관식 22 + 단답 6 + 서술 2.',
    highlights: ['난이도 IRT 설정 완료', '오답 해설 자동 생성', '학교별 변형 지원'],
    updatedAt: '5일 전',
  },
  {
    id: 'tpl_005', kind: 'bot', title: '공식 — 한국사 흐름 잡기',
    authorName: '풀림 공식', authorOrganization: 'curea',
    isOfficial: true, pricing: 'free', subject: '한국사', grade: '고1',
    downloads: 3100, rating: 4.8, ratingCount: 158,
    description: '근현대사 흐름을 시대순 시각화 + 인물·사건 RAG. Scope L4 (사고 유도).',
    highlights: ['시대 타임라인 시각화', '인물 관계도', '수능 빈출 키워드 인덱싱'],
    updatedAt: '2주일 전',
  },
  {
    id: 'tpl_006', kind: 'quiz', title: 'O/X 30문항 — 통합과학 단원 점검',
    authorName: '정과학', authorOrganization: '온라인 강사',
    pricing: 'free', subject: '통합과학', grade: '고1',
    downloads: 720, rating: 4.3, ratingCount: 47,
    description: '통합과학 1학기 8개 단원 빠른 점검용 O/X 30문항. T1 즉시 채점.',
    highlights: ['T1 즉시 채점', '8개 단원 분류', '오답 누적 풀림 복습 연동'],
    updatedAt: '4일 전',
  },
];

export type MyTemplateUpload = {
  id: string;
  title: string;
  kind: TemplateKind;
  status: 'draft' | 'review' | 'published';
  downloads: number;
  earnings?: number;        // KRW (유료일 때)
};

export const myTemplateUploads: MyTemplateUpload[] = [
  { id: 'mt1', title: '대치 미적분 — 풀이 절차 강조형',  kind: 'bot',     status: 'published', downloads: 1240, earnings: 33_852_000 },
  { id: 'mt2', title: '극값과 변곡점 — 서술형 루브릭 v2', kind: 'lesson',  status: 'review',    downloads: 0 },
  { id: 'mt3', title: '미분 표기법 매칭 퀴즈',            kind: 'quiz',    status: 'draft',     downloads: 0 },
];

/* ============================================================
 * 봇 설정 — 7개 카테고리
 * 핸드오프 4.1 / 12.3
 * ========================================================== */

export type BotSettingsState = {
  identity: {
    name: string;
    avatarEmoji: string;
    persona: '정중' | '친근' | '스파르타';
    greeting: string;
  };
  voice: {
    enabled: boolean;
    /** 동의 상태 */
    consentGiven: boolean;
    /** 음성 ID */
    voiceId: 'tts-female-warm' | 'tts-male-firm' | 'cloned-teacher-001';
    /** 자동 삭제 기간 */
    autoDeleteDays: 30 | 90 | 365;
  };
  curriculum: {
    /** 3-Depth 분류 */
    subject: string;
    chapter: string;
    achievementCodes: string[];
    /** 업로드 자료 수 */
    assetCount: number;
    /** RAG 인덱스 갱신 — "오늘 14:20" */
    lastIndexedAt: string;
  };
  teaching: {
    style: '강의형' | '토론형' | '문제풀이형' | '혼합';
    defaultMode: '사고 유도 모드' | '가이드 모드' | '직접 답변 모드' | '시험 모드';
    /** 시간대별 자동 스위치 */
    autoScopeSwitch: { from: string; to: string; scope: ScopeLevel }[];
  };
  scope: {
    default: ScopeLevel;
    examMode: ScopeLevel;
    /** 변경 이력 마지막 — 감사 로그 */
    lastChangedAt: string;
    lastChangedBy: string;
  };
  evaluation: {
    rubricCount: number;
    autoFeedback: boolean;
    /** 교사 변경률 자동 학습 임계 */
    rubricLearningThreshold: number;
  };
  safety: {
    piiFilter: boolean;
    sensitiveBlock: boolean;
    /** 위기 키워드 즉시 알림 */
    crisisKeywords: string[];
    parentalConsent: boolean;
  };
  integration: {
    googleClassroom: 'connected' | 'disconnected';
    neis: 'connected' | 'pending' | 'disconnected';
    kakao: 'connected' | 'disconnected';
    zoom: 'connected' | 'disconnected';
  };
};

export const botSettings: BotSettingsState = {
  identity: {
    name: '수학이 형',
    avatarEmoji: '🧑‍🏫',
    persona: '친근',
    greeting: '서연 안녕! 수학이 형이야 🙌 오늘도 같이 풀어보자.',
  },
  voice: {
    enabled: true,
    consentGiven: true,
    voiceId: 'cloned-teacher-001',
    autoDeleteDays: 30,
  },
  curriculum: {
    subject: '수학Ⅱ',
    chapter: '미적분 III · 도함수의 활용',
    achievementCodes: ['수2-3-1', '수2-3-2', '수2-3-3'],
    assetCount: 47,
    lastIndexedAt: '오늘 14:20',
  },
  teaching: {
    style: '문제풀이형',
    defaultMode: '사고 유도 모드',
    autoScopeSwitch: [
      { from: '08:00', to: '17:00', scope: 3 },
      { from: '19:00', to: '22:00', scope: 3 },
      { from: '22:00', to: '24:00', scope: 5 },
    ],
  },
  scope: {
    default: 3,
    examMode: 1,
    lastChangedAt: '어제 18:55',
    lastChangedBy: '김수학 선생님',
  },
  evaluation: {
    rubricCount: 4,
    autoFeedback: true,
    rubricLearningThreshold: 20,
  },
  safety: {
    piiFilter: true,
    sensitiveBlock: true,
    crisisKeywords: ['자살', '죽고싶', '우울', '폭력'],
    parentalConsent: true,
  },
  integration: {
    googleClassroom: 'connected',
    neis: 'pending',
    kakao: 'connected',
    zoom: 'disconnected',
  },
};

/* ============================================================
 * 과제 (Assignment) — 학생이 풀이 워크스페이스에 들어갈 때의 컨텍스트.
 * 봇·교사 → 학생 → /q/infinity/solve 로 흘러가는 1급 엔티티.
 * ========================================================== */

export type AssignmentMode = 'practice' | 'exam' | 'wrong-conquest';
export type AssignmentSource = 'teacher-assigned' | 'bot-prescribed' | 'self';

export type Assignment = {
  id: string;
  botId: string;
  /** 학생이 보는 짧은 제목 */
  title: string;
  /** 단원 한 줄 — "미적분 III · 극값~변곡점" */
  scope: string;
  subject: string;
  grade: string;
  /** 3-Depth — 이 풀이가 어디서 시작/끝 */
  chapterFrom: string;
  chapterTo: string;
  achievementCodes: string[];
  questionCount: number;
  difficulty: '하' | '중' | '상';
  mode: AssignmentMode;
  /** 모의고사·시험은 일시적으로 Scope L1 강제 */
  scopeOverride?: ScopeLevel;
  source: AssignmentSource;
  /** 발송 주체 — 학생이 보는 이름 */
  assignedBy: string;
  /** "오늘 19:50" / "어제 21:00" */
  assignedAt: string;
  /** "내일 22:00" / "5/8 19:00" / "오늘 안에" */
  dueLabel: string;
  /** "D-1" / "D-9" / "오늘" */
  dDay: string;
  /** 학생의 진행도 */
  completedCount: number;
  /** 지금까지 정답률 (있으면) */
  recentAccuracy?: number;
  /** 상태 — 학생 시점 */
  state: 'todo' | 'in-progress' | 'submitted' | 'overdue';
  /** 봇이 추가한 이유 (bot-prescribed) */
  reasonHint?: string;
  /** 풀이 워크스페이스 deep link */
  solveHref: string;
};

/** 학생(서연)에게 발송된 과제 — 진입점 정렬: 가장 급한 것 위에 */
export const studentAssignments: Assignment[] = [
  {
    id: 'as_today',
    botId: 'cb_001',
    title: '도함수 활용 마무리',
    scope: '미적분 III · 극값~변곡점',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '미적분 III · 도함수의 활용 · 극값',
    chapterTo: '미적분 III · 도함수의 활용 · 변곡점',
    achievementCodes: ['수2-3-2', '수2-3-3'],
    questionCount: 20,
    difficulty: '중',
    mode: 'practice',
    source: 'teacher-assigned',
    assignedBy: '수학이 형',
    assignedAt: '오늘 19:50',
    dueLabel: '내일 22:00',
    dDay: 'D-1',
    completedCount: 8,
    recentAccuracy: 75,
    state: 'in-progress',
    solveHref: '/classbot/assignment/as_today/solve?step=9',
  },
  {
    id: 'as_prescription',
    botId: 'cb_001',
    title: '부호 변화 패턴 정복',
    scope: '극값 판정 · 자주 막힌 단계',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '미적분 III · 도함수의 활용 · 극값',
    chapterTo: '미적분 III · 도함수의 활용 · 극값',
    achievementCodes: ['수2-3-2'],
    questionCount: 5,
    difficulty: '중',
    mode: 'wrong-conquest',
    source: 'bot-prescribed',
    assignedBy: '수학이 형',
    assignedAt: '오늘 19:55',
    dueLabel: '오늘 안에',
    dDay: '오늘',
    completedCount: 0,
    state: 'todo',
    reasonHint: '어제 부호 변화 표 단계에서 5번 중 4번 막혔어요. 같은 패턴 5문항만 더.',
    solveHref: '/classbot/assignment/as_prescription/solve?step=1',
  },
  {
    id: 'as_exam_prep',
    botId: 'cb_001',
    title: '5월 학평 모의 — 미적분 종합',
    scope: '미적분 II · 극한 ~ III · 도함수 활용',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '미적분 II · 함수의 극한',
    chapterTo: '미적분 III · 도함수의 활용',
    achievementCodes: ['수2-2-1', '수2-2-2', '수2-3-1', '수2-3-2', '수2-3-3'],
    questionCount: 30,
    difficulty: '상',
    mode: 'exam',
    scopeOverride: 1,
    source: 'teacher-assigned',
    assignedBy: '수학이 형',
    assignedAt: '어제 22:10',
    dueLabel: '5/8 19:00',
    dDay: 'D-9',
    completedCount: 0,
    state: 'todo',
    solveHref: '/classbot/assignment/as_exam_prep/solve?step=1',
  },
];

/** 가장 급한 과제 — 학생 홈 hero · chat 상단 진행도 */
export function pickPrimaryAssignment(): Assignment {
  return studentAssignments[0];
}

/** 전체 과제 통계 — 학생 홈/봇 채팅 상단에 미니 표시 */
export const studentAssignmentStats = {
  total: studentAssignments.length,
  inProgress: studentAssignments.filter(a => a.state === 'in-progress').length,
  todo: studentAssignments.filter(a => a.state === 'todo').length,
  totalQuestions: studentAssignments.reduce((s, a) => s + a.questionCount, 0),
  completed: studentAssignments.reduce((s, a) => s + a.completedCount, 0),
};

/* ============================================================
 * 과제 문항 시드 — 풀이 워크스페이스용 (spec 12)
 * ========================================================== */

export type QuestionType = 'mc' | 'short' | 'essay' | 'numeric';

export type AssignmentQuestion = {
  id: string;
  assignmentId: string;
  order: number;          // 1-indexed
  type: QuestionType;
  prompt: string;
  /** 객관식 보기 */
  options?: string[];
  answerIndex?: number;   // 객관식 정답 인덱스
  /** 단답·수치 정답 */
  answerKey?: string;
  /** 서술형 기준 응답 (Scope L5에서만 노출) */
  modelAnswer?: string;
  /** 봇 힌트 5단계 (practice 모드 한정) */
  hints?: string[];
};

export const assignmentQuestions: AssignmentQuestion[] = [
  // as_today (practice, 20문항 중 시드 5문항만)
  {
    id: 'q_today_1', assignmentId: 'as_today', order: 1, type: 'mc',
    prompt: 'f(x) = x³ − 3x² + 1 의 극댓값은?',
    options: ['1', '−3', '5', '−2'],
    answerIndex: 0,
    modelAnswer: 'f\'(x) = 3x² − 6x = 3x(x−2). 부호 변화로 x=0에서 극대, x=2에서 극소. f(0) = 1.',
    hints: [
      '도함수를 먼저 구해봐.',
      '도함수가 0이 되는 x를 찾고, 그 주변 부호 변화를 봐.',
      'x=0, x=2가 후보. 좌우 부호 변화 표를 그려봐.',
      'x=0에서 좌 +, 우 −이니 극대. 그때 함수값을 계산하면?',
      'f(0) = 0³ − 3·0² + 1 = 1. 답은 1.',
    ],
  },
  {
    id: 'q_today_2', assignmentId: 'as_today', order: 2, type: 'mc',
    prompt: 'f\'(a) = 0 이지만 x=a가 극값이 아닌 경우는?',
    options: ['좌우 부호 동일', '함수가 불연속', '이계도함수 = 0', '정의역 끝점'],
    answerIndex: 0,
    modelAnswer: '도함수가 0이어도 좌우 부호가 같으면 극값이 아니다. y = x³의 x = 0이 대표적 반례.',
    hints: [
      'y = x³ 그래프를 떠올려봐.',
      'x = 0에서 도함수는 0이지만 그래프는 단조 증가야.',
      '부호 변화가 없으면 극값일까?',
      '좌우 부호가 같으면 극값이 아니야 — 변곡점일 수 있어.',
      '답: 좌우 부호 동일. y = x³가 대표 예시.',
    ],
  },
  {
    id: 'q_today_3', assignmentId: 'as_today', order: 3, type: 'short',
    prompt: '함수 f(x) = x⁴ − 4x³ 의 변곡점의 x좌표를 모두 구하시오.',
    answerKey: '0, 2',
    modelAnswer: 'f"(x) = 12x² − 24x = 12x(x−2). x=0, x=2 양쪽에서 부호가 바뀌므로 둘 다 변곡점.',
    hints: [
      '변곡점 판정은 이계도함수 부호 변화로.',
      '먼저 f"(x)를 구해봐.',
      'f"(x) = 12x(x−2). 0이 되는 x는?',
      'x=0, x=2 후보. 각각 좌우 부호 변화를 확인해봐.',
      '둘 다 부호 변화가 있으니 변곡점은 x=0, 2.',
    ],
  },
  {
    id: 'q_today_4', assignmentId: 'as_today', order: 4, type: 'essay',
    prompt: '극값과 변곡점의 차이를 정의·판정 방법·대표 예시 3가지로 서술하시오.',
    modelAnswer: '극값은 함수 값의 국소 최대·최소(도함수 부호 변화), 변곡점은 그래프의 휘는 방향이 바뀌는 점(이계도함수 부호 변화). 예: f(x) = x³의 x=0은 도함수 0이지만 극값 아닌 변곡점.',
    hints: [
      '정의부터 — 극값은 "값", 변곡점은 "휘어짐".',
      '판정 — 극값은 1차, 변곡점은 2차 도함수.',
      '예시는 부호 변화 있는 것과 없는 것 비교가 좋아.',
      'y = x³의 x = 0 예시는 둘의 차이를 한 번에 보여줘.',
      '3요소(정의·판정·예시)를 한 단락으로 정리하면 만점.',
    ],
  },
  {
    id: 'q_today_5', assignmentId: 'as_today', order: 5, type: 'mc',
    prompt: 'f(x) = x³ − 6x² + 9x + 1 의 극댓값과 극솟값의 합은?',
    options: ['1', '5', '6', '8'],
    answerIndex: 2,
    modelAnswer: 'f\'(x) = 3x² − 12x + 9 = 3(x−1)(x−3). x=1 극대 (f(1)=5), x=3 극소 (f(3)=1). 합 = 6.',
    hints: [
      'f\'(x)를 인수분해해봐.',
      'x = 1, x = 3이 후보.',
      'x = 1에서 극대, x = 3에서 극소.',
      'f(1) = 5, f(3) = 1.',
      '5 + 1 = 6.',
    ],
  },
  // as_prescription (wrong-conquest, 5문항)
  {
    id: 'q_pres_1', assignmentId: 'as_prescription', order: 1, type: 'short',
    prompt: 'f(x) = x³의 x = 0에서 극값인지 답하시오.',
    answerKey: '아니다',
    modelAnswer: 'f\'(0) = 0이지만 좌우 부호 변화가 없어 극값이 아니다. 변곡점일 뿐.',
  },
  {
    id: 'q_pres_2', assignmentId: 'as_prescription', order: 2, type: 'short',
    prompt: 'f(x) = x⁴의 x = 0에서 극값인지 답하시오.',
    answerKey: '극소',
    modelAnswer: 'f\'(0) = 0, 좌 −, 우 + 부호 변화가 있어 극소.',
  },
  {
    id: 'q_pres_3', assignmentId: 'as_prescription', order: 3, type: 'mc',
    prompt: 'f\'(x) = (x−1)²(x−3) 의 극값 개수는?',
    options: ['0개', '1개', '2개', '3개'],
    answerIndex: 1,
    modelAnswer: 'x=1은 중근이라 부호 변화 없음 (극값 아님), x=3에서만 부호 변화 → 극값 1개.',
  },
  {
    id: 'q_pres_4', assignmentId: 'as_prescription', order: 4, type: 'short',
    prompt: 'f\'(x) = x(x+2)² 일 때 극값을 갖는 x좌표는?',
    answerKey: '0',
    modelAnswer: 'x = −2는 중근이라 부호 변화 없음, x = 0에서만 부호가 −에서 +로 → 극소.',
  },
  {
    id: 'q_pres_5', assignmentId: 'as_prescription', order: 5, type: 'mc',
    prompt: '도함수가 0인 모든 점이 극값이라는 명제는?',
    options: ['참', '거짓', '함수에 따라', '판단 불가'],
    answerIndex: 1,
    modelAnswer: '부호 변화가 있어야만 극값. y = x³의 x=0이 반례. 거짓.',
  },
  // as_exam_prep (exam, 첫 3문항만 시드)
  {
    id: 'q_exam_1', assignmentId: 'as_exam_prep', order: 1, type: 'mc',
    prompt: 'lim(x→0) (sin 2x) / x 의 값은?',
    options: ['0', '1', '2', '∞'],
    answerIndex: 2,
  },
  {
    id: 'q_exam_2', assignmentId: 'as_exam_prep', order: 2, type: 'short',
    prompt: 'f(x) = x³ − 3x 의 극댓값을 구하시오.',
    answerKey: '2',
  },
  {
    id: 'q_exam_3', assignmentId: 'as_exam_prep', order: 3, type: 'essay',
    prompt: '함수의 연속성과 미분가능성의 관계를 예시와 함께 서술하시오.',
  },
];

export function getQuestionsByAssignment(assignmentId: string): AssignmentQuestion[] {
  return assignmentQuestions
    .filter(q => q.assignmentId === assignmentId)
    .sort((a, b) => a.order - b.order);
}

export function getAssignmentById(id: string): Assignment | undefined {
  return studentAssignments.find(a => a.id === id);
}

/* ============================================================
 * 채점 허브 — 학생별 최근 채점 이력 (spec 11 사이드 패널)
 * ========================================================== */

export type GradingHistoryEntry = {
  studentId: string;
  assignmentTitle: string;
  gradedAt: string;     // "1주 전" / "3일 전"
  score: number;
  maxScore: number;
};

export const gradingHistory: GradingHistoryEntry[] = [
  { studentId: 's13', assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 8,  maxScore: 10 },
  { studentId: 's13', assignmentTitle: '극한 — 서술형 2제',         gradedAt: '5일 전', score: 16, maxScore: 20 },
  { studentId: 's13', assignmentTitle: '도함수 활용 — 객관식 10',   gradedAt: '3일 전', score: 9,  maxScore: 10 },
  { studentId: 's1',  assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 9,  maxScore: 10 },
  { studentId: 's1',  assignmentTitle: '극한 — 서술형 2제',         gradedAt: '5일 전', score: 18, maxScore: 20 },
  { studentId: 's1',  assignmentTitle: '도함수 활용 — 객관식 10',   gradedAt: '3일 전', score: 10, maxScore: 10 },
  { studentId: 's2',  assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 6,  maxScore: 10 },
  { studentId: 's2',  assignmentTitle: '극한 — 서술형 2제',         gradedAt: '5일 전', score: 11, maxScore: 20 },
  { studentId: 's2',  assignmentTitle: '도함수 활용 — 객관식 10',   gradedAt: '3일 전', score: 7,  maxScore: 10 },
  { studentId: 's4',  assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 5,  maxScore: 10 },
  { studentId: 's4',  assignmentTitle: '극한 — 서술형 2제',         gradedAt: '5일 전', score: 9,  maxScore: 20 },
  { studentId: 's4',  assignmentTitle: '도함수 활용 — 객관식 10',   gradedAt: '3일 전', score: 6,  maxScore: 10 },
  { studentId: 's5',  assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 10, maxScore: 10 },
  { studentId: 's5',  assignmentTitle: '극한 — 서술형 2제',         gradedAt: '5일 전', score: 19, maxScore: 20 },
  { studentId: 's6',  assignmentTitle: '미분 — 정의 단답',          gradedAt: '1주 전', score: 8,  maxScore: 10 },
];

/** overridden 시연용 1건 추가 — 변경률 24% (루브릭 재학습 임계 초과) */
export const overriddenSample: GradingItem = {
  id: 'gr_007', studentName: '나린', studentId: 's9',
  assignmentTitle: '극값과 변곡점 — 서술형 3제',
  submittedAt: '어제 20:10',
  type: 'essay', topic: '미적분 III · 극값',
  draftScore: 14, maxScore: 20, tier: 'T2', aiConfidence: 71,
  responsePreview: '극값은 도함수가 0인 점. 변곡점은 이계도함수가 0인 점.',
  draftComment: '정의 부분 정확하나 "부호 변화" 누락. 기준 답안에 핵심 누락.',
  rubric: [
    { criterion: '개념 정확성', weight: 40, score: 26, reason: '부호 변화 누락' },
    { criterion: '예시 적절성', weight: 30, score: 20, reason: '예시 부족' },
    { criterion: '표기 정확성', weight: 20, score: 18, reason: '오타 1회' },
    { criterion: '논리 흐름',   weight: 10, score: 8,  reason: '나열식' },
  ],
  status: 'overridden',
  overrideDelta: 24,
};

/* ============================================================
 * 감정 체크인 + 웰빙 스냅샷 + 위기 알림 (spec 13)
 * ========================================================== */

export type EmotionMood = 1 | 2 | 3 | 4;

export const moodMeta: Record<EmotionMood, { emoji: string; label: string; tone: string }> = {
  1: { emoji: '😄', label: '좋아',       tone: 'blue-500' },
  2: { emoji: '🙂', label: '그럭저럭',   tone: 'blue-300' },
  3: { emoji: '😐', label: '그저그래',   tone: 'slate' },
  4: { emoji: '😔', label: '힘들었어',   tone: 'blue-700' },
};

export type EmotionCheckIn = {
  id: string;
  studentId: string;
  date: string;            // "2026-05-11"
  daysAgo: number;         // 0 = 오늘
  mood: EmotionMood;
  /** legacy 단일 강도 — 기존 시드 호환용 */
  intensity?: number;      // 1~5
  /** 2026-05-18~ dual-thumb로 입력되는 하루 변동 폭 [low, high] */
  intensityRange?: [number, number];
  freeText?: string;
  keywordFlag?: 'suicidal' | 'depression' | 'bullying' | null;
};

/** 학생별 7일 감정 기록 — 도현 3일 연속 "힘듦", 예은 무응답 시나리오 */
export const emotionCheckIns: EmotionCheckIn[] = [
  // 서연 (s1) — 안정
  { id: 'em_s1_0', studentId: 's1', date: '2026-05-11', daysAgo: 0, mood: 2, intensity: 3 },
  { id: 'em_s1_1', studentId: 's1', date: '2026-05-10', daysAgo: 1, mood: 2 },
  { id: 'em_s1_2', studentId: 's1', date: '2026-05-09', daysAgo: 2, mood: 1, freeText: '시험 잘 봤어!' },
  { id: 'em_s1_3', studentId: 's1', date: '2026-05-08', daysAgo: 3, mood: 2 },
  { id: 'em_s1_4', studentId: 's1', date: '2026-05-07', daysAgo: 4, mood: 3 },
  { id: 'em_s1_5', studentId: 's1', date: '2026-05-06', daysAgo: 5, mood: 2 },
  { id: 'em_s1_6', studentId: 's1', date: '2026-05-05', daysAgo: 6, mood: 1 },
  // 민준 (s2)
  { id: 'em_s2_0', studentId: 's2', date: '2026-05-11', daysAgo: 0, mood: 3, intensity: 3 },
  { id: 'em_s2_1', studentId: 's2', date: '2026-05-10', daysAgo: 1, mood: 3 },
  { id: 'em_s2_2', studentId: 's2', date: '2026-05-09', daysAgo: 2, mood: 2 },
  // 도현 (s4) — 3일 연속 "힘듦" 시나리오
  { id: 'em_s4_0', studentId: 's4', date: '2026-05-11', daysAgo: 0, mood: 4, intensity: 4, freeText: '오늘도 너무 어려워요...' },
  { id: 'em_s4_1', studentId: 's4', date: '2026-05-10', daysAgo: 1, mood: 4, intensity: 4, freeText: '잠이 안 와요' },
  { id: 'em_s4_2', studentId: 's4', date: '2026-05-09', daysAgo: 2, mood: 4, intensity: 3 },
  { id: 'em_s4_3', studentId: 's4', date: '2026-05-08', daysAgo: 3, mood: 3 },
  { id: 'em_s4_4', studentId: 's4', date: '2026-05-07', daysAgo: 4, mood: 3 },
  // 하윤 (s5)
  { id: 'em_s5_0', studentId: 's5', date: '2026-05-11', daysAgo: 0, mood: 1, intensity: 4 },
  { id: 'em_s5_1', studentId: 's5', date: '2026-05-10', daysAgo: 1, mood: 2 },
  // 예은 (s7) — 무응답 → 데이터 없음 (의도적)
];

export type WellbeingSnapshot = {
  studentId: string;
  daysAgo: number;
  score: number;        // 0~100
  flag?: 'below-60-3days' | 'below-40-instant' | null;
};

export const wellbeingSnapshots: WellbeingSnapshot[] = [
  // 서연 — 안정
  ...[78, 76, 80, 79, 75, 77, 78].map((score, i) => ({ studentId: 's1', daysAgo: i, score })),
  // 민준
  ...[62, 64, 60, 65, 67, 63, 61].map((score, i) => ({ studentId: 's2', daysAgo: i, score })),
  // 도현 — 임계 미달 3일 지속
  { studentId: 's4', daysAgo: 0, score: 48, flag: 'below-60-3days' },
  { studentId: 's4', daysAgo: 1, score: 52, flag: 'below-60-3days' },
  { studentId: 's4', daysAgo: 2, score: 58, flag: 'below-60-3days' },
  { studentId: 's4', daysAgo: 3, score: 62 },
  { studentId: 's4', daysAgo: 4, score: 65 },
  { studentId: 's4', daysAgo: 5, score: 70 },
  { studentId: 's4', daysAgo: 6, score: 72 },
  // 예은 — 즉시 알림 (40 미만)
  { studentId: 's7', daysAgo: 0, score: 38, flag: 'below-40-instant' },
  { studentId: 's7', daysAgo: 1, score: 42 },
  { studentId: 's7', daysAgo: 2, score: 50 },
];

export function getWellbeingTrend(studentId: string): WellbeingSnapshot[] {
  return wellbeingSnapshots
    .filter(w => w.studentId === studentId)
    .sort((a, b) => b.daysAgo - a.daysAgo);
}

export function getCheckInsForStudent(studentId: string): EmotionCheckIn[] {
  return emotionCheckIns
    .filter(e => e.studentId === studentId)
    .sort((a, b) => a.daysAgo - b.daysAgo);
}

export type CrisisAlert = {
  id: string;
  studentId: string;
  triggerType: 'keyword' | 'wellbeing-threshold' | 'manual';
  severity: 1 | 2 | 3 | 4 | 5;
  detectedAt: string;
  summary: string;
  notifiedTeacher: boolean;
  notifiedParent: boolean;
  notifiedWeeCenter: boolean;
  resolved: boolean;
};

export const crisisAlerts: CrisisAlert[] = [
  {
    id: 'ca_001', studentId: 's4',
    triggerType: 'wellbeing-threshold', severity: 3,
    detectedAt: '오늘 09:12',
    summary: '웰빙 지수 3일 연속 60 미만 + 감정 체크인 "힘듦" 누적',
    notifiedTeacher: true, notifiedParent: false, notifiedWeeCenter: false,
    resolved: false,
  },
  {
    id: 'ca_002', studentId: 's7',
    triggerType: 'wellbeing-threshold', severity: 4,
    detectedAt: '오늘 08:45',
    summary: '웰빙 지수 38 — 즉시 알림 임계 미달. 22분 무응답 동반.',
    notifiedTeacher: true, notifiedParent: true, notifiedWeeCenter: false,
    resolved: false,
  },
];

/** 학부모 발송 카카오 BIZ 미리보기 템플릿 */
export function buildParentMessage(report: ReportSummary): string {
  const kpiLines = report.kpis.slice(0, 4)
    .map(k => `${k.label} ${k.value}${k.trend === 'up' ? ' ↑' : k.trend === 'down' ? ' ↓' : ''}`)
    .join('\n');
  return `[풀림 클래스봇] ${report.title}

${kpiLines}

자세히 보기: https://pullim.app/r/${report.id}
이번 주 정말 수고했어요. 다음 주에도 함께해요.`;
}

/** 학생 본인 시점 (서연 — currentPersona) — 오늘 체크인 완료 여부 */
export function hasTodayCheckIn(studentId: string): boolean {
  return emotionCheckIns.some(e => e.studentId === studentId && e.daysAgo === 0);
}
