/**
 * 풀림 공식 커리큘럼 튜터 라이브러리 — 플랫폼 저작 자기주도 모드 봇.
 * 교사가 개설하는 classBots(cb_*)와 달리 풀림 플랫폼이 직접 제공하는 공식 봇(ot_*).
 */

import type { ClassBot } from './classbot';
import type { ClassbotQuickPrompt } from './chat';
import type { ScopeLevel } from './tutor';

export type TutorUnit = {
  id: string;
  title: string;
  order: number;
};

export type OfficialTutor = ClassBot & {
  tagline: string;
  curriculum: TutorUnit[];
};

export const officialTutors: OfficialTutor[] = [
  {
    // ── 수학 ────────────────────────────────────────────────────────────────
    id: 'ot_001',
    name: '수학 마스터',
    avatarEmoji: '📐',
    teacherName: '풀림 공식',
    organization: '풀림',
    subject: '수학',
    grade: '중·고 전학년',
    tone: '차분',
    greeting:
      '안녕하세요. 풀림 공식 수학 튜터입니다. ' +
      '개념부터 심화 문제까지 단계적으로 안내해 드립니다. ' +
      '어떤 단원이 막히는지 구체적으로 알려주시면, 원리부터 차근히 짚어 드릴게요. ' +
      '모든 교과·학습 관련 질문에 답할 수 있습니다.',
    quickPrompts: [
      { text: '이차함수 그래프 어떻게 그려요?', expectedReplyKey: 'extremum' },
      { text: '오늘 배운 개념 정리해줘요',       expectedReplyKey: 'today_summary' },
      { text: '수능 수학 대비 전략이 뭔가요?',   expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 건가요?',           expectedReplyKey: 'reassurance' },
    ] satisfies ClassbotQuickPrompt[],
    scope: 4 as ScopeLevel,
    isLive: false,
    enrolledCount: 0,
    tagline: '개념부터 수능까지 — 체계적인 수학 커리큘럼',
    curriculum: [
      { id: 'ot_001_u1', title: '수와 연산 기초', order: 1 },
      { id: 'ot_001_u2', title: '함수와 그래프', order: 2 },
      { id: 'ot_001_u3', title: '미적분 개념과 활용', order: 3 },
      { id: 'ot_001_u4', title: '확률과 통계', order: 4 },
      { id: 'ot_001_u5', title: '수능 실전 문제 전략', order: 5 },
    ],
  },
  {
    // ── 영어 ────────────────────────────────────────────────────────────────
    id: 'ot_002',
    name: '영어 마스터',
    avatarEmoji: '📖',
    teacherName: '풀림 공식',
    organization: '풀림',
    subject: '영어',
    grade: '중·고 전학년',
    tone: '정중',
    greeting:
      '안녕하세요, 풀림 공식 영어 튜터입니다. ' +
      '독해·문법·어휘부터 수능 유형별 풀이 전략까지 체계적으로 도와드립니다. ' +
      '궁금한 지문이나 유형이 있으면 편하게 가져와 주세요. ' +
      '모든 학습 관련 질문에 성실히 답해 드릴게요.',
    quickPrompts: [
      { text: '빈칸 추론 유형 어떻게 풀어요?', expectedReplyKey: 'blank_inference' },
      { text: '오늘 학습 내용 요약해줘요',       expectedReplyKey: 'today_summary' },
      { text: '수능 영어 고득점 전략이 뭔가요?', expectedReplyKey: 'exam_prep' },
      { text: '저 잘하고 있는 건가요?',           expectedReplyKey: 'reassurance' },
    ] satisfies ClassbotQuickPrompt[],
    scope: 4 as ScopeLevel,
    isLive: false,
    enrolledCount: 0,
    tagline: '독해부터 수능까지 — 영어 실력을 한 단계 올리는 커리큘럼',
    curriculum: [
      { id: 'ot_002_u1', title: '핵심 문법 & 구문', order: 1 },
      { id: 'ot_002_u2', title: '어휘 확장 & 어원', order: 2 },
      { id: 'ot_002_u3', title: '독해 전략 & 유형별 접근', order: 3 },
      { id: 'ot_002_u4', title: '수능 빈출 유형 집중 훈련', order: 4 },
    ],
  },
  {
    // ── 과학 ────────────────────────────────────────────────────────────────
    id: 'ot_003',
    name: '과학 마스터',
    avatarEmoji: '🔬',
    teacherName: '풀림 공식',
    organization: '풀림',
    subject: '과학',
    grade: '중·고 전학년',
    tone: '열정',
    greeting:
      '안녕! 풀림 공식 과학 튜터야. ' +
      '물리·화학·생명·지구과학 모두 커버해. ' +
      '개념이 헷갈리면 바로 물어봐 — 실생활 예시랑 같이 확 뚫어줄게. ' +
      '모든 교과·학습 관련 질문 다 받아.',
    quickPrompts: [
      { text: '전기회로 원리 처음부터 알려줘', expectedReplyKey: 'circuit' },
      { text: '오늘 배운 내용 정리해줘',       expectedReplyKey: 'today_summary' },
      { text: '내신·수능 과학 어떻게 대비해?', expectedReplyKey: 'exam_prep' },
      { text: '나 잘하고 있는 거야?',           expectedReplyKey: 'reassurance' },
    ] satisfies ClassbotQuickPrompt[],
    scope: 4 as ScopeLevel,
    isLive: false,
    enrolledCount: 0,
    tagline: '실험부터 수능까지 — 원리로 이해하는 과학 커리큘럼',
    curriculum: [
      { id: 'ot_003_u1', title: '통합과학 핵심 개념', order: 1 },
      { id: 'ot_003_u2', title: '물리학 — 힘·운동·에너지', order: 2 },
      { id: 'ot_003_u3', title: '화학 — 물질과 반응', order: 3 },
      { id: 'ot_003_u4', title: '생명과학 & 지구과학', order: 4 },
      { id: 'ot_003_u5', title: '수능 과학탐구 실전 전략', order: 5 },
    ],
  },
];

export function getOfficialTutors(): OfficialTutor[] {
  return officialTutors;
}

export function getOfficialTutor(id: string): OfficialTutor | undefined {
  return officialTutors.find((t) => t.id === id);
}
