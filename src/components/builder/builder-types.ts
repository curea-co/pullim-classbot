import {
  IdCard, Mic, BookOpen, GraduationCap, Shield, ClipboardCheck, Lock, Rocket,
  HandHeart, Flame, MessagesSquare, Pencil, Layers,
  type LucideIcon,
} from 'lucide-react';

/**
 * 봇 빌더 8단계 폼 데이터 타입.
 * 핸드오프 4.1.
 */

export type BotTone = 'formal' | 'friendly' | 'spartan';
export type VoicePreset = 'tts1' | 'tts2' | 'tts3' | 'tts4' | 'tts5' | 'clone';
export type TeachingStyle = 'lecture' | 'discussion' | 'problem' | 'mixed';
export type FeedbackStyle = 'guide' | 'direct' | 'hybrid';

export type UploadedFile = {
  name: string;
  size: string;          // "1.2MB"
  type: 'ppt' | 'pdf' | 'note' | 'video';
};

export type BuilderForm = {
  // Step 1
  name: string;
  subject: string;
  grade: string;
  tone: BotTone;
  // Step 2
  voiceMode: 'preset' | 'clone';
  voicePreset: VoicePreset;
  // Step 3
  files: UploadedFile[];
  // Step 4
  teachingStyle: TeachingStyle;
  // Step 5
  scopeDefault: 1 | 2 | 3 | 4 | 5;
  scopeAutoSwitch: boolean;
  // Step 6
  rubric: { participation: number; thinking: number; mission: number; selfDir: number; team: number };
  feedbackStyle: FeedbackStyle;
  // Step 7
  filterPii: boolean;
  filterHarmful: boolean;
  weeIntegration: boolean;
  // Step 8
  classrooms: string[];
};

export const initialForm: BuilderForm = {
  name: '',
  subject: '수학Ⅱ',
  grade: '고2',
  tone: 'friendly',
  voiceMode: 'preset',
  voicePreset: 'tts1',
  files: [
    { name: '미적분_3장_도함수의_활용.pdf', size: '4.2MB', type: 'pdf' },
    { name: '극값_부호변화표_예시.pptx', size: '2.1MB', type: 'ppt' },
  ],
  teachingStyle: 'mixed',
  scopeDefault: 3,
  scopeAutoSwitch: true,
  rubric: { participation: 20, thinking: 30, mission: 30, selfDir: 10, team: 10 },
  feedbackStyle: 'guide',
  filterPii: true,
  filterHarmful: true,
  weeIntegration: true,
  classrooms: ['고2-A반'],
};

export const toneMeta: Record<BotTone, { label: string; Icon: LucideIcon; description: string }> = {
  formal:   { label: '정중', Icon: GraduationCap, description: '"~합니다" 종결 · 학원 강사 톤' },
  friendly: { label: '친근', Icon: HandHeart,     description: '"~할게" 반말 가능 · 친구 같은' },
  spartan:  { label: '스파르타', Icon: Flame,     description: '단호 · 직설 · 채찍질' },
};

export const teachingStyleMeta: Record<TeachingStyle, { label: string; Icon: LucideIcon; description: string }> = {
  lecture:    { label: '강의형',    Icon: GraduationCap,  description: '교사 주도 · 개념 설명 위주' },
  discussion: { label: '토론형',    Icon: MessagesSquare, description: '소크라테스식 질문 · 학생 답변 유도' },
  problem:    { label: '문제풀이형', Icon: Pencil,         description: '풀이 시연 · 학생 따라 풀기' },
  mixed:      { label: '혼합',      Icon: Layers,         description: '단원·시간대별 자동 전환' },
};

export const voicePresetMeta: Record<VoicePreset, { label: string; description: string }> = {
  tts1: { label: '차분 남성',  description: 'Standard A · 30대 톤' },
  tts2: { label: '경쾌 여성',  description: 'Standard B · 20대 톤' },
  tts3: { label: '중후 남성',  description: 'Premium C · 40대 톤' },
  tts4: { label: '친근 여성',  description: 'Premium D · 30대 톤' },
  tts5: { label: '활기 남성',  description: 'Premium E · 20대 톤' },
  clone: { label: '내 음성 복제', description: '교사 동의 후 ElevenLabs · 실험 기능' },
};

export const feedbackStyleMeta: Record<FeedbackStyle, { label: string; description: string }> = {
  guide:  { label: '사고 유도',  description: '오답에 답을 주지 않음 · 5단계 힌트' },
  direct: { label: '직접 설명',  description: '오답 즉시 정답·해설 제공' },
  hybrid: { label: '하이브리드', description: '난이도 따라 자동 전환' },
};

export type StepInfo = {
  num: number;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export const stepConfig: readonly StepInfo[] = [
  { num: 1, label: '정체성', icon: IdCard,         title: '봇 정체성',           description: '이름·과목·학년·톤을 정해 학생이 만날 봇의 첫인상을 만들어요.' },
  { num: 2, label: '목소리', icon: Mic,            title: '목소리 · 페르소나',   description: '5종 TTS 프리셋 또는 교사 음성 복제(베타)로 봇 목소리 결정.' },
  { num: 3, label: '교안',   icon: BookOpen,       title: '교안 업로드',         description: 'PPT·PDF·필기·녹화를 업로드 → RAG 인덱스가 됩니다. 봇은 이 자료 안에서만 답변.' },
  { num: 4, label: '수업',   icon: GraduationCap,  title: '수업 방식',           description: '강의/토론/문제풀이/혼합 — 봇이 학생을 어떻게 가르칠지 설정.' },
  { num: 5, label: '권한',   icon: Shield,         title: 'Scope Guard',         description: 'L1(전부 차단) ~ L5(완전 개방). 시간대별 자동 스위치 가능.' },
  { num: 6, label: '평가',   icon: ClipboardCheck, title: '평가 기준',           description: '5가지 루브릭 가중치를 합 100%로 분배 + 피드백 스타일 선택.' },
  { num: 7, label: '안전',   icon: Lock,           title: '학생 안전',           description: 'PII 필터·유해 키워드·Wee센터 자동 라우팅.' },
  { num: 8, label: '배포',   icon: Rocket,         title: '테스트 · 배포',       description: '봇과 직접 대화해보고 반에 배포.' },
] as const;
